import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { notifyOrganization } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { isStaff, requireOrganizationAccess } from "@/lib/rbac";
import { publishSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Zustände, die eine Organisation selbst setzen darf. */
const SELF_ALLOWED = new Set(["DRAFT", "PENDING_REVIEW", "PUBLISHED", "UNPUBLISHED"]);

/**
 * Veröffentlichungsstatus ändern.
 * SUSPENDED bleibt Admin und Team vorbehalten – eine gesperrte Organisation
 * kann sich damit nicht selbst wieder freischalten.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    // Veröffentlichen ist eine organisatorische Handlung: nur OWNER und
    // MANAGER (sowie Admin/Team) dürfen den Status ändern.
    const access = await requireOrganizationAccess(id, "manage");
    const { status } = await parseBody(request, publishSchema);

    const before = await prisma.organization.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, type: true, status: true },
    });
    if (!before) return jsonError("Organisation nicht gefunden.", 404);

    const staff = isStaff(access.user.role);

    if (status === "PUBLISHED" && before.status !== "PUBLISHED") {
      const complete = await prisma.organization.findUnique({
        where: { id }, select: { shortDescription: true, description: true, city: true, cantonId: true },
      });
      if (!complete?.city || !complete.cantonId || (!complete.shortDescription && !complete.description)) {
        return jsonError("Vor der Veröffentlichung müssen Ort, Kanton und Beschreibung ausgefüllt sein.", 422);
      }
    }

    if (!staff) {
      if (!SELF_ALLOWED.has(status)) {
        return jsonError("Diesen Status darf nur das Fas-Nav-Team setzen.", 403);
      }
      if (before.status === "SUSPENDED") {
        return jsonError(
          "Diese Seite wurde gesperrt. Bitte kontaktiere das Fas-Nav-Team.",
          403,
        );
      }


    }

    const organization = await prisma.organization.update({
      where: { id },
      data: {
        status,
        ...(status === "PUBLISHED" && before.status !== "PUBLISHED"
          ? { publishedAt: new Date() }
          : {}),
      },
      select: { id: true, name: true, slug: true, type: true, status: true, publishedAt: true },
    });

    await logAudit({
      userId: access.user.id,
      userLabel: access.user.email,
      action: `organization.${status.toLowerCase()}`,
      entity: "Organization",
      entityId: id,
      entityLabel: organization.name,
      before: { status: before.status },
      after: { status: organization.status },
    });

    if (status === "PUBLISHED") {
      await notifyOrganization(id, {
        type: "ORGANIZATION_PUBLISHED",
        title: "Deine Seite ist online",
        body: `${organization.name} ist ab sofort öffentlich sichtbar.`,
        link: organization.type === "CARNIVAL" ? `/fasnacht/${organization.slug}` : `/gugge/${organization.slug}`,
      });
    }

    return jsonOk(organization);
  } catch (error) {
    return handleApiError(error);
  }
}
