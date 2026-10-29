import { mailConfigComplete, type MailSettings } from "@/lib/mail-config";
import { getMailSettings, recordMailAttempt } from "@/lib/mail-settings";

export type MailAttachment = {
  filename: string;
  content: Buffer | Uint8Array;
  contentType?: string;
};

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: MailAttachment[];
};

export type MailResult = {
  sent: boolean;
  reason?: "not_configured" | "disabled" | "failed";
  message?: string;
};

export function mailErrorMessage(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code) : "";
  switch (code) {
    case "EAUTH": return "SMTP-Authentifizierung fehlgeschlagen. Benutzername oder Passwort prüfen.";
    case "ECONNECTION":
    case "ECONNREFUSED": return "Verbindung zum Mailserver nicht möglich. Host und Port prüfen.";
    case "ETIMEDOUT":
    case "ESOCKET": return "Zeitüberschreitung beim Mailserver. Host, Port und Verschlüsselung prüfen.";
    case "EENVELOPE": return "Absender- oder Empfängeradresse wurde vom Mailserver abgelehnt.";
    default: return "Mailversand fehlgeschlagen.";
  }
}

function absender(settings: MailSettings): string {
  return settings.fromName ? `${settings.fromName} <${settings.fromEmail}>` : settings.fromEmail;
}

export async function sendMail(message: MailMessage, settings?: MailSettings): Promise<MailResult> {
  const config = settings ?? (await getMailSettings());
  if (!mailConfigComplete(config)) {
    console.info("[mail] Mailversand nicht konfiguriert – Nachricht nicht versendet.");
    return { sent: false, reason: "not_configured" };
  }
  if (!config.enabled) {
    console.info("[mail] Mailversand deaktiviert – Nachricht nicht versendet.");
    return { sent: false, reason: "disabled" };
  }
  try {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.default.createTransport({
      host: config.host,
      port: config.port,
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
      attachments: message.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: Buffer.from(attachment.content),
        contentType: attachment.contentType,
      })),
    });
    await recordMailAttempt({ ok: true });
    return { sent: true };
  } catch (error) {
    const meldung = mailErrorMessage(error);
    console.error(`[mail] ${meldung}`);
    await recordMailAttempt({ ok: false, message: meldung });
    return { sent: false, reason: "failed", message: meldung };
  }
}

export function passwordResetMail(name: string, url: string): Omit<MailMessage, "to"> {
  return {
    subject: "Passwort zurücksetzen – Fas-Nav.ch",
    text: `Hallo ${name}\n\nDu hast das Zurücksetzen deines Passworts angefordert.\n\nÖffne den folgenden Link, um ein neues Passwort zu setzen:\n${url}\n\nDer Link ist 60 Minuten gültig. Falls du die Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.\n\nFreundliche Grüsse\nFas-Nav.ch`,
  };
}
