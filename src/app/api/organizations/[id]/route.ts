import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { changedFieldNames, markManualEdits } from "@/lib/import/field-origin";
import { prisma } from "@/lib/prisma";
import { isStaff, requireOrgAccess, requirePermission } from "@/lib/rbac";
import { uniqueOrganizationSlug } from "@/lib/slug-service";
import { organizationAdminSchema, organizationUpdateSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Aktualisiert eine Organisation.
 *
 * Inhaltliche Felder darf jedes berechtigte Mitglied bearbeiten.
 * Statusfelder (Slug, Verifizierung, Hervorhebung, Typ) sind Admin und Team
 * vorbehalten – ein Organisationsaccount kann sich damit weder selbst
 * verifizieren noch hervorheben.
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const access = await requireOrgAccess(id, { write: true });

    const raw = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const content = organizationUpdateSchema.parse(raw);
    const admin = isStaff(access.user.role)
      ? organizationAdminSchema.parse(raw)
      : {};

    // Vollständiger Datensatz, um erkennen zu können, welche Felder sich
    // tatsächlich ändern (Grundlage für den Schutz vor Rechercheimporten).
    const before = await prisma.organization.findUnique({ where: { id } });
    if (!before) return jsonError("Organisation nicht gefunden.", 404);

    // Referenzierte Medien müssen zur selben Organisation gehören.
    for (const key of ["logoId", "headerId", "ogImageId"] as const) {
      const mediaId = content[key];
      if (mediaId) {
        const media = await prisma.media.findUnique({
          where: { id: mediaId },
          select: { organizationId: true },
        });
        if (!media || (media.organizationId && media.organizationId !== id)) {
          return jsonError("Das ausgewählte Bild gehört nicht zu dieser Organisation.", 403);
        }
      }
    }

    const nextSlug =
      admin.slug && admin.slug !== before.slug
        ? await uniqueOrganizationSlug(before.name, { preferred: admin.slug, excludeId: id })
        : undefined;

    const becomesPublished =
      admin.status === "PUBLISHED" && before.status !== "PUBLISHED";
    if (becomesPublished) {
      const city=content.city ?? before.city;
      const cantonId=content.cantonId ?? before.cantonId;
      const description=content.shortDescription ?? before.shortDescription;
      const fullDescription=content.description ?? before.description;
      if (!city || !cantonId || (!description && !fullDescription))
        return jsonError("Vor der Veröffentlichung bitte Ort, Kanton und Beschreibung ergänzen.",422);
    }

    const organization = await prisma.organization.update({
      where: { id },
      data: {
        ...content,
        ...admin,
        ...(nextSlug ? { slug: nextSlug } : {}),
        ...(becomesPublished ? { publishedAt: new Date() } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        status: true,
        verification: true,
        isFeatured: true,
        claimStatus: true,
        updatedAt: true,
      },
    });

    // Manuell bearbeitete Felder vor späteren Rechercheimporten schützen.
    const manuallyChanged = changedFieldNames(
      before as unknown as Record<string, unknown>,
      content as Record<string, unknown>,
    );
    await markManualEdits(
      id,
      manuallyChanged,
      isStaff(access.user.role) ? "ADMIN_EDITED" : "ORGANIZATION_EDITED",
      access.user.id,
    );

    await logAudit({
      userId: access.user.id,
      userLabel: access.user.email,
      action: "organization.update",
      entity: "Organization",
      entityId: id,
      entityLabel: organization.name,
      before: {
        name: before.name,
        slug: before.slug,
        status: before.status,
        verification: before.verification,
        isFeatured: before.isFeatured,
        claimStatus: before.claimStatus,
      },
      after: organization,
    });

    return jsonOk(organization);
  } catch (error) {
    return handleApiError(error);
  }
}

/** Organisation löschen – ausschliesslich Admin und Team. */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requirePermission("manageOrganizations");

    const organization = await prisma.organization.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, type: true },
    });
    if (!organization) return jsonError("Organisation nicht gefunden.", 404);

    await prisma.organization.delete({ where: { id } });

    await logAudit({
      userId: user.id,
      userLabel: user.email,
      action: "organization.delete",
      entity: "Organization",
      entityId: id,
      entityLabel: organization.name,
      before: organization,
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
