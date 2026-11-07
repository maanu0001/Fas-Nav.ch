import { createHash } from "node:crypto";

import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { resetPasswordSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/** Setzt das Passwort anhand eines gültigen, einmalig verwendbaren Tokens. */
export async function POST(request: Request) {
  try {
    const limit = checkRateLimit(clientKey(request, "reset"), 10, 15 * 60_000);
    if (!limit.ok) {
      return jsonError("Zu viele Versuche. Bitte versuche es später erneut.", 429);
    }

    const body = await parseBody(request, resetPasswordSchema);
    const tokenHash = createHash("sha256").update(body.token).digest("hex");

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true, isActive: true } } },
    });

    if (!record || record.usedAt || record.expiresAt < new Date() || !record.user.isActive) {
      return jsonError(
        "Dieser Link ist ungültig oder abgelaufen. Bitte fordere einen neuen an.",
        400,
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: await hashPassword(body.password), sessionVersion: { increment: 1 } },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Alle weiteren offenen Tokens dieses Benutzers verfallen.
      prisma.passwordResetToken.deleteMany({
        where: { userId: record.userId, usedAt: null, id: { not: record.id } },
      }),
    ]);

    await logAudit({
      userId: record.userId,
      userLabel: record.user.email,
      action: "user.password_reset_self",
      entity: "User",
      entityId: record.userId,
      entityLabel: record.user.email,
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
