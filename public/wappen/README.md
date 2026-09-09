# Kantonswappen

Hier gehören 26 Dateien hinein, benannt nach dem Kantonscode in
Kleinbuchstaben:

```
ag.svg  ai.svg  ar.svg  be.svg  bl.svg  bs.svg  fr.svg  ge.svg  gl.svg
gr.svg  ju.svg  lu.svg  ne.svg  nw.svg  ow.svg  sg.svg  sh.svg  so.svg
sz.svg  tg.svg  ti.svg  ur.svg  vd.svg  vs.svg  zg.svg  zh.svg
```

Die Zuordnung Code zu Datei steht in `src/lib/cantons.ts` und ergibt sich
allein aus dem Namen – es gibt keine zusätzliche Tabelle zu pflegen.

## Wappen ergänzen

Zwei Schritte, immer gemeinsam:

1. Datei hier ablegen, benannt nach dem Kantonscode (`lu.svg`).
2. Den Code in `CANTONS_WITH_CREST` in `src/lib/cantons.ts` eintragen.

Der zweite Schritt ist kein Formalismus: Ohne ihn wüsste die Anzeige erst
nach einer fehlgeschlagenen Anfrage, dass die Datei fehlt – für einen Moment
wäre ein kaputtes Bild zu sehen und im Netzwerkprotokoll stünde ein 404. Die
Liste verhindert die Anfrage von vornherein.

`npm test` vergleicht Liste und Verzeichnis in beide Richtungen und nennt
jeden Eintrag ohne Datei und jede Datei ohne Eintrag.

## Solange die Dateien fehlen

Die Anwendung funktioniert vollständig: `CantonCrest` zeigt dann das
Kantonskürzel wie zuvor – ohne fehlschlagende Anfragen.

## Herkunft

Die Dateien sind bewusst **nicht** im Repository enthalten und wurden auch
nicht nachgezeichnet. Kantonswappen sind Hoheitszeichen; ihre Verwendung
richtet sich nach dem Wappenschutzgesetz (WSchG) und den kantonalen
Regelungen. Eine rein beschreibende Verwendung – ein Wappen als Kennzeichnung
des Kantons in einer Übersicht – ist üblich, die Prüfung obliegt aber der
Betreiberin.

Geeignete Quellen für die Vektordateien:

- Wikimedia Commons, Kategorie „Coats of arms of cantons of Switzerland“.
  Die Darstellungen dort stehen unter freien Lizenzen; die jeweilige Lizenz
  und der Urheber sind pro Datei angegeben und sollten hier vermerkt werden.
- Die Staatskanzleien der Kantone geben amtliche Fassungen heraus.

Nach dem Ablegen der Dateien bitte je Datei Quelle und Lizenz in dieser Datei
festhalten.
