import { prisma } from "@/lib/prisma";

export const ROADMAP_GROUP = "admin-roadmap";
export const ROADMAP_PREFIX = "admin-roadmap:";
export const roadmapKey = (id: string) => ROADMAP_PREFIX + id;
export const roadmapSources = [
  { key: "ACQUISITION", label: "Akquise", href: "/dashboard/mails", guide: "Akquise-Mail senden, Reaktion prüfen und bei Interesse Boarding starten." },
  { key: "CLAIM", label: "Profil beanspruchen", href: "/dashboard/boarding", guide: "Antrag und Identität prüfen, Zugriff erst nach Freigabe erteilen." },
  { key: "SELF", label: "Selbstregistrierung", href: "/dashboard/accounts", guide: "Dubletten prüfen, Konto zuordnen und Profil vervollständigen." },
  { key: "CONTACT", label: "Direkte Anfrage", href: "/dashboard/kontaktanfragen", guide: "Anliegen einordnen, Kontaktperson bestimmen und nächsten Schritt vereinbaren." },
  { key: "BOARDING", label: "Boarding-Mail", href: "/dashboard/boarding", guide: "Einladung versenden, Annahme überwachen und Organisationszugriff prüfen." },
] as const;
export const roadmapManual = [
  { key: "contact", label: "Interesse und Kontaktperson bestätigt", href: "/dashboard/mails" },
  { key: "identity", label: "Identität und Berechtigung geprüft", href: "/dashboard/boarding" },
  { key: "quality", label: "Profil und Inhalte geprüft", href: "/dashboard/organisationen" },
  { key: "handoff", label: "Betreuung und nächste Schritte vereinbart", href: "/dashboard/tickets" },
] as const;
export type RoadmapStatus = "ACTIVE" | "WAITING" | "PAUSED" | "DONE" | "CANCELLED";
export type RoadmapState = { source: string; status: RoadmapStatus; checked: string[]; note: string; due: string; updatedAt?: string; updatedBy?: string };
export function parseRoadmap(value: unknown): RoadmapState {
  const v = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const status = typeof v.status === "string" && ["ACTIVE","WAITING","PAUSED","DONE","CANCELLED"].includes(v.status) ? v.status as RoadmapStatus : "ACTIVE";
  return { source: typeof v.source === "string" ? v.source : "CONTACT", status, checked: Array.isArray(v.checked) ? v.checked.filter((x): x is string => typeof x === "string") : [], note: typeof v.note === "string" ? v.note : "", due: typeof v.due === "string" ? v.due : "", updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : undefined, updatedBy: typeof v.updatedBy === "string" ? v.updatedBy : undefined };
}
export async function roadmapSignals(organizationId: string) {
  const [org, invitations, crm] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { id: true, name: true, status: true, claimStatus: true, contactEmail: true, description: true, logoId: true, onboardingCompleted: true, memberships: { select: { id: true }, take: 1 }, claimRequests: { select: { status: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 }, subscription: { select: { status: true, plan: { select: { name: true } } } }, _count: { select: { events: true } } } }),
    prisma.boardingInvitation.findMany({ where: { organizationId }, orderBy: { sentAt: "desc" }, take: 1, select: { status: true, sentAt: true, acceptedAt: true, expiresAt: true, openCount: true } }),
    prisma.siteSetting.findUnique({ where: { key: "crm.organization." + organizationId }, select: { value: true } }),
  ]);
  const crmValue = crm?.value && typeof crm.value === "object" && !Array.isArray(crm.value) ? crm.value as Record<string, unknown> : {};
  const invite = invitations[0];
  const signals = [
    { key: "contact", label: "Kontakt-E-Mail hinterlegt", done: Boolean(org.contactEmail) },
    { key: "outreach", label: "Akquise-Kontakt erfasst", done: ["CONTACTED","REPLIED","CLAIMED","CUSTOMER"].includes(String(crmValue.status ?? "")) },
    { key: "claim", label: "Profilbeanspruchung genehmigt", done: org.claimStatus === "CLAIMED" || org.claimRequests[0]?.status === "APPROVED" },
    { key: "boarding", label: "Boarding-Einladung verschickt", done: Boolean(invite) },
    { key: "accepted", label: "Boarding-Einladung angenommen", done: Boolean(invite?.acceptedAt) },
    { key: "account", label: "Account zugeordnet", done: org.memberships.length > 0 },
    { key: "profile", label: "Beschreibung und Logo vorhanden", done: Boolean(org.description && org.logoId) },
    { key: "onboarding", label: "Onboarding abgeschlossen", done: org.onboardingCompleted },
    { key: "tariff", label: "Tarif hinterlegt", done: Boolean(org.subscription) },
    { key: "publication", label: "Profil veröffentlicht", done: org.status === "PUBLISHED" },
  ];
  return { org, signals, crmStatus: String(crmValue.status ?? ""), invitation: invite ?? null, pendingClaim: org.claimRequests[0]?.status === "PENDING" };
}
export function roadmapDue(state: RoadmapState, now = new Date()) {
  return Boolean(state.due && /^\d{4}-\d{2}-\d{2}$/.test(state.due) && state.due <= new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit" }).format(now) && !["DONE","CANCELLED","PAUSED"].includes(state.status));
}
