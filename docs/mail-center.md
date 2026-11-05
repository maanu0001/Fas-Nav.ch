# Fas-Nav Mail Center

## Status und Einrichtung

Das Admin-Modul ist unter `/dashboard/mails` erreichbar. Der Posteingang ist **nicht** mit SMTP allein abrufbar. Die aktuelle Implementierung unterstützt Microsoft 365 über Microsoft Graph (Application Permissions). Ohne Mailanbieter-Konfiguration bleibt die Verbindung deaktiviert.

1. In Microsoft Entra ID eine App registrieren und Tenant ID, Client ID und ein Client Secret erzeugen.
2. Microsoft Graph **Application** Permissions `Mail.Read` und `Mail.Send` konfigurieren und Admin-Consent erteilen.
3. **Unbedingt** den Zugriff der App auf `info@fas-nav.ch` einschränken (Exchange Online Application RBAC / geeignete Application Access Policy). Eine unbeschränkte App-Berechtigung wäre für ein einzelnes Postfach zu weitreichend.
4. Im Admin-Dashboard unter **Mails → Postfach verbinden** Tenant, Client, Postfach und Secret eintragen. Das Secret wird verschlüsselt gespeichert und nicht wieder angezeigt.
5. Mit **Synchronisieren** zunächst den Posteingang prüfen. Der automatische Lauf nutzt `CRON_SECRET` und die bestehenden Deployment-SSH-Secrets; er wird per GitHub Actions alle 10 Minuten angestossen, wobei GitHub-Schedules verzögert sein können.
6. Mit einem Testpostfach Empfang, Antwort, Gesendet-Ordner, Anhänge und Rechte prüfen, bevor die produktive Kommunikation ausschliesslich über das Dashboard läuft.

## Datenerhalt

- Graph-Deltacursor wird erst nach erfolgreich gespeicherten Nachrichten vorgerückt; wiederholte Importe sind über `providerId` idempotent.
- HTML-Original und lesbarer Text werden in PostgreSQL gespeichert. Die Chat-Ansicht rendert ausschliesslich Text, keine fremden HTML-Skripte.
- Anhänge bleiben im Originalpostfach und werden auf Abruf über einen Admin-geschützten Endpunkt geladen; Downloads sind auf 10 MiB beschränkt.
- Das Archivieren im Dashboard ändert nur den lokalen Bearbeitungsstatus. Beim Anbieter werden keine Nachrichten gelöscht.
- Vor Aktivierung Backup/Restore inklusive der neuen Tabellen prüfen.

## Noch nicht Bestandteil dieser Ausbaustufe

Der aktuelle Graph-Adapter unterstützt Microsoft 365. Für andere Mailanbieter braucht es einen separaten, getesteten IMAP-/SMTP- oder API-Adapter. Entwürfe, Weiterleitungen, CC/BCC und ausgehende Anhänge sind noch nicht vollständig integriert. Nachrichten werden beim Antworten über Graph verschickt und nach Synchronisierung des Gesendet-Ordners im Verlauf angezeigt. Eine gesonderte persistente Outbox mit Versand-Idempotenz und Zustellbestätigung ist für den zuverlässigen Produktionsbetrieb noch erforderlich.

**Deshalb darf diese Ausbaustufe vor Abschluss dieser Punkte nicht als vollständig produktionsbereit bezeichnet werden.**
