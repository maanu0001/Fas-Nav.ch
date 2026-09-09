import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * Verschlüsselung für Zugangsdaten, die in der Datenbank liegen.
 *
 * Gebraucht wird das für Dinge, die die Anwendung später im Klartext braucht,
 * um sich damit anzumelden – ein SMTP-Passwort etwa. Ein Passwort-Hash hilft
 * hier nicht: Man kann sich nicht mit einem Hash bei einem Mailserver
 * anmelden. Also verschlüsseln statt hashen, mit AES-256-GCM, das die
 * Nachricht zugleich gegen Veränderung sichert.
 *
 * Der Schlüssel wird aus AUTH_SECRET abgeleitet. Das ist bewusst kein neues
 * Geheimnis in der Umgebung: AUTH_SECRET gibt es bereits, jede Installation
 * hat es, und es ist genau die Art von Wert, die niemals in die Datenbank
 * gehört. Der Vorgabe „keine Mailkonfiguration in .env" widerspricht das
 * nicht – dort steht kein Mailwert, sondern der Schlüssel, mit dem die in der
 * Datenbank abgelegten Werte geschützt sind. Ein Geheimnis, das den Inhalt
 * der Datenbank schützt, darf nicht in derselben Datenbank liegen.
 *
 * Folge davon: Wechselt AUTH_SECRET, lassen sich vorhandene Zugangsdaten
 * nicht mehr entschlüsseln. Sie müssen dann einmal neu erfasst werden. Die
 * Anwendung erkennt den Fall und behandelt ihn wie „nicht konfiguriert",
 * statt beim Start abzubrechen.
 */

/** Kennzeichnung am Anfang jedes Werts, damit das Format erkennbar bleibt. */
const PREFIX = "enc:v1:";

function schluessel(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET fehlt – Zugangsdaten können nicht verschlüsselt werden.");
  }
  // Fester Salt: Der Schlüssel muss über Neustarts hinweg derselbe sein,
  // sonst wäre nichts mehr lesbar. Die Zufälligkeit steckt im IV je Wert.
  return scryptSync(secret, "fas-nav-secret-v1", 32);
}

/** Ist der Wert bereits verschlüsselt? */
export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX);
}

/**
 * Verschlüsselt einen Wert für die Ablage in der Datenbank.
 *
 * Das Ergebnis enthält den Initialisierungsvektor und den Authentifizierungs-
 * Tag, ist also für sich allein entschlüsselbar. Jeder Aufruf liefert ein
 * anderes Ergebnis, auch bei gleicher Eingabe.
 */
export function encryptSecret(klartext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", schluessel(), iv);
  const daten = Buffer.concat([cipher.update(klartext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${daten.toString("base64")}`;
}

/**
 * Entschlüsselt einen Wert – oder liefert null.
 *
 * Null bedeutet: nicht lesbar. Das ist kein Ausnahmefall, den Aufrufer
 * abfangen müssten, sondern ein erwarteter Zustand (kein Wert hinterlegt,
 * Schlüssel gewechselt, Datensatz beschädigt). Die Anwendung behandelt ihn
 * wie eine fehlende Konfiguration und läuft weiter.
 */
export function decryptSecret(wert: string | null | undefined): string | null {
  if (!wert || !isEncrypted(wert)) return null;

  try {
    const [iv, tag, daten] = wert.slice(PREFIX.length).split(":");
    if (!iv || !tag || !daten) return null;

    const decipher = createDecipheriv("aes-256-gcm", schluessel(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(daten, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Bewusst ohne Protokolleintrag mit Inhalt: Weder der Wert noch der
    // Schlüssel dürfen in einem Log landen.
    return null;
  }
}
