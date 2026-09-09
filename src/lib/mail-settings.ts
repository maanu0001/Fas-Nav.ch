import { decryptSecret, encryptSecret } from "@/lib/crypto";
import {
  DEFAULT_TICKET_BODY,
  DEFAULT_TICKET_SUBJECT,
  mailConfigComplete,
  type MailSettings,
  type MailSettingsView,
} from "@/lib/mail-config";
import { prisma } from "@/lib/prisma";

/**
 * Mailkonfiguration – verwaltet im Dashboard, abgelegt in den
 * Plattform-Einstellungen.
 *
 * Vorher stand der Mailversand in Umgebungsvariablen. Das hiess: Wer den
 * Absender ändern wollte, brauchte Zugriff auf den Server und einen Neustart.
 * Jetzt liegt alles in `site_settings` unter der Gruppe „mail" und ist für
 * die Administration im Dashboard erreichbar. Das Passwort liegt dort
 * verschlüsselt; alles andere im Klartext, weil Host und Absenderadresse
 * keine Geheimnisse sind.
 *
 * Ein einzelner Schlüssel je Feld statt eines JSON-Blobs: Das ist die Form,
 * die das bestehende Einstellungssystem und dessen Endpunkt schon verwenden,
 * und sie erlaubt, das Passwort unangetastet zu lassen, wenn nur der Host
 * geändert wird.
 *
 * Typen und Beschriftungen stehen in `mail-config.ts` – diese Datei greift
 * auf Prisma und die Verschlüsselung zu und bleibt deshalb serverseitig.
 */

export const MAIL_SETTINGS_GROUP = "mail";

export const MAIL_KEYS = {
  enabled: "mail.enabled",
  host: "mail.host",
  port: "mail.port",
  security: "mail.security",
  user: "mail.user",
  /** Verschlüsselt abgelegt, nie im Klartext ausgeliefert. */
  password: "mail.password",
  fromName: "mail.fromName",
  fromEmail: "mail.fromEmail",
  replyTo: "mail.replyTo",
  /** Empfänger für Ticketmeldungen ohne Zuweisung. */
  ticketRecipient: "mail.ticketRecipient",
  ticketSubject: "mail.ticketSubject",
  ticketBody: "mail.ticketBody",
  lastSuccessAt: "mail.lastSuccessAt",
  lastErrorAt: "mail.lastErrorAt",
  lastError: "mail.lastError",
} as const;

const DEFAULTS: MailSettings = {
  enabled: false,
  host: "",
  port: 587,
  security: "starttls",
  user: "",
  password: null,
  fromName: "Fas-Nav.ch",
  fromEmail: "",
  replyTo: "",
  ticketRecipient: "",
  ticketSubject: DEFAULT_TICKET_SUBJECT,
  ticketBody: DEFAULT_TICKET_BODY,
  lastSuccessAt: null,
  lastErrorAt: null,
  lastError: null,
};

function text(wert: unknown, vorgabe: string): string {
  return typeof wert === "string" && wert.trim() ? wert : vorgabe;
}

/**
 * Liest die Mailkonfiguration.
 *
 * Enthält das entschlüsselte Passwort und darf deshalb ausschliesslich
 * serverseitig verwendet werden. Für die Oberfläche gibt es
 * `getMailSettingsForAdmin`, das den Klartext gar nicht erst herausgibt.
 */
export async function getMailSettings(): Promise<MailSettings> {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: Object.values(MAIL_KEYS) } },
    select: { key: true, value: true },
  });

  const werte = new Map(rows.map((r) => [r.key, r.value]));
  const roh = (key: string) => werte.get(key);

  const security = roh(MAIL_KEYS.security);
  const port = Number(roh(MAIL_KEYS.port));

  return {
    enabled: roh(MAIL_KEYS.enabled) === true,
    host: text(roh(MAIL_KEYS.host), DEFAULTS.host),
    port: Number.isFinite(port) && port > 0 ? port : DEFAULTS.port,
    security:
      security === "none" || security === "starttls" || security === "tls"
        ? security
        : DEFAULTS.security,
    user: text(roh(MAIL_KEYS.user), DEFAULTS.user),
    password: decryptSecret(
      typeof roh(MAIL_KEYS.password) === "string" ? (roh(MAIL_KEYS.password) as string) : null,
    ),
    fromName: text(roh(MAIL_KEYS.fromName), DEFAULTS.fromName),
    fromEmail: text(roh(MAIL_KEYS.fromEmail), DEFAULTS.fromEmail),
    replyTo: text(roh(MAIL_KEYS.replyTo), DEFAULTS.replyTo),
    ticketRecipient: text(roh(MAIL_KEYS.ticketRecipient), DEFAULTS.ticketRecipient),
    ticketSubject: text(roh(MAIL_KEYS.ticketSubject), DEFAULTS.ticketSubject),
    ticketBody: text(roh(MAIL_KEYS.ticketBody), DEFAULTS.ticketBody),
    lastSuccessAt: typeof roh(MAIL_KEYS.lastSuccessAt) === "string"
      ? (roh(MAIL_KEYS.lastSuccessAt) as string)
      : null,
    lastErrorAt: typeof roh(MAIL_KEYS.lastErrorAt) === "string"
      ? (roh(MAIL_KEYS.lastErrorAt) as string)
      : null,
    lastError: typeof roh(MAIL_KEYS.lastError) === "string"
      ? (roh(MAIL_KEYS.lastError) as string)
      : null,
  };
}

