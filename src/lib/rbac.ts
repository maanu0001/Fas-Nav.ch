import type { MembershipRole, OrganizationType, Role } from "@prisma/client";
import type { Session } from "next-auth";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type SessionUser = Session["user"];

/** Rollen mit plattformweiten Rechten. */
export const STAFF_ROLES: Role[] = ["ADMIN", "TEAM"];
/** Rollen, die einer Organisation zugeordnet sind. */
export const ORG_ROLES: Role[] = ["FASNACHT", "GUGGE"];

export function isStaff(role: Role | undefined | null): boolean {
  return !!role && STAFF_ROLES.includes(role);
}

export function isAdmin(role: Role | undefined | null): boolean {
  return role === "ADMIN";
}

export function isOrgRole(role: Role | undefined | null): boolean {
  return !!role && ORG_ROLES.includes(role);
}

/** Zentrale Berechtigungsmatrix. Alle Prüfungen laufen serverseitig. */
export const PERMISSIONS = {
  manageStaffAccounts: (role: Role) => isAdmin(role),
  manageOrgAccounts: (role: Role) => isStaff(role),
  manageOrganizations: (role: Role) => isStaff(role),
  manageAllEvents: (role: Role) => isStaff(role),
  manageSubscriptions: (role: Role) => isStaff(role),
  managePayments: (role: Role) => isAdmin(role),
  managePlans: (role: Role) => isAdmin(role),
  manageHomepage: (role: Role) => isAdmin(role),
  manageSettings: (role: Role) => isAdmin(role),
  managePlacements: (role: Role) => isStaff(role),
  viewAllTickets: (role: Role) => isStaff(role),
  /** Endgültiges Löschen von Support-Tickets ist ausschliesslich ADMIN erlaubt. */
  deleteTickets: (role: Role) => isAdmin(role),
  handleContactRequests: (role: Role) => isStaff(role),
  viewAuditLog: (role: Role) => isStaff(role),
  viewPlatformStats: (role: Role) => isStaff(role),
  verifyOrganizations: (role: Role) => isStaff(role),
  viewFinancialFigures: (role: Role) => isAdmin(role),
  reviewDataQuality: (role: Role) => isAdmin(role),
  importData: (role: Role) => isAdmin(role),
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export function can(role: Role | undefined | null, permission: PermissionKey): boolean {
  if (!role) return false;
  return PERMISSIONS[permission](role);
}

export class AuthError extends Error {
  constructor(message: string, readonly status: 401 | 403 | 404) {
    super(message);
    this.name = "AuthError";
  }
}

export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) throw new AuthError("Nicht angemeldet.", 401);
  if (!session.user.isActive) throw new AuthError("Dieses Konto ist deaktiviert.", 403);
  return session.user;
}

export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new AuthError("Keine Berechtigung für diese Aktion.", 403);
  return user;
}

export async function requireStaff(): Promise<SessionUser> {
  return requireRole(STAFF_ROLES);
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireRole(["ADMIN"]);
}

export async function requirePermission(permission: PermissionKey): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) throw new AuthError("Keine Berechtigung für diese Aktion.", 403);
  return user;
}

export type OrgCapability = "view" | "edit" | "manage" | "manageMembers";

const ORG_ROLE_CAPABILITIES: Record<MembershipRole, OrgCapability[]> = {
  OWNER: ["view", "edit", "manage", "manageMembers"],
  MANAGER: ["view", "edit", "manage"],
  EDITOR: ["view", "edit"],
};

export function membershipRoleAllows(role: MembershipRole, capability: OrgCapability): boolean {
  return ORG_ROLE_CAPABILITIES[role].includes(capability);
}

const STAFF_CAPABILITIES: OrgCapability[] = ["view", "edit", "manage", "manageMembers"];

export function organizationCapabilities(input: { role: Role; membershipRole: MembershipRole | null }): OrgCapability[] {
  if (isStaff(input.role)) return [...STAFF_CAPABILITIES];
  if (!input.membershipRole) return [];
  return [...ORG_ROLE_CAPABILITIES[input.membershipRole]];
}

export type OrgAccess = {
  user: SessionUser;
  organizationId: string;
  viaStaff: boolean;
  membershipRole: MembershipRole | null;
  capabilities: OrgCapability[];
  can: (capability: OrgCapability) => boolean;
};

export type OrgAccessResult =
  | { ok: true; access: OrgAccess }
  | { ok: false; status: 401 | 403 | 404; message: string };

export async function resolveOrganizationAccess(organizationId: string, capability: OrgCapability = "view"): Promise<OrgAccessResult> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, status: 401, message: "Nicht angemeldet." };
  if (!session.user.isActive) return { ok: false, status: 403, message: "Dieses Konto ist deaktiviert." };
  const user = session.user;
  if (isStaff(user.role)) {
    const organization = await prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } });
    if (!organization) return { ok: false, status: 404, message: "Organisation nicht gefunden." };
    const capabilities = organizationCapabilities({ role: user.role, membershipRole: null });
    return { ok: true, access: { user, organizationId: organization.id, viaStaff: true, membershipRole: null, capabilities, can: (c) => capabilities.includes(c) } };
  }
  const membership = await prisma.membership.findUnique({ where: { userId_organizationId: { userId: user.id, organizationId } }, select: { role: true } });
  if (!membership) return { ok: false, status: 403, message: "Keine Berechtigung für diese Organisation." };
  const capabilities = organizationCapabilities({ role: user.role, membershipRole: membership.role });
  if (!capabilities.includes(capability)) return { ok: false, status: 403, message: "Deine Berechtigung reicht für diese Aktion nicht aus." };
  return { ok: true, access: { user, organizationId, viaStaff: false, membershipRole: membership.role, capabilities, can: (c) => capabilities.includes(c) } };
}

export async function canAccessOrganization(organizationId: string): Promise<boolean> { return (await resolveOrganizationAccess(organizationId, "view")).ok; }
export async function canEditOrganization(organizationId: string): Promise<boolean> { return (await resolveOrganizationAccess(organizationId, "edit")).ok; }
export async function canManageOrganization(organizationId: string): Promise<boolean> { return (await resolveOrganizationAccess(organizationId, "manage")).ok; }
export async function canManageOrganizationMembers(organizationId: string): Promise<boolean> { return (await resolveOrganizationAccess(organizationId, "manageMembers")).ok; }
export async function requireOrganizationAccess(organizationId: string, capability: OrgCapability = "view"): Promise<OrgAccess> {
  const result = await resolveOrganizationAccess(organizationId, capability);
  if (!result.ok) throw new AuthError(result.message, result.status);
  return result.access;
}
export async function requireOrgAccess(organizationId: string, options: { write?: boolean } = {}): Promise<OrgAccess> { return requireOrganizationAccess(organizationId, options.write ? "edit" : "view"); }

export async function getUserOrganizations(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { organization: { select: { id: true, name: true, slug: true, type: true, status: true, verification: true } } },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => ({ ...m.organization, membershipRole: m.role }));
}

export async function getPrimaryOrganizationId(userId: string): Promise<string | null> {
  const membership = await prisma.membership.findFirst({ where: { userId }, orderBy: [{ role: "asc" }, { createdAt: "asc" }], select: { organizationId: true } });
  return membership?.organizationId ?? null;
}

export function roleForOrganizationType(type: OrganizationType): Role { return type === "CARNIVAL" ? "FASNACHT" : "GUGGE"; }
