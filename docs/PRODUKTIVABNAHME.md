# Fas-Nav.ch – Produktivabnahme

Stand: 07.11.2026. **Eine erfolgreiche CI, ein Deployment und echte End-to-End-Tests sind nicht bestätigt.** Die nachstehenden Punkte sind Abnahmekriterien, keine bereits bestandenen Tests.

## 1. Deployment und Betrieb (GitHub / Server)
- [ ] GitHub → Actions → Deploy Production → jüngster Lauf auf `main`: Verify (npm ci, Prisma, TypeScript, Tests, Lint, Build) und Deploy beide grün.
- [ ] Prüfen, ob die angezeigte Commit-SHA mit `main` übereinstimmt.
- [ ] Auf https://fas-nav.ch die Startseite und `/api/health` aufrufen. Health muss erfolgreich sein.
- [ ] Server: Containerzustand, Neustartschleifen, freie Kapazität und App-/DB-Logs prüfen.
- [ ] Produktionsbackup erstellen; **Wiederherstellung nur auf isolierter Testdatenbank** erproben. Niemals die Live-Datenbank für einen Restore-Test überschreiben.
- [ ] Secrets, SMTP/IMAP, Cron, Datenbank und Payment-Provider im Deployment prüfen; keine Geheimnisse in Tickets/Screenshots teilen.

## 2. Login, Rollen und Mandantentrennung
- [ ] Als ADMIN, TEAM und Organisations-OWNER/EDITOR getrennt anmelden.
- [ ] ADMIN sieht Admin-Funktionen; TEAM keine ausschliesslichen ADMIN-Aktionen; Organisationen keine fremden Verwaltungsdaten.
- [ ] Mit zwei Testorganisationen A/B: als A anmelden, die URL einer B-Ressource öffnen und eine Schreibaktion versuchen. Zugriff muss serverseitig verweigert werden.
- [ ] Passwort-Reset mit Testkonto durchführen; alten Link erneut öffnen (muss abgelehnt werden).
- [ ] Testkonto deaktivieren und prüfen, dass die laufende Sitzung keine Aktionen mehr durchführen kann.

## 3. Akquise und Boarding
- [ ] Dashboard → Mails → Akquise: Testmail an eigene Adresse senden. Link muss sichtbar als normale fas-nav.ch-URL erscheinen.
- [ ] Link einmal und mehrfach öffnen; Öffnungs-/Klickstatistik und Zuordnung zur richtigen Mail prüfen.
- [ ] Dashboard → Boarding: Einladung an neue Testadresse senden; Registrierung und Organisationszuordnung abschliessen.
- [ ] Link erneut und nach Ablauf öffnen; keine doppelte Mitgliedschaft/unerlaubte Freigabe.
- [ ] Dashboard → Admin Roadmap: Prozess anlegen, bearbeiten, fällige Wiedervorlage setzen und auf interne Benachrichtigung prüfen.

## 4. Organisations-Self-Service
- [ ] Als Organisation Profil, Kontakt, Logo/Banner speichern; Seite neu laden und persistierte Daten kontrollieren.
- [ ] Bildausschnitt, Seitenverhältnis und Qualität auf Desktop und Smartphone prüfen.
- [ ] Agenda-Eintrag erstellen, bearbeiten, veröffentlichen und entfernen.
- [ ] Tarif über Organisationsdashboard selbst buchen; ohne Admin-Eingriff muss der korrekte Tarif aktiv werden.
- [ ] Zahlungsanbieter-Testmodus: erfolgreiche, fehlgeschlagene und abgebrochene Zahlung sowie wiederholten Webhook prüfen. Keine doppelte Aktivierung.
- [ ] Nach Tarifwechsel/Ablauf kontrollieren, ob Funktionsrechte korrekt aktualisiert werden.

## 5. Kommunikation und Inhalte
- [ ] Dashboard → Mails: E-Mail senden, empfangen, beantworten; Konversation öffnen und Zuordnung prüfen.
- [ ] Je einen PDF- und Bildanhang öffnen; Vorschau darf nicht über die Box hinaus zoomen.
- [ ] Dashboard → Inserate: mit Bild speichern, Seite neu laden, bearbeiten, löschen.
- [ ] Dashboard → Saisonfeedback: an Testadresse senden, Link ausfüllen, Ergebnis bearbeiten und löschen.
- [ ] Kontaktformular/Tickets testen: Erfassung, Statuswechsel, Benachrichtigungen und Zuständigkeiten.
- [ ] Öffentlich: Organisationen, Agenda, Suche, Filter, Inserate und Medien auf korrekte Inhalte und Links prüfen.

## 6. Design, Mobilgeräte und Qualität
- [ ] iPhone Safari, Android Chrome und Desktop Chrome/Firefox: öffentliche Seiten und alle zentralen Dashboards prüfen.
- [ ] Navigation, Dialoge, Tabellen, Formulare und Dateivorschauen ohne horizontales Überlaufen.
- [ ] Für Speichern, Löschen und Versenden: klare Erfolgsmeldung und verständlicher Fehlerzustand.
- [ ] Leere Listen, fehlende Bilder, lange Namen, langsame Verbindung und ungültige Eingaben prüfen.
- [ ] SEO-Metadaten, Seitentitel, Sitemap, Robots und Barrierefreiheit der wichtigsten Seiten prüfen.
- [ ] Alle veröffentlichten Bilder und Texte auf Nutzungsrechte prüfen; nur nachweislich lizenzierte/eigene Medien verwenden.

## Freigaberegel
Produktivstart nur, wenn sämtliche sicherheits-, zahlungs-, daten- und deploymentkritischen Punkte bestanden sind. Fehler dokumentieren mit URL, Rolle, Gerät, Reproduktionsschritten und erwartetem/tatsächlichem Ergebnis. Eine fehlgeschlagene Prüfung ist ein offener Blocker, kein stillschweigend bestandener Test.
