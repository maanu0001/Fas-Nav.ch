import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  CANTON_CODES,
  CANTON_CREST_DIR,
  CANTON_NAMES,
  CANTONS_WITH_CREST,
  cantonCrestAlt,
  cantonCrestFilename,
  cantonCrestPath,
  isCantonCode,
} from "@/lib/cantons";

/**
 * Tests der Wappenzuordnung.
 *
 * Die Zuordnung ist die einzige Stelle, an der Kantonscode, Name und Wappen
 * zusammenfinden. Sie muss deshalb vollständig sein und für unbekannte Codes
 * sauber nichts liefern, damit die Anzeige auf das Kürzel zurückfallen kann.
 */

describe("CANTON_CODES", () => {
  it("umfasst alle 26 Kantone", () => {
    assert.equal(CANTON_CODES.length, 26);
    assert.equal(new Set(CANTON_CODES).size, 26);
  });

  it("hat für jeden Code einen Namen", () => {
    for (const code of CANTON_CODES) {
      const name = CANTON_NAMES[code];
      assert.equal(typeof name, "string");
      assert.ok(name.length > 1, `Name für ${code}`);
    }
  });

  it("führt keine Namen ohne Code", () => {
    assert.equal(Object.keys(CANTON_NAMES).length, CANTON_CODES.length);
  });
});

describe("cantonCrestFilename", () => {
  it("leitet den Dateinamen eindeutig aus dem Code ab", () => {
    assert.equal(cantonCrestFilename("LU"), "lu.svg");
    const namen = CANTON_CODES.map((code) => cantonCrestFilename(code));
    assert.equal(new Set(namen).size, 26);
  });
});

describe("cantonCrestPath", () => {
  it("liefert einen Pfad nur für Kantone mit vorhandener Datei", () => {
    for (const code of CANTON_CODES) {
      const pfad = cantonCrestPath(code);
      if (CANTONS_WITH_CREST.includes(code)) {
        assert.equal(pfad, `${CANTON_CREST_DIR}/${cantonCrestFilename(code)}`);
      } else {
        assert.equal(pfad, null, `${code} hat keine Datei und darf keinen Pfad liefern`);
      }
    }
  });

  it("vergibt keinen Pfad zweimal", () => {
    const pfade = CANTON_CODES.map((code) => cantonCrestPath(code)).filter(Boolean);
    assert.equal(new Set(pfade).size, pfade.length);
  });

  it("nimmt Kleinschreibung und Leerzeichen an", () => {
    assert.equal(cantonCrestPath(" Lu "), cantonCrestPath("LU"));
    assert.equal(cantonCrestPath("lu"), cantonCrestPath("LU"));
  });

  it("liefert für unbekannte Codes null statt eines kaputten Pfades", () => {
    for (const eingabe of ["", "XX", "LUX", "DE", "ch", "1"]) {
      assert.equal(cantonCrestPath(eingabe), null, `Eingabe ${eingabe}`);
    }
  });
});

/**
 * Liste und Verzeichnis müssen sich decken.
 *
 * Ein Eintrag ohne Datei erzeugt einen 404 und ein kaputtes Bild; eine Datei
 * ohne Eintrag bleibt unsichtbar. Der Test prüft deshalb beide Richtungen –
 * er ist die Anleitung für alle, die Wappen nachliefern.
 */
describe("Wappendateien", () => {
  const verzeichnis = path.join(process.cwd(), "public", "wappen");

  it("führt nur gültige Kantonscodes", () => {
    for (const code of CANTONS_WITH_CREST) {
      assert.ok(isCantonCode(code), `${code} ist kein Kantonscode`);
    }
    assert.equal(new Set(CANTONS_WITH_CREST).size, CANTONS_WITH_CREST.length);
  });

  it("hat für jeden Eintrag eine Datei im Verzeichnis", () => {
    for (const code of CANTONS_WITH_CREST) {
      const datei = path.join(verzeichnis, cantonCrestFilename(code));
      assert.ok(existsSync(datei), `Datei fehlt: public/wappen/${cantonCrestFilename(code)}`);
    }
  });

  it("hat für jede Datei im Verzeichnis einen Eintrag", () => {
    if (!existsSync(verzeichnis)) return;
    const dateien = readdirSync(verzeichnis).filter((n) => n.endsWith(".svg"));
    const erwartet = new Set(CANTONS_WITH_CREST.map((code) => cantonCrestFilename(code)));
    for (const datei of dateien) {
      assert.ok(
        erwartet.has(datei),
        `public/wappen/${datei} ist nicht in CANTONS_WITH_CREST eingetragen`,
      );
    }
  });
});

describe("isCantonCode", () => {
  it("erkennt gültige und ungültige Codes", () => {
    assert.equal(isCantonCode("ZH"), true);
    assert.equal(isCantonCode("AI"), true);
    assert.equal(isCantonCode("XX"), false);
    assert.equal(isCantonCode("zh"), false);
  });
});

describe("cantonCrestAlt", () => {
  it("beschreibt das Wappen mit dem Kantonsnamen", () => {
    assert.equal(cantonCrestAlt("LU"), "Wappen des Kantons Luzern");
    assert.equal(cantonCrestAlt("ZH"), "Wappen des Kantons Zürich");
    assert.equal(cantonCrestAlt("AI"), "Wappen des Kantons Appenzell Innerrhoden");
  });

  it("nimmt den Namen aus den Daten, wenn er mitgegeben wird", () => {
    assert.equal(cantonCrestAlt("LU", "Luzern"), "Wappen des Kantons Luzern");
  });

  it("bleibt auch bei unbekanntem Code eine lesbare Beschriftung", () => {
    assert.equal(cantonCrestAlt("XX"), "Wappen des Kantons XX");
  });

  it("liefert für alle 26 Kantone eine eindeutige Beschriftung", () => {
    const texte = CANTON_CODES.map((code) => cantonCrestAlt(code));
    assert.equal(new Set(texte).size, 26);
    for (const text of texte) assert.match(text, /^Wappen des Kantons .+$/);
  });
});
