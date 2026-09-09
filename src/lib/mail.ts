import { mailConfigComplete, type MailSettings } from "@/lib/mail-config";
import { getMailSettings, recordMailAttempt } from "@/lib/mail-settings";

/**
 * E-Mail-Versand.
 *
 * Die Konfiguration kommt aus den Plattform-Einstellungen, nicht mehr aus der
 * Umgebung: Die Administration verwaltet Host, Absender und Zugangsdaten im
 * Dashboard. Ohne Konfiguration wird die Nachricht lediglich protokolliert –
 * ohne ihren Inhalt –, damit die Anwendung auch ohne Mailserver vollständig
 * arbeitet.
 */
export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

/**
 * Ergebnis eines Versands.
 *
 * `reason` unterscheidet den Fall „es gibt gar keinen Mailserver" vom Fall
 * „der Versand ist gescheitert". Aufrufer, die eine Wiederholung steuern,
 * brauchen diesen Unterschied: Ohne Mailserver ist nichts passiert und ein
 * späterer Versuch sinnvoll; ein gescheiterter Versand sollte dagegen nicht
 * endlos wiederholt werden.
 *
 * `message` ist die für Menschen gedachte, bereinigte Fassung des Fehlers –
 * ohne Zugangsdaten, ohne Serverantwort im Wortlaut.
 */
export type MailResult = {
  sent: boolean;
  reason?: "not_configured" | "disabled" | "failed";
  message?: string;
};

/**
 * Übersetzt einen Fehler des Mailservers in eine Meldung, die angezeigt und
 * gespeichert werden darf.
 *
 * Die ursprüngliche Meldung wird bewusst verworfen: Sie enthält je nach
 * Server den Benutzernamen, interne Hostnamen oder Teile der Anmeldung. Die
 * Fehlerkennung genügt, um das Problem einzugrenzen.
 */
export function mailErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  switch (code) {
    case "EAUTH":
      return "SMTP-Authentifizierung fehlgeschlagen. Benutzername oder Passwort prüfen.";
    case "ECONNECTION":
    case "ECONNREFUSED":
      return "Verbindung zum Mailserver nicht möglich. Host und Port prüfen.";
    case "ETIMEDOUT":
    case "ESOCKET":
      return "Zeitüberschreitung beim Mailserver. Host, Port und Verschlüsselung prüfen.";
    case "EENVELOPE":
      return "Absender- oder Empfängeradresse wurde vom Mailserver abgelehnt.";
    default:
      return "Mailversand fehlgeschlagen.";
  }
}

/** Absenderzeile aus Name und Adresse. */
function absender(settings: MailSettings): string {
  return settings.fromName
    ? `${settings.fromName} <${settings.fromEmail}>`
    : settings.fromEmail;
}

/**
 * Versendet eine Nachricht über die konfigurierte Verbindung.
 *
 * `settings` kann übergeben werden, um eine noch nicht gespeicherte
 * Konfiguration zu testen – die Testmail im Dashboard nutzt das. Ohne
 * Angabe gilt die gespeicherte Konfiguration.
 */
export async function sendMail(
  message: MailMessage,
  settings?: MailSettings,
): Promise<MailResult> {
  const config = settings ?? (await getMailSettings());

  if (!mailConfigComplete(config)) {
    // Ohne Inhalt und ohne Betreff: Auch Betreffzeilen können personenbezogen
    // sein, und dieser Zweig läuft auf jedem System ohne Mailserver.
    console.info("[mail] Mailversand nicht konfiguriert – Nachricht nicht versendet.");
    return { sent: false, reason: "not_configured" };
  }

  if (!config.enabled) {
    console.info("[mail] Mailversand deaktiviert – Nachricht nicht versendet.");
    return { sent: false, reason: "disabled" };
  }

  try {
    // nodemailer wird nur geladen, wenn tatsächlich versendet wird.
    const nodemailer = await import("nodemailer");

    const transport = nodemailer.default.createTransport({
      host: config.host,
      port: config.port,
      // „tls" bedeutet: von der ersten Verbindung an verschlüsselt (in der
      // Regel Port 465). „starttls" verhandelt die Verschlüsselung nach dem
      // Verbindungsaufbau – dafür ist secure=false richtig.
      secure: config.security === "tls",
      requireTLS: config.security === "starttls",
      auth: config.user ? { user: config.user, pass: config.password ?? "" } : undefined,
    });

    await transport.sendMail({
      from: absender(config),
      to: message.to,
      ...(config.replyTo ? { replyTo: config.replyTo } : {}),
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    await recordMailAttempt({ ok: true });
    return { sent: true };
  } catch (error) {
    const meldung = mailErrorMessage(error);
    // Nur die bereinigte Meldung protokollieren: Der ursprüngliche Fehler
    // kann Zugangsdaten enthalten.
    console.error(`[mail] ${meldung}`);
    await recordMailAttempt({ ok: false, message: meldung });
    return { sent: false, reason: "failed", message: meldung };
  }
}

export function passwordResetMail(name: string, url: string): Omit<MailMessage, "to"> {
  return {
    subject: "Passwort zurücksetzen – Fas-Nav.ch",
    text: `Hallo ${name}

Du hast das Zurücksetzen deines Passworts angefordert.

Öffne den folgenden Link, um ein neues Passwort zu setzen:
${url}

Der Link ist 60 Minuten gültig. Falls du die Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.

Freundliche Grüsse
Fas-Nav.ch`,
  };
}