export async function getMailSettingsForAdmin(): Promise<MailSettingsView> {
  const { password, ...rest } = await getMailSettings();
  return { ...rest, hasPassword: password !== null, complete: mailConfigComplete(rest) };
}

/** Was beim Speichern geschrieben werden darf. */
export type MailSettingsInput = {
  enabled: boolean;
  host: string;
  port: number;
  security: MailSettings["security"];
  user: string;
  /** Leer oder fehlend lässt das gespeicherte Passwort unangetastet. */
  password?: string | null;
  /** Setzt das Passwort ausdrücklich zurück. */
  clearPassword?: boolean;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  ticketRecipient: string;
  ticketSubject: string;
  ticketBody: string;
};

/**
 * Speichert die Mailkonfiguration.
 *
 * Das Passwort wird nur angefasst, wenn ein neues übergeben wurde oder das
 * Zurücksetzen ausdrücklich verlangt ist. Sonst bliebe es beim Speichern
 * einer anderen Einstellung auf der Strecke – die Oberfläche kennt den
 * Klartext ja nicht und könnte ihn nicht mitschicken.
 */
export async function saveMailSettings(input: MailSettingsInput): Promise<void> {
  const eintraege: { key: string; value: unknown }[] = [
    { key: MAIL_KEYS.enabled, value: input.enabled },
    { key: MAIL_KEYS.host, value: input.host },
    { key: MAIL_KEYS.port, value: input.port },
    { key: MAIL_KEYS.security, value: input.security },
    { key: MAIL_KEYS.user, value: input.user },
    { key: MAIL_KEYS.fromName, value: input.fromName },
    { key: MAIL_KEYS.fromEmail, value: input.fromEmail },
    { key: MAIL_KEYS.replyTo, value: input.replyTo },
    { key: MAIL_KEYS.ticketRecipient, value: input.ticketRecipient },
    { key: MAIL_KEYS.ticketSubject, value: input.ticketSubject },
    { key: MAIL_KEYS.ticketBody, value: input.ticketBody },
  ];

  if (input.clearPassword) {
    eintraege.push({ key: MAIL_KEYS.password, value: "" });
  } else if (input.password) {
    eintraege.push({ key: MAIL_KEYS.password, value: encryptSecret(input.password) });
  }

  await prisma.$transaction(
    eintraege.map((eintrag) =>
      prisma.siteSetting.upsert({
        where: { key: eintrag.key },
        create: {
          key: eintrag.key,
          value: eintrag.value as never,
          group: MAIL_SETTINGS_GROUP,
        },
        update: { value: eintrag.value as never, group: MAIL_SETTINGS_GROUP },
      }),
    ),
  );
}

/**
 * Hält den Ausgang des letzten Versands fest.
 *
 * Die Meldung ist bereits die aufbereitete, kurze Fassung – der ursprüngliche
 * Fehler des Mailservers kann Benutzername oder Serverkennungen enthalten und
 * wird deshalb nicht gespeichert.
 */
export async function recordMailAttempt(
  ergebnis: { ok: true } | { ok: false; message: string },
): Promise<void> {
  const jetzt = new Date().toISOString();
  const eintraege = ergebnis.ok
    ? [{ key: MAIL_KEYS.lastSuccessAt, value: jetzt }]
    : [
        { key: MAIL_KEYS.lastErrorAt, value: jetzt },
        { key: MAIL_KEYS.lastError, value: ergebnis.message },
      ];

  try {
    await prisma.$transaction(
      eintraege.map((eintrag) =>
        prisma.siteSetting.upsert({
          where: { key: eintrag.key },
          create: { key: eintrag.key, value: eintrag.value, group: MAIL_SETTINGS_GROUP },
          update: { value: eintrag.value },
        }),
      ),
    );
  } catch (error) {
    // Der Versandstatus ist Zusatzinformation. Scheitert das Festhalten,
    // darf das den Aufrufer nicht stören.
    console.error("[mail] Versandstatus konnte nicht gespeichert werden:", error);
  }
}
