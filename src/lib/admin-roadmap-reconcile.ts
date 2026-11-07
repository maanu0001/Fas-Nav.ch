import { prisma } from "@/lib/prisma";
import { roadmapKey, ROADMAP_GROUP } from "@/lib/admin-roadmap";

/**
 * Detect meaningful customer events from existing records.
 * No blanket import of legacy organizations, no duplicate active process.
 * The unique SiteSetting.key makes repeat runs safe.
 */
export async function reconcileRoadmapCases() {
  // Look back 180 days so interrupted cron runs do not silently lose onboarding events.
  const since = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  const [claims, invites, registrations] = await Promise.all([
    prisma.claimRequest.findMany({ where: { createdAt: { gte: since } }, select: { organizationId: true }, take: 5000, orderBy: { createdAt: "desc" } }),
    prisma.boardingInvitation.findMany({ where: { sentAt: { gte: since } }, select: { organizationId: true }, take: 5000, orderBy: { sentAt: "desc" } }),
    prisma.organization.findMany({ where: { createdAt: { gte: since }, importedAt: null, onboardingCompleted: false, memberships: { some: {} } }, select: { id: true }, take: 5000, orderBy: { createdAt: "desc" } }),
  ]);
  const detected = new Map<string, string>();
  for (const org of registrations) detected.set(org.id, "SELF");
  for (const invite of invites) detected.set(invite.organizationId, "BOARDING");
  for (const claim of claims) detected.set(claim.organizationId, "CLAIM");
  let created = 0;
  let existingCount = 0;
  for (const [organizationId, source] of detected) {
    const key = roadmapKey(organizationId);
    const existing = await prisma.siteSetting.findUnique({ where: { key }, select: { id: true } });
    if (existing) { existingCount++; continue; }
    const due = new Date(Date.now() + (source === "CLAIM" ? 2 : source === "BOARDING" ? 5 : 14) * 86400000).toISOString().slice(0,10);
    // Upsert preserves any case created concurrently by a staff member.
    await prisma.siteSetting.upsert({
      where: { key },
      create: { key, group: ROADMAP_GROUP, label: "Interner Kundenprozess", value: { source, status: source === "BOARDING" ? "WAITING" : "ACTIVE", checked: [], note: "", due, updatedAt: new Date().toISOString(), updatedBy: "system" } },
      update: {},
      select: { id: true },
    });
    created++;
  }
  return { detected: detected.size, created, existing: existingCount };
}
