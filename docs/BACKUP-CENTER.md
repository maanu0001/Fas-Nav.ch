# Backup-Center – Betriebsanleitung

## Umfang: nur vollständige Systemsicherungen

Es gibt keine selektive Wiederherstellung einzelner Organisationen oder Datensätze.

## Implementiert
- Nur ADMIN: Dashboard → Backups.
- Manuelle Sicherung per Klick, PostgreSQL-Custom-Dump und Upload-Tarball.
- Liste mit Zeitstempeln, Grössen und Downloads; SHA-256-Verifikation vor dem Download.
- Admin-Upload von PostgreSQL-Dump und Medienarchiv mit Formatprüfung und Speicherung als importierte Sicherung (max. 512 MiB je Datei standardmässig).
- Täglicher GitHub-Actions-Job (02:00 UTC; in der Schweiz 03:00 Winterzeit / 04:00 Sommerzeit). Er benötigt die vorhandenen Production-SSH-Secrets sowie `CRON_SECRET` auf dem Server.
- Persistentes Docker-Volume `backup_data`, getrennt vom Datenbank- und Upload-Volume.

## Nicht implementiert – Sicherheitsgrenze
**Eine automatische vollständige Wiederherstellung über das Dashboard ist nicht implementiert.** Hochgeladene Backup-Dateien werden derzeit nur auf Archiv-Lesbarkeit geprüft und als Sicherung gespeichert; es findet keine isolierte Testwiederherstellung statt. Die Oberfläche zeigt dies ausdrücklich an. Eine direkte Wiederherstellung in die laufende Produktionsdatenbank wäre riskant: Verknüpfungen zwischen Organisationen, Accounts, Zahlungen und Medien dürfen nicht unkontrolliert überschrieben werden. Es werden ausschliesslich vollständige Systemsicherungen und vollständige Systemwiederherstellungen unterstützt.

## Prüfungen vor produktivem Einsatz
1. GitHub Actions → Deploy Production: Build und Deploy grün.
2. Als ADMIN Dashboard → Backups → Backup erstellen.
3. Beide Dateien herunterladen, Grösse und Inhalt prüfen. Organisationskonten und TEAM müssen gesperrt sein.
4. GitHub Actions → Tägliches Produktionsbackup → Run workflow. Nach Abschluss prüfen, ob eine neue Sicherung in der Liste erscheint.
5. **Wiederherstellung ausschliesslich auf isolierter Testinstanz üben**, niemals zuerst auf der Live-Datenbank.
6. Backup-Daten enthalten personenbezogene Daten, Passworthashes und vertrauliche Inhalte. Dateien nur verschlüsselt transportieren/lagern und Zugriffe protokollieren.
7. Zusätzlich **verschlüsselte externe/offsite Backups** einrichten. Ein Docker-Volume auf demselben Server ist kein Schutz gegen Serververlust.
8. Aufbewahrung, Speicherkapazität und Monitoring der täglichen Läufe festlegen. Aktuell erfolgt keine automatische Bereinigung des neuen Backup-Volumes.

## Hinweise
- Datenbank und Uploads werden nacheinander gesichert. Bei zeitgleichen Uploads können sie einen leicht unterschiedlichen Stand haben; für streng konsistente Vollsicherungen einen Schreibstopp/Wartungsmodus einsetzen.
- Die bisherige Sicherung `scripts/backup-production.sh` wird durch das neue Backup-Center **nicht ersetzt** und bleibt als separates Sicherheitsnetz vor Migrationen bestehen.
- Das neue Backup-Center liest nicht die bisherigen Host-Backups ein.
- Es gibt derzeit keine nachgewiesene erfolgreiche Ausführung des neuen Jobs oder Wiederherstellung.

## Isolierte Restore-Prüfung aktivieren

Der zusätzliche Dienst `backup_test_db` ist bewusst als optionales Docker-Compose-Profil konfiguriert und wird nicht automatisch mit dem produktiven Stack gestartet. Die Testdatenbank verwendet ein eigenes Volume und veröffentlicht keinen Port.

1. Ein langes, zufälliges Passwort erzeugen (z.B. `openssl rand -hex 32`).
2. In der produktiven `.env` ergänzen:
   - `BACKUP_TEST_DB_PASSWORD=<zufälliges Passwort>`
   - `BACKUP_TEST_DATABASE_URL=postgresql://backupcheck:<dasselbe URL-kodierte Passwort>@backup_test_db:5432/backupcheck`
3. Auf dem Server: `docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile backup-test up -d backup_test_db app`
4. Im Dashboard unter Backups bei einer Sicherung auf **Restore testen** klicken. Das System prüft die SHA-256-Werte und stellt die Datenbank im separaten PostgreSQL-Container wieder her. Die Live-Datenbank wird nicht verändert.

**Grenzen der Prüfung:** Die Datenbank-Wiederherstellung wird ausgeführt, aber kein vollständiger fachlicher Anwendungstest. Das Medienarchiv wird auf Lesbarkeit und Prüfsumme geprüft, nicht in einer separaten Anwendung gestartet. Ein bestandener Restore-Test ist deshalb noch keine Garantie für eine fehlerfreie produktive Übernahme.

**Produktive Wiederherstellung bleibt gesperrt:** Die Umsetzung eines sicheren, automatischen Produktions-Restores inklusive Schreibstopp, Rückfall-Backup, Rollback und Session-Invalidierung ist weiterhin offen. Keine ungetesteten Live-Restores durchführen.
