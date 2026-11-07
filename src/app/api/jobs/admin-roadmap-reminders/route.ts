import { auth } from "@/lib/auth";
import { jsonError, jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { roadmapDue, parseRoadmap, ROADMAP_GROUP, ROADMAP_PREFIX } from "@/lib/admin-roadmap";

export const dynamic = "force-dynamic";

/** Dashboard-only reminders. Idempotent per organization, due date and staff member. */
export async function POST(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    const authorizedJob = Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
    if (!authorizedJob) {
      const session = await auth();
      if (!session?.user?.isActive) return jsonError("Nicht angemeldet.", 401);
      if (session.user.role !== "ADMIN") return jsonError("Keine Berechtigung.", 403);
    }
    const [settings, staff] = await Promise.all([
      prisma.siteSetting.findMany({ where: { group: ROADMAP_GROUP, key: { startsWith: ROADMAP_PREFIX } }, select: { key: true, value: true } }),
      prisma.user.findMany({ where: { role: { in: ["ADMIN","TEAM"] }, isActive: true }, select: { id: true } }),
    ]);
    let created = 0;
    let checked = 0;
    for (const setting of settings) {
      const state = parseRoadmap(setting.value);
      if (!roadmapDue(state)) continue;
      const orgId = setting.key.slice(ROADMAP_PREFIX.length);
      const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true, name: true } });
      if (!org) continue;
      checked++;
      const link = `/dashboard/admin-roadmap?org=${encodeURIComponent(orgId)}`;
      const marker = `[Roadmap:${orgId}:${state.due}]`;
      for (const member of staff) {
        const exists = await prisma.notification.findFirst({ where: { userId: member.id, type: "SYSTEM", body: { startsWith: marker } }, select: { id: true } });
        if (exists) continue;
        await prisma.notification.create({ data: { userId: member.id, organizationId: org.id, type: "SYSTEM", title: "Roadmap-Wiedervorlage: " + org.name, body: marker + " Interne Aufgabe fällig seit " + state.due, link } });
        created++;
      }
    }
    return jsonOk({ checked, created });
  } catch (error) { return handleApiError(error); }
}
