import { handleApiError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { getMailSettingsForAdmin, saveMailSettings } from "@/lib/mail-settings";
import { requirePermission } from "@/lib/rbac";
import { mailSettingsSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/**
 * Mailkonfiguration der Plattform.
 *
 * Ausschliesslich für die Administration: `manageSettings` haben nur
 * Adminkonten, und die Prüfung steht hier im Endpunkt – nicht bloss in der
 * Navigation. Ein direkter Aufruf durch Team-, Fasnacht- oder Guggenkonten
 * endet deshalb mit 403, unabhängig davon, was die Oberfläche anzeigt.
 */
export async function GET() {
  try {
    await requirePermission("manageSettings");
    // Ohne Passwort: Was einmal gespeichert ist, verlässt den Server nicht
    // wieder. Die Oberfläche erfährt nur, ob überhaupt eines hinterlegt ist.
    return jsonOk(await getMailSettingsForAdmin());
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const actor = await requirePermission("manageSettings");
    const body = await parseBody(request, mailSettingsSchema);

    const vorher = await getMailSettingsForAdmin();
    await saveMailSettings(body);

    // Im Protokoll steht, *was* sich geändert hat, nie ein Zugangsdatum
    // selbst. „Passwort geändert" ist die Information, die zählt; der Wert
    // gehört weder ins Protokoll noch in eine Fehlermeldung.
    const geaendert: string[] = [];
    if (vorher.enabled !== body.enabled) {
      geaendert.push(body.enabled ? "Mailversand aktiviert" : "Mailversand deaktiviert");
    }
    if (vorher.host !== body.host) geaendert.push("SMTP-Host geändert");
    if (vorher.port !== body.port) geaendert.push("SMTP-Port geändert");
    if (vorher.security !== body.security) geaendert.push("Verschlüsselung geändert");
    if (vorher.user !== body.user) geaendert.push("SMTP-Benutzer geändert");
    if (body.clearPassword) geaendert.push("SMTP-Passwort entfernt");
    else if (body.password) geaendert.push("SMTP-Passwort geändert");
    if (vorher.fromEmail !== body.fromEmail) geaendert.push("Absenderadresse geändert");
    if (vorher.fromName !== body.fromName) geaendert.push("Absendername geändert");
    if (vorher.replyTo !== body.replyTo) geaendert.push("Antwortadresse geändert");
    if (vorher.ticketRecipient !== body.ticketRecipient) {
      geaendert.push("Empfänger für Ticketmeldungen geändert");
    }
    if (vorher.ticketSubject !== body.ticketSubject) geaendert.push("Betreff der Ticketmail geändert");
    if (vorher.ticketBody !== body.ticketBody) geaendert.push("Text der Ticketmail geändert");

    await logAudit({
      userId: actor.id,
      userLabel: actor.email,
      action: "settings.mail.update",
      entity: "SiteSetting",
      entityLabel: "Mailversand",
      after: { changes: geaendert },
    });

    return jsonOk(await getMailSettingsForAdmin());
  } catch (error) {
    return handleApiError(error);
  }
}
