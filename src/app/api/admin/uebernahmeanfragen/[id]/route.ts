import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { validBackupOrigin } from "@/lib/backup-origin";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, { params }: Params) {
  try {
    const actor = await requireAdmin();
    if (!validBackupOrigin(request)) return jsonError("Ungültiger Ursprung.", 403);
    const { id } = await params;
    const claim = await prisma.claimRequest.findUnique({ where: { id }, select: { id: true, organizationId: true, status: true } });
    if (!claim) return jsonError("Profilanfrage nicht gefunden.", 404);
    await prisma.claimRequest.delete({ where: { id } });
    await logAudit({ userId: actor.id, userLabel: actor.email, action: "claim.deleted", entity: "ClaimRequest", entityId: id, before: claim });
    return jsonOk({ ok: true });
  } catch (error) { return handleApiError(error); }
}
