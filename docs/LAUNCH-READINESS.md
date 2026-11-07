# Fas-Nav.ch – verbindliche Produktionsabnahme

Diese Liste trennt **automatisierte Vorbereitungen** von der manuellen Freigabe. Der Wartungsmodus bleibt bis zum dokumentierten Go/No-Go aktiviert.

## 1. Technische Vorbedingungen (Admin)
- [ ] Impressum: Betreibername, ladungsfähige Adresse, E-Mail und falls zutreffend UID/MWST im Dashboard gepflegt; juristisch geprüft
- [ ] Datenschutzerklärung mit realen Dienstleistern, Aufbewahrungsfristen und Akquise-Linktracking geprüft
- [ ] Nutzungsrechte für sämtliche Plattform-, importierten und hochgeladenen Bilder geklärt
- [ ] SMTP / Mail Center verbunden; Testmail und Antwort von extern zugestellt
- [ ] Stripe Live-Schlüssel und Webhook-Geheimnis korrekt; Abrechnung und Kundenportal konfiguriert
- [ ] Erster **erfolgreicher Backup-Workflow**: GitHub Actions → Produktionsbackup
- [ ] Backups sind zusätzlich **extern/offsite verschlüsselt** gesichert; täglicher lokaler Backup allein schützt nicht vor Serververlust
- [ ] **Restore-Probelauf** mit Test-Datenbank und Upload-Archiv, inklusive Konsistenzprüfung und geübtem Rückfallplan
- [ ] Server-Zugriffsrechte, Secrets, DNS/TLS, SPF/DKIM/DMARC, Speicherplatz und Monitoring mit Alarmen geprüft
- [ ] GitHub CI inkl. typecheck, Tests, Lint und Build grün, Produktionsdeployment/Healthcheck grün

## 2. Rollen (separate Testkonten verwenden)
- [ ] ADMIN: kompletter Zugriff, Testmodus, Zahlungen, Abos, Einstellungen; Live-Shop via Stripe
- [ ] TEAM: operative Bereiche, aber weder Finanzen noch Betreiber-Sicherheitssettings
- [ ] OWNER / MANAGER / EDITOR: eigene Berechtigungen korrekt, fremde Organisationen/IDs ergeben 403/404
- [ ] Account deaktivieren, Rolle ändern, Passwort wechseln und Passwort zurücksetzen: **alte Session darf nicht mehr privilegiert handeln**
- [ ] Direkter API-Aufruf (ohne UI) mit fremder Organisations-ID und veränderter Ressource blockiert

## 3. Kernstrecke Organisation
- [ ] Antrag → Admin-Erfassung → Boarding-Mail → Link öffnen → Account erstellen (auch mit anderer Adresse)
- [ ] Admin freigeben: Mail wird an **registrierte** Adresse versendet, Login möglich
- [ ] Entwurf-Vorschau am öffentlichen Original-Link für berechtigte Nutzer; anonyme Besucher sehen 404
- [ ] Profildaten, Logo/Header, Galerie, Sponsor, Downloads, FAQ und Audio am Handy/PC
- [ ] Profil publizieren: fehlende Grundangaben werden blockiert; Status/SEO/Sitemap korrekt
- [ ] Eigene Events erstellen/ändern/veröffentlichen; Grenzen nach Tarif; Reminder
- [ ] Inserat entwerfen/speichern, Bilder hochladen/entfernen, veröffentlichen, Anfrage/Antwort
- [ ] Premium-Funktionen nach Upgrade sichtbar, nach Kündigung korrekt eingeschränkt

## 4. Zahlungs- und Rechnungsfälle **im Stripe-Testmodus**
- [ ] Erstkauf: kein Doppel-Checkout, genau ein aktives Abo und eine verbuchte Stripe-Rechnung
- [ ] Wiederholter Webhook: keine zweite Rechnung und keine zweite Benachrichtigung
- [ ] Tarifwechsel im Stripe-Portal, Kündigung zum Periodenende, Verlängerung
- [ ] Fehlgeschlagene Zahlung, später erfolgreiche Zahlung: Status korrekt und nicht rückwärts überschrieben
- [ ] Vollständige Rückerstattung und Out-of-Order-Events korrekt
- [ ] Admin: manuelle Abos/Rechnungen verwalten; Stripe-Abos ausschliesslich über Stripe synchronisieren
- [ ] Zahlungen: Stripe und manuelle Buchungen inkl. Such-/Statusfilter und PDF konsistent

## 5. Mail und Support
- [ ] Akquise-Mail enthält sichtbare Fas-Nav-URL, funktionierenden individuellen Klick-Link und Zähler
- [ ] Tracking-Bild kann blockiert werden; Klickzahlen können durch Scanner verfälscht sein
- [ ] IMAP-Eingang, Antworten, Ordner, Suche und dauerhafte Löschung korrekt
- [ ] Anhänge: Bild und PDF innerhalb fixer Vorschau ohne Überlauf; andere Dateitypen nur Download
- [ ] Benachrichtigungseinstellungen respektiert; Tickets/CRM/Feedback getestet

## 6. Visuelle und technische Freigabe
- [ ] iPhone SE / Standard / Plus, Android, Tablet, Desktop (Chrome, Safari, Firefox)
- [ ] Dark und Light Mode: Kontrast, Buttons, Formulare, Tabellen, Navigation, Dialoge
- [ ] Tastaturbedienung, Focus, Labels, grosse Schrift und Screenreader-Grundfunktionen
- [ ] Leere Listen, Ladezeiten, Fehlerfälle, Verbindungsausfall und doppelte Formularabsendungen
- [ ] Öffentliche Suche, Kalender, Karte, Filter, SEO, Canonicals, Sitemap, robots und Bilder
- [ ] Mobile Datenverbindung: Core Web Vitals/LCP/CLS, Bildgrössen und API-Latenzen
- [ ] Nach Freigabe Wartungsmodus ausschalten und öffentliche Seiten anonym prüfen

## Backup auf dem Produktionsserver
Der Workflow `.github/workflows/backup-production.yml` startet täglich um **02:30 UTC** das Skript `scripts/backup-production.sh`. Dieses schreibt ein PostgreSQL-Custom-Dump und ein tar.gz-Archiv der Uploads in `/opt/fas-nav/app/backups/<UTC-Zeitstempel>`, erstellt SHA256-Summen, prüft die Archive und entfernt lokale Backups nach 14 Tagen.

**Wichtig:** Die Workflow-Existenz beweist weder, dass ein Lauf schon erfolgreich war, noch dass ein Restore funktioniert. Beide Nachweise müssen separat dokumentiert werden. Kein Backuparchiv oder .env in Git einchecken. Kopie der Sicherungen verschlüsselt auf ein anderes System legen. Restore nur in isolierter Testumgebung durchführen.
