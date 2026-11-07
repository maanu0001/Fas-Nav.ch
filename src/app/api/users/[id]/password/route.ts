import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES, can, requirePermission } from "@/lib/rbac";
import { setUserPasswordSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Passwort eines Accounts durch Admin/Team zurücksetzen. */
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const actor = await requirePermission("manageOrgAccounts");
    const body = await parseBody(request, setUserPasswordSchema);

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });
    if (!target) return jsonError("Benutzer nicht gefunden.", 404);

    if (STAFF_ROLES.includes(target.role) && !can(actor.role, "manageStaffAccounts")) {
      return jsonError("Team-Passwörter dürfen nur Administratoren zurücksetzen.", 403);
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { passwordHash: await hashPassword(body.password), sessionVersion: { increment: 1 } },
      }),
      // Offene Reset-Links werden ungültig.
      prisma.passwordResetToken.deleteMany({ where: { userId: id, usedAt: null } }),
    ]);

    await logAudit({
      userId: actor.id,
      userLabel: actor.email,
      action: "user.password_reset",
      entity: "User",
      entityId: id,
      entityLabel: target.email,
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
