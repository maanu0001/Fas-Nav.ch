/**
 * Wappen der 26 Kantone.
 *
 * Eine Zuordnung für alle Stellen, die ein Wappen zeigen – kein zweiter
 * Katalog und keine Verzweigung über 26 Fälle. Der Kantonscode aus der
 * Datenbank ist der Schlüssel; die Codes selbst bleiben unverändert Teil des
 * Datenmodells und werden weiterhin für Filter, Adressen und Suche gebraucht.
 *
 * Die Dateien liegen unter `public/wappen/`. Fehlt eine, zeigt die Komponente
 * das Kürzel wie bisher – siehe CantonCrest. Ein kaputtes Bild erscheint nie.
 */

export const CANTON_CODES = [
  "AG", "AI", "AR", "BE", "BL", "BS", "FR", "GE", "GL", "GR", "JU", "LU", "NE",
  "NW", "OW", "SG", "SH", "SO", "SZ", "TG", "TI", "UR", "VD", "VS", "ZG", "ZH",
] as const;

export type CantonCode = (typeof CANTON_CODES)[number];

/** Amtliche Namen, wie sie in der Beschriftung erscheinen. */
export const CANTON_NAMES: Record<CantonCode, string> = {
  AG: "Aargau",
  AI: "Appenzell Innerrhoden",
  AR: "Appenzell Ausserrhoden",
  BE: "Bern",
  BL: "Basel-Landschaft",
  BS: "Basel-Stadt",
  FR: "Freiburg",
  GE: "Genf",
  GL: "Glarus",
  GR: "Graubünden",
  JU: "Jura",
  LU: "Luzern",
  NE: "Neuenburg",
  NW: "Nidwalden",
  OW: "Obwalden",
  SG: "St. Gallen",
  SH: "Schaffhausen",
  SO: "Solothurn",
  SZ: "Schwyz",
  TG: "Thurgau",
  TI: "Tessin",
  UR: "Uri",
  VD: "Waadt",
  VS: "Wallis",
  ZG: "Zug",
  ZH: "Zürich",
};

/** Verzeichnis der Wappendateien. */
export const CANTON_CREST_DIR = "/wappen";

/**
 * Kantone, für die eine Wappendatei vorliegt.
 *
 * Bewusst eine ausdrückliche Liste und keine Vermutung anhand des Codes: Nur
 * so lässt sich ein fehlendes Wappen erkennen, *bevor* der Browser die Datei
 * anfragt. Andernfalls entstünde für jeden Kanton ohne Datei ein 404 und ein
 * kurz sichtbares kaputtes Bild – der Rückfall auf das Kürzel käme zu spät.
 *
 * Wer Wappen ergänzt, legt die Dateien nach `public/wappen/` und trägt die
 * Codes hier ein. Der Test `cantons.test.ts` vergleicht beide Seiten und
 * meldet jede Abweichung in beide Richtungen.
 */
export const CANTONS_WITH_CREST: readonly CantonCode[] = [];

export function isCantonCode(code: string): code is CantonCode {
  return (CANTON_CODES as readonly string[]).includes(code);
}

/**
 * Dateiname des Wappens eines Kantons.
 *
 * Der Name folgt strikt dem Kantonscode in Kleinbuchstaben, damit die
 * Zuordnung ohne Tabelle nachvollziehbar bleibt: `lu.svg` gehört zu Luzern.
 */
export function cantonCrestFilename(code: CantonCode): string {
  return `${code.toLowerCase()}.svg`;
}

/**
 * Pfad zur Wappendatei eines Kantons – oder null.
 *
 * Null bedeutet: kein Bild anzeigen. Das gilt für unbekannte Codes ebenso wie
 * für Kantone, deren Wappendatei noch fehlt. Die Anzeige fällt dann auf das
 * Kürzel zurück, ohne dass je eine Anfrage ins Leere geht.
 */
export function cantonCrestPath(code: string): string | null {
  const oben = code.trim().toUpperCase();
  if (!isCantonCode(oben)) return null;
  if (!CANTONS_WITH_CREST.includes(oben)) return null;
  return `${CANTON_CREST_DIR}/${cantonCrestFilename(oben)}`;
}

/** Beschriftung für Hilfsmittel und als Titel des Bildes. */
export function cantonCrestAlt(code: string, name?: string): string {
  const oben = code.trim().toUpperCase();
  const bezeichnung = name ?? (isCantonCode(oben) ? CANTON_NAMES[oben] : oben);
  return `Wappen des Kantons ${bezeichnung}`;
}
