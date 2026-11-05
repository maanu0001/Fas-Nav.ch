import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { deleteMedia } from "@/lib/media";
import { prisma } from "@/lib/prisma";
import { isStaff, requireOrgAccess, requireUser } from "@/lib/rbac";
import { mediaUpdateSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Stellt sicher, dass der Benutzer auf dieses Medium zugreifen darf. */
async function assertMediaAccess(mediaId: string) {
  const user = await requireUser();
  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    select: { id: true, organizationId: true, filename: true, type: true },
  });

  if (!media) return { media: null, user };

  if (media.organizationId) {
    await requireOrgAccess(media.organizationId, { write: true });
  } else if (!isStaff(user.role)) {
    // Plattformweite Medien gehören ausschliesslich Admin und Team.
    return { media: null, user };
  }

  return { media, user };
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { media, user } = await assertMediaAccess(id);
    if (!media) return jsonError("Medium nicht gefunden.", 404);

    const body = await parseBody(request, mediaUpdateSchema);

    const updated = await prisma.media.update({
      where: { id },
      data: {
        ...(body.alt !== undefined ? { alt: body.alt } : {}),
        ...(body.caption !== undefined ? { caption: body.caption } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
      },
      select: { id: true, alt: true, caption: true, sortOrder: true, type: true },
    });

    await logAudit({
      userId: user.id,
      userLabel: user.email,
      action: "media.update",
      entity: "Media",
      entityId: id,
      entityLabel: media.filename,
      after: updated,
    });

    return jsonOk(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const { media, user } = await assertMediaAccess(id);
    if (!media) return jsonError("Medium nicht gefunden.", 404);

    const uses = await prisma.media.findUnique({where:{id},select:{logoOf:{select:{id:true}},headerOf:{select:{id:true}},ogImageOf:{select:{id:true}},eventImages:{select:{id:true},take:1},sponsorLogos:{select:{id:true},take:1},downloads:{select:{id:true},take:1},homepageSections:{select:{id:true},take:1}}});
    if (uses && (uses.logoOf || uses.headerOf || uses.ogImageOf || uses.eventImages.length || uses.sponsorLogos.length || uses.downloads.length || uses.homepageSections.length)) {
      return jsonError("Dieses Medium ist noch auf einer Seite oder in einem Eintrag eingebunden. Bitte zuerst dort entfernen.", 409);
    }
    await deleteMedia(id);

    await logAudit({
      userId: user.id,
      userLabel: user.email,
      action: "media.delete",
      entity: "Media",
      entityId: id,
      entityLabel: media.filename,
      before: { type: media.type, organizationId: media.organizationId },
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
