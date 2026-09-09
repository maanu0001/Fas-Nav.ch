/**
 * Beschreibung der Mailkonfiguration – ohne Serverabhängigkeiten.
 *
 * Diese Datei enthält bewusst nur Typen, Beschriftungen und Vorgabetexte. Sie
 * wird auch von der Einstellungsmaske im Browser gebraucht, und die darf
 * weder Prisma noch `node:crypto` mitziehen: Beides ist serverseitig, und der
 * Verweis darauf hat die Seite zuvor mit einem Fehler beim Bündeln quittiert.
 *
 * Das Lesen und Schreiben der Werte steht in `mail-settings.ts` und bleibt
 * dort auf dem Server.
 */

/** Transportsicherheit, wie sie der Mailserver erwartet. */
export type MailSecurity = "none" | "starttls" | "tls";

export const MAIL_SECURITY_LABELS: Record<MailSecurity, string> = {
  none: "Keine",
  starttls: "STARTTLS",
  tls: "TLS/SSL",
};

export type MailSettings = {
  enabled: boolean;
  host: string;
  port: number;
  security: MailSecurity;
  user: string;
  /** Klartext – nur serverseitig, nie in einer Antwort an den Browser. */
  password: string | null;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  ticketRecipient: string;
  ticketSubject: string;
  ticketBody: string;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
};

/** Sicht der Administration: alles ausser dem Passwort selbst. */
export type MailSettingsView = Omit<MailSettings, "password"> & {
  /** Nur die Auskunft, ob ein Passwort hinterlegt ist. */
  hasPassword: boolean;
  /** Reicht die Konfiguration zum Versand? */
  complete: boolean;
};

/**
 * Platzhalter für die Anzeige eines hinterlegten Geheimnisses.
 *
 * Die Oberfläche zeigt nur, *dass* etwas hinterlegt ist. Weder Länge noch
 * Anfang oder Ende des Werts werden verraten – auch die Länge ist eine
 * Information, die niemand braucht.
 */
export const SECRET_PLACEHOLDER = "••••••••••••";

/**
 * Ist die Konfiguration vollständig genug für einen Versand?
 *
 * Benutzername und Passwort sind bewusst nicht zwingend: Es gibt Mailserver
 * im eigenen Netz, die ohne Anmeldung annehmen. Ohne Host oder Absender geht
 * dagegen nichts.
 */
export function mailConfigComplete(settings: { host: string; fromEmail: string }): boolean {
  return settings.host.trim().length > 0 && settings.fromEmail.trim().length > 0;
}

/**
 * Vorgabetexte der Ticketmeldung.
 *
 * Sie stehen hier und nicht in der Datenbank, damit eine frische Installation
 * sofort sinnvolle Mails verschickt. Sobald die Administration den Text
 * ändert, gilt der gespeicherte.
 */
export const DEFAULT_TICKET_SUBJECT =
  "Neue Antwort auf Ticket #{{ticketNumber}}: {{ticketTitle}}";

export const DEFAULT_TICKET_BODY = `Hallo {{recipientName}}

es gibt eine neue Antwort auf das Ticket #{{ticketNumber}} „{{ticketTitle}}".

{{senderName}} hat geschrieben:

{{messagePreview}}

Du kannst das Ticket hier öffnen:
{{ticketUrl}}

Freundliche Grüsse
{{siteName}}`;
