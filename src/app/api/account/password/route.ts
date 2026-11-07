import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { hashPassword, verifyPasswordSafe } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/rbac";
import { changePasswordSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/** Passwortwechsel durch den angemeldeten Benutzer selbst. */
export async function POST(request: Request) {
  try {
    const user = await requireUser();

    const limit = checkRateLimit(`pwchange:${user.id}`, 5, 15 * 60_000);
    if (!limit.ok) {
      return jsonError("Zu viele Versuche. Bitte versuche es später erneut.", 429);
    }

    const body = await parseBody(request, changePasswordSchema);

    const record = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, email: true, passwordHash: true },
    });
    if (!record) return jsonError("Benutzer nicht gefunden.", 404);

    const valid = await verifyPasswordSafe(body.currentPassword, record.passwordHash);
    if (!valid) {
      return jsonError("Das aktuelle Passwort ist nicht korrekt.", 403, {
        currentPassword: "Das aktuelle Passwort ist nicht korrekt.",
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(body.password), sessionVersion: { increment: 1 } },
    });

    await logAudit({
      userId: user.id,
      userLabel: record.email,
      action: "user.password_change",
      entity: "User",
      entityId: user.id,
      entityLabel: record.email,
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
