import { absoluteUrl, truncate } from "@/lib/utils";

/**
 * E-Mail zu einer neuen Ticketantwort.
 *
 * Betreff und Text stammen aus den Plattform-Einstellungen und sind für die
 * Administration bearbeitbar. Hier stehen nur die Regeln dazu: welche
 * Platzhalter es gibt, wie ersetzt wird und wie daraus eine Nachricht wird.
 */

export type TicketMailPlaceholders = {
  recipientName: string;
  ticketNumber: string;
  ticketTitle: string;
  senderName: string;
  ticketUrl: string;
  organizationName: string;
  messagePreview: string;
  siteName: string;
  siteUrl: string;
};

/**
 * Die vollständige Liste erlaubter Platzhalter.
 *
 * Bewusst abschliessend: Ersetzt wird nur, was hier steht. Der Text aus den
 * Einstellungen kann dadurch nichts auswerten und an keine Daten kommen, die
 * nicht ausdrücklich vorgesehen sind.
 */
const PLACEHOLDER_KEYS: (keyof TicketMailPlaceholders)[] = [
  "recipientName",
  "ticketNumber",
  "ticketTitle",
  "senderName",
  "ticketUrl",
  "organizationName",
  "messagePreview",
  "siteName",
  "siteUrl",
];

/** Für die Hilfe unter den Eingabefeldern im Adminbereich. */
export const TICKET_MAIL_PLACEHOLDERS = PLACEHOLDER_KEYS.map((k) => `{{${k}}}`);

/** Länge des Nachrichtenausschnitts in der E-Mail. */
export const MESSAGE_PREVIEW_MAX = 300;

/**
 * Kurzer, sicherer Ausschnitt einer Nachricht.
 *
 * Reiner Text: Zeilenumbrüche werden zu Leerzeichen, spitze Klammern
 * entfernt. Die E-Mail soll die Antwort ankündigen, nicht ersetzen – der
 * vollständige Text steht im Ticket.
 */
export function messagePreview(body: string): string {
  const einzeilig = body.replace(/\s+/g, " ").replace(/[<>]/g, "").trim();
  return truncate(einzeilig, MESSAGE_PREVIEW_MAX);
}

/**
 * Ersetzt Platzhalter im Text.
 *
 * Es wird nichts ausgewertet, nur ersetzt. Unbekannte Platzhalter bleiben
 * stehen, damit ein Tippfehler in der Vorlage sichtbar wird, statt still eine
 * Lücke zu hinterlassen.
 */
export function fillTicketPlaceholders(
  text: string,
  werte: TicketMailPlaceholders,
): string {
  return text.replace(/\{\{\s*([a-zA-Z]+)\s*\}\}/g, (treffer, name: string) => {
    const schluessel = name as keyof TicketMailPlaceholders;
    return PLACEHOLDER_KEYS.includes(schluessel) ? werte[schluessel] : treffer;
  });
}

/** Beispielwerte für die Vorschau im Adminbereich – keine echten Ticketdaten. */
export const PREVIEW_TICKET_PLACEHOLDERS: TicketMailPlaceholders = {
  recipientName: "Anna Beispiel",
  ticketNumber: "42",
  ticketTitle: "Titelbild wird unscharf dargestellt",
  senderName: "Tim Team",
  ticketUrl: absoluteUrl("/dashboard/tickets/beispiel"),
  organizationName: "Oltner Fasnacht",
  messagePreview: "Wir haben das Bild neu berechnet – schau es dir bitte noch einmal an.",
  siteName: "Fas-Nav.ch",
  siteUrl: absoluteUrl("/"),
};

/** Maskiert Zeichen, die in HTML eine Bedeutung haben. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * HTML-Fassung der Nachricht.
 *
 * Absichtlich schlicht und mit Inline-Styles: Mailprogramme unterstützen
 * weder externe Stylesheets noch moderne Layouts zuverlässig. Der Aufbau
 * folgt dem Text – gleiche Reihenfolge, gleiche Inhalte –, ergänzt um eine
 * Schaltfläche zum Ticket. Die Textfassung bleibt immer die verbindliche.
 */
export function ticketMailHtml(input: { body: string; ticketUrl: string }): string {
  const absaetze = input.body
    .split(/\n{2,}/)
    .map((absatz) => escapeHtml(absatz).replace(/\n/g, "<br />"))
    .filter(Boolean)
    .map(
      (absatz) =>
        `<p style="margin:0 0 16px;line-height:1.6;color:#1f2937;font-size:15px;">${absatz}</p>`,
    )
    .join("");

  return `<!doctype html>
<html lang="de"><body style="margin:0;background:#f5f7fa;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
    <tr><td style="padding:24px 24px 8px;">
      <p style="margin:0 0 20px;font-weight:700;font-size:18px;color:#0f2c52;">Fas-Nav.ch</p>
      ${absaetze}
      <p style="margin:24px 0 8px;">
        <a href="${escapeHtml(input.ticketUrl)}" style="display:inline-block;background:#0f2c52;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:15px;">Ticket öffnen</a>
      </p>
    </td></tr>
    <tr><td style="padding:8px 24px 24px;border-top:1px solid #e5e7eb;">
      <p style="margin:16px 0 0;font-size:12px;color:#6b7280;line-height:1.5;">
        Diese Nachricht wurde automatisch versendet, weil in deinem Ticket geantwortet wurde.
        Die Benachrichtigung lässt sich im Dashboard unter „Einstellungen“ abschalten.
      </p>
    </td></tr>
  </table>
</body></html>`;
}
