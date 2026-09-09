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

/**
 * Zentrale Berechtigungsmatrix. Alle Prüfungen laufen serverseitig;
 * das Frontend blendet lediglich zusätzlich aus.
 */
export const PERMISSIONS = {
  /** Nur ADMIN darf Team- und Adminaccounts verwalten. */
  manageStaffAccounts: (role: Role) => isAdmin(role),
  manageOrgAccounts: (role: Role) => isStaff(role),
  manageOrganizations: (role: Role) => isStaff(role),
  manageAllEvents: (role: Role) => isStaff(role),
  manageSubscriptions: (role: Role) => isStaff(role),
  /**
   * Zahlungen sind eine kaufmännische Funktion und bleiben der
   * Administration vorbehalten. Deckt Seite, API und Kennzahlen gemeinsam ab.
   */
  managePayments: (role: Role) => isAdmin(role),
  managePlans: (role: Role) => isAdmin(role),
  /** Die Startseite gestaltet ausschliesslich die Administration. */
  manageHomepage: (role: Role) => isAdmin(role),
  manageSettings: (role: Role) => isAdmin(role),
  managePlacements: (role: Role) => isStaff(role),
  viewAllTickets: (role: Role) => isStaff(role),
  /**
   * Kontaktanfragen der Website und Übernahmeanfragen bearbeiten.
   *
   * Beides sind Zuschriften von aussen, die das Team operativ abarbeitet –
   * anders als Preise oder Einstellungen also nicht der Administration
   * vorbehalten. Deckt Listen, Detailansichten und Statusänderungen ab.
   */
  handleContactRequests: (role: Role) => isStaff(role),
  viewAuditLog: (role: Role) => isStaff(role),
  viewPlatformStats: (role: Role) => isStaff(role),
  verifyOrganizations: (role: Role) => isStaff(role),
  /** Umsatz- und Abonnementzahlen in Übersichten und Statistik. */
  viewFinancialFigures: (role: Role) => isAdmin(role),
  /** Datenqualitäts-Center: Vollständigkeit und mögliche Dubletten prüfen. */
  reviewDataQuality: (role: Role) => isAdmin(role),
  /**
   * Recherchedateien analysieren, importieren und rückgängig machen.
   * Ein Import verändert den öffentlichen Datenbestand in grossem Umfang und
   * bleibt deshalb der Administration vorbehalten.
   */
  importData: (role: Role) => isAdmin(role),
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export function can(role: Role | undefined | null, permission: PermissionKey): boolean {
  if (!role) return false;
  return PERMISSIONS[permission](role);
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403 | 404,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/** Liefert den angemeldeten Benutzer oder wirft 401. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthError("Nicht angemeldet.", 401);
  }
  if (!session.user.isActive) {
    throw new AuthError("Dieses Konto ist deaktiviert.", 403);
  }
  return session.user;
}

/** Verlangt eine der angegebenen Rollen. */
export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new AuthError("Keine Berechtigung für diese Aktion.", 403);
  }
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
  if (!can(user.role, permission)) {
    throw new AuthError("Keine Berechtigung für diese Aktion.", 403);
  }
  return user;
}

// ---------------------------------------------------------------------------
// Organisationszugriff
//
// Ein Benutzerkonto ist ausschliesslich ein Login. Der Zugriff auf eine
// konkrete Fasnacht oder Gugge ergibt sich einzig aus einer Membership.
// Die globalen Rollen FASNACHT und GUGGE gewähren für sich genommen
// keinerlei Zugriff auf irgendeine Organisation.
//
// ADMIN und TEAM besitzen plattformweiten Zugriff und benötigen
// dafür keine Membership.
// ---------------------------------------------------------------------------

/** Was innerhalb einer Organisation getan werden darf. */
export type OrgCapability =
  /** Daten der Organisation lesen. */
  | "view"
  /** Inhalte, Veranstaltungen und Medien bearbeiten. */
  | "edit"
  /** Veröffentlichen, Abo-relevante Einstellungen, Sponsoren, Downloads. */
  | "manage"
  /** Benutzer und deren Zugriffe auf diese Organisation verwalten. */
  | "manageMembers";

/**
 * Rechte je organisationsinterner Rolle.
 * Neue Rollen oder Fähigkeiten werden ausschliesslich hier ergänzt.
 */
const ORG_ROLE_CAPABILITIES: Record<MembershipRole, OrgCapability[]> = {
  OWNER: ["view", "edit", "manage", "manageMembers"],
  MANAGER: ["view", "edit", "manage"],
  EDITOR: ["view", "edit"],
};

/** Prüft eine Fähigkeit gegen eine organisationsinterne Rolle. */
export function membershipRoleAllows(
  role: MembershipRole,
  capability: OrgCapability,
): boolean {
  return ORG_ROLE_CAPABILITIES[role].includes(capability);
}

/** Alle Fähigkeiten, die eine Plattformrolle in jeder Organisation mitbringt. */
const STAFF_CAPABILITIES: OrgCapability[] = ["view", "edit", "manage", "manageMembers"];

/**
 * Welche Fähigkeiten ein Benutzer in einer bestimmten Organisation hat.
 *
 * Die eine Stelle, an der Plattformrolle und Membership zusammengeführt
 * werden. Admin und Team arbeiten in jeder Organisation mit vollem Umfang –
 * Galerie eingeschlossen – und brauchen dafür keine Membership. Alle anderen
 * Konten leiten ihre Rechte ausschliesslich aus ihrer Membership ab; ohne
 * Membership bleibt die Liste leer, unabhängig von der globalen Rolle.
 */
