# Kantonswappen

26 Dateien, benannt nach dem Kantonscode in Kleinbuchstaben:

```
ag.webp  ai.webp  ar.webp  be.webp  bl.webp  bs.webp  fr.webp  ge.webp
gl.webp  gr.webp  ju.webp  lu.webp  ne.webp  nw.webp  ow.webp  sg.webp
sh.webp  so.webp  sz.webp  tg.webp  ti.webp  ur.webp  vd.webp  vs.webp
zg.webp  zh.webp
```

Die Zuordnung Code zu Datei steht in `src/lib/cantons.ts` und ergibt sich
allein aus dem Namen – es gibt keine zusätzliche Tabelle zu pflegen.

## Herkunft

Die Dateien wurden von der Betreiberin bereitgestellt und unverändert
übernommen; umbenannt wurde nur der Dateiname. Nichts davon ist
nachgezeichnet, erzeugt oder aus einer anderen Quelle ergänzt worden.

Die Ursprungsnamen lassen auf die üblichen Vektorfassungen der Wappen
schliessen (`Wappen_<Kanton>_matt.svg`, `CHE_<Kanton>_COA.svg`,
`Coat_of_arms_of_…`), hier als verlustfreies WebP. Wer die Lizenzlage
festhalten will, ergänzt sie hier je Datei.

Kantonswappen sind Hoheitszeichen; ihre Verwendung richtet sich nach dem
Wappenschutzgesetz (WSchG) und den kantonalen Regelungen. Eine rein
beschreibende Verwendung – das Wappen als Kennzeichnung des Kantons in einer
Übersicht – ist üblich, die Prüfung obliegt aber der Betreiberin.

## Format

Verlustfreies WebP mit Transparenz, rund 120 × 146 Pixel (Zürich grösser).
Die Wappen bringen ihre Schildform samt Umriss mit und stehen deshalb ohne
eigene Hintergrundfläche – siehe `CantonCrest`.

## Wappen ändern oder ergänzen

Zwei Schritte, immer gemeinsam:

1. Datei hier ablegen, benannt nach dem Kantonscode (`lu.webp`).
2. Den Code in `CANTONS_WITH_CREST` in `src/lib/cantons.ts` führen.

Der zweite Schritt ist kein Formalismus: Ohne ihn wüsste die Anzeige erst
nach einer fehlgeschlagenen Anfrage, dass die Datei fehlt – für einen Moment
wäre ein kaputtes Bild zu sehen und im Netzwerkprotokoll stünde ein 404. Die
Liste verhindert die Anfrage von vornherein.

`npm test` vergleicht Liste und Verzeichnis in beide Richtungen und nennt
jeden Eintrag ohne Datei und jede Datei ohne Eintrag.

## Fehlt eine Datei

Dann zeigt `CantonCrest` für diesen Kanton das Kantonskürzel wie früher –
ohne fehlschlagende Anfrage und ohne kaputtes Bild.
