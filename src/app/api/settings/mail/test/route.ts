import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { sendMail } from "@/lib/mail";
import { mailConfigComplete } from "@/lib/mail-config";
import { getMailSettings } from "@/lib/mail-settings";
import { checkRateLimit } from "@/lib/rate-limit";
import { requirePermission } from "@/lib/rbac";
import { testMailSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/**
 * Testmail an eine frei wählbare Adresse.
 *
 * Nur für die Administration, und mit einer Begrenzung versehen: Ein
 * Endpunkt, der auf Zuruf Mails an beliebige Adressen schickt, wäre sonst ein
 * bequemes Werkzeug für fremde Zwecke.
 *
 * Die Antwort enthält bei einem Fehler die aufbereitete Meldung aus
 * `mailErrorMessage` – also den Grund, nie die Serverantwort im Wortlaut und
 * unter keinen Umständen ein Zugangsdatum.
 */
export async function POST(request: Request) {
  try {
    const actor = await requirePermission("manageSettings");

    const limit = checkRateLimit(`testmail:${actor.id}`, 10, 15 * 60_000);
    if (!limit.ok) {
      return jsonError("Zu viele Testmails. Bitte warte einen Moment.", 429);
    }

    const body = await parseBody(request, testMailSchema);
    const settings = await getMailSettings();

    if (!mailConfigComplete(settings)) {
      return jsonError("Mailversand ist noch nicht vollständig konfiguriert.", 400);
    }

    // Die Testmail geht bewusst auch dann hinaus, wenn der Versand noch
    // deaktiviert ist: Sonst liesse sich eine Konfiguration nicht prüfen,
    // bevor man sie scharf schaltet.
    const result = await sendMail(
      {
        to: body.to,
        subject: "Testmail von Fas-Nav.ch",
        text: `Diese Testmail bestätigt, dass der Mailversand von Fas-Nav.ch funktioniert.

Absender: ${settings.fromName} <${settings.fromEmail}>
Server: ${settings.host}:${settings.port}

Freundliche Grüsse
Fas-Nav.ch`,
      },
      { ...settings, enabled: true },
    );

    await logAudit({
      userId: actor.id,
      userLabel: actor.email,
      action: "settings.mail.test",
      entity: "SiteSetting",
      entityLabel: "Mailversand",
      after: { to: body.to, sent: result.sent },
    });

    if (!result.sent) {
      return jsonError(result.message ?? "Mailversand fehlgeschlagen.", 502);
    }

    return jsonOk({ sent: true });
  } catch (error) {
    return handleApiError(error);
  }
}
