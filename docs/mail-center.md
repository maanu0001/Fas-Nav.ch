# Mail Center – eigener Mailserver

Fas-Nav verwendet das bestehende Postfach \`info@fas-nav.ch\` über IMAP (Dovecot, \`mail.fas-nav.ch:993\`, TLS) und SMTP (Postfix, \`mail.fas-nav.ch:587\`, STARTTLS). Microsoft Graph wird nicht mehr verwendet.

## Einrichtung
1. Admin → **Mails** → **Postfach verbinden** öffnen.
2. Benutzername \`info@fas-nav.ch\` und Postfachpasswort eingeben (niemals in GitHub, Chat oder Logs).
3. Verbindung speichern und **Verbindung testen**.
4. **Synchronisieren** und Posteingang / Gesendet in Roundcube vergleichen.
5. Testmail empfangen und beantworten, anschliessend Roundcube auf vollständigen Versand prüfen.
6. Den GitHub-Actions-Job \`mail-center-sync\` mit dem vorhandenen \`CRON_SECRET\` und den Deployment-SSH-Secrets aktivieren. Ohne diese Secrets läuft keine automatische Synchronisierung.

## Sicherheit und Grenzen
- TLS-Zertifikatsprüfung ist aktiviert, SMTP-STARTTLS zwingend. Host und Ports sind fest auf den geprüften Mailserver beschränkt, damit Administratoren keine internen Netzadressen abfragen können.
- Zugangsdaten sind AES-256-GCM-verschlüsselt. Zugriff nur für Administratoren.
- Die vollständige RFC822-Nachricht wird als Base64 in der Datenbank gespeichert; Anhänge werden daraus bei Bedarf geladen. Die Chat-Ansicht zeigt ausschliesslich Text, nie unbereinigtes HTML.
- IMAP \`BODY.PEEK[]\` verändert den Lesestatus auf dem Mailserver nicht. Die lokale Markierung «gelesen» verändert Roundcube nicht.
- Synchronisierungsfortschritt wird pro Ordner und UIDVALIDITY erst nach erfolgreichem DB-Commit gespeichert; erneutes Einlesen ist über eindeutige Nachrichten-IDs idempotent.
- Der Versand erfolgt per SMTP. Danach wird die exakt versendete Nachricht per IMAP APPEND im Gesendet-Ordner gespeichert. Falls das Speichern fehlschlägt, ist die Mail **möglicherweise bereits versendet**: nicht blind erneut senden.
- IMAP und SMTP müssen auch vom **Webserver** aus erreichbar sein. Die bisherigen OpenSSL-Tests wurden auf dem Mailserver ausgeführt.
- Noch offen für eine vollwertige Mail-Client-Erfahrung: serverseitige Entwürfe, Weiterleitungen, ausgehende Dateianhänge, umfangreiche MIME-Sonderfälle und eine dauerhafte Versandwarteschlange. Vor ausschliesslicher Nutzung des Dashboards sind End-to-End-Tests mit realen Mails erforderlich.
