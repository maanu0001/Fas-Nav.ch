import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { sendMail } from "@/lib/mail";
import { mailConfigComplete } from "@/lib/mail-config";
import { getMailSettings } from "@/lib/mail-settings";
import { checkRateLimit } from "@/lib/rate-limit";
import { requirePermission } from "@/lib/rbac";
import { testMailSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("manageSettings");
    const limit = checkRateLimit(`testmail:${actor.id}`, 20, 15 * 60_000);
    if (!limit.ok) return jsonError("Zu viele Testmails. Bitte warte einen Moment.", 429);

    const body = await parseBody(request, testMailSchema);
    const settings = await getMailSettings();
    if (!mailConfigComplete(settings)) return jsonError("Mailversand ist noch nicht vollständig konfiguriert.", 400);

    const result = await sendMail(
      {
        to: body.to,
        subject: body.subject ?? "Testmail von Fas-Nav.ch",
        text: body.text ?? `Diese Testmail bestätigt, dass der Mailversand von Fas-Nav.ch funktioniert.\n\nAbsender: ${settings.fromName} <${settings.fromEmail}>\nServer: ${settings.host}:${settings.port}\n\nFreundliche Grüsse\nFas-Nav.ch`,
      },
      { ...settings, enabled: true },
    );

    await logAudit({
      userId: actor.id,
      userLabel: actor.email,
      action: "settings.mail.test",
      entity: "SiteSetting",
      entityLabel: body.subject ? "E-Mail-Vorlage" : "Mailversand",
      after: { to: body.to, sent: result.sent, customContent: Boolean(body.subject || body.text) },
    });

    if (!result.sent) return jsonError(result.message ?? "Mailversand fehlgeschlagen.", 502);
    return jsonOk({ sent: true });
  } catch (error) {
    return handleApiError(error);
  }
}