export function organizationCapabilities(input: {
  role: Role;
  membershipRole: MembershipRole | null;
}): OrgCapability[] {
  if (isStaff(input.role)) return [...STAFF_CAPABILITIES];
  if (!input.membershipRole) return [];
  return [...ORG_ROLE_CAPABILITIES[input.membershipRole]];
}

export type OrgAccess = {
  user: SessionUser;
  organizationId: string;
  /** true, wenn der Zugriff über eine Plattformrolle (ADMIN/TEAM) erfolgt. */
  viaStaff: boolean;
  /** Organisationsinterne Rolle; null bei Zugriff über eine Plattformrolle. */
  membershipRole: MembershipRole | null;
  /** Tatsächlich verfügbare Fähigkeiten in dieser Organisation. */
  capabilities: OrgCapability[];
  can: (capability: OrgCapability) => boolean;
};

/** Ergebnis einer Zugriffsprüfung ohne Ausnahme. */
export type OrgAccessResult =
  | { ok: true; access: OrgAccess }
  | { ok: false; status: 401 | 403 | 404; message: string };

/**
 * Ermittelt den Zugriff eines Benutzers auf eine Organisation, ohne eine
 * Ausnahme zu werfen. Grundlage aller weiteren Prüffunktionen.
 */
export async function resolveOrganizationAccess(
  organizationId: string,
  capability: OrgCapability = "view",
): Promise<OrgAccessResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { ok: false, status: 401, message: "Nicht angemeldet." };
  }
  if (!session.user.isActive) {
    // Ein deaktiviertes Konto verliert den Zugriff, ohne dass Organisation
    // oder öffentliche Seite davon berührt werden.
    return { ok: false, status: 403, message: "Dieses Konto ist deaktiviert." };
  }

  const user = session.user;

  if (isStaff(user.role)) {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });
    if (!organization) {
      return { ok: false, status: 404, message: "Organisation nicht gefunden." };
    }
    const capabilities = organizationCapabilities({
      role: user.role,
      membershipRole: null,
    });
    return {
      ok: true,
      access: {
        user,
        organizationId: organization.id,
        viaStaff: true,
        membershipRole: null,
        capabilities,
        can: (c) => capabilities.includes(c),
      },
    };
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_organizationId: { userId: user.id, organizationId } },
    select: { role: true },
  });

  // Ohne Membership besteht kein Zugriff – unabhängig von der globalen Rolle.
  if (!membership) {
    return {
      ok: false,
      status: 403,
      message: "Keine Berechtigung für diese Organisation.",
    };
  }

  const capabilities = organizationCapabilities({
    role: user.role,
    membershipRole: membership.role,
  });

  if (!capabilities.includes(capability)) {
    return {
      ok: false,
      status: 403,
      message: "Deine Berechtigung reicht für diese Aktion nicht aus.",
    };
  }

  return {
    ok: true,
    access: {
      user,
      organizationId,
      viaStaff: false,
      membershipRole: membership.role,
      capabilities,
      can: (c) => capabilities.includes(c),
    },
  };
}

/** Darf der Benutzer die Organisation überhaupt sehen? */
export async function canAccessOrganization(organizationId: string): Promise<boolean> {
  return (await resolveOrganizationAccess(organizationId, "view")).ok;
}

/** Darf der Benutzer Inhalte dieser Organisation bearbeiten? */
export async function canEditOrganization(organizationId: string): Promise<boolean> {
  return (await resolveOrganizationAccess(organizationId, "edit")).ok;
}

/** Darf der Benutzer veröffentlichen und organisatorische Einstellungen ändern? */
export async function canManageOrganization(organizationId: string): Promise<boolean> {
  return (await resolveOrganizationAccess(organizationId, "manage")).ok;
}

/** Darf der Benutzer Zugriffe anderer Benutzer auf diese Organisation verwalten? */
export async function canManageOrganizationMembers(
  organizationId: string,
): Promise<boolean> {
  return (await resolveOrganizationAccess(organizationId, "manageMembers")).ok;
}

/**
 * Erzwingt Zugriff auf eine Organisation und wirft andernfalls.
 * Einziger zulässiger Weg zu organisationsgebundenen Daten.
 */
export async function requireOrganizationAccess(
  organizationId: string,
  capability: OrgCapability = "view",
): Promise<OrgAccess> {
  const result = await resolveOrganizationAccess(organizationId, capability);
  if (!result.ok) {
    throw new AuthError(result.message, result.status);
  }
  return result.access;
}

/**
 * Bisherige Signatur, auf die neue Prüfung abgebildet.
 * `write: true` entspricht der Fähigkeit „edit“.
 */
export async function requireOrgAccess(
  organizationId: string,
  options: { write?: boolean } = {},
): Promise<OrgAccess> {
  return requireOrganizationAccess(organizationId, options.write ? "edit" : "view");
}

/** Alle Organisationen, auf die der Benutzer Zugriff hat. */
export async function getUserOrganizations(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          status: true,
          verification: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => ({ ...m.organization, membershipRole: m.role }));
}

/** Primäre Organisation eines Organisationsaccounts. */
export async function getPrimaryOrganizationId(userId: string): Promise<string | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: { organizationId: true },
  });
  return membership?.organizationId ?? null;
}

/** Passende Rolle für einen neuen Organisationsaccount. */
export function roleForOrganizationType(type: OrganizationType): Role {
  return type === "CARNIVAL" ? "FASNACHT" : "GUGGE";
}
