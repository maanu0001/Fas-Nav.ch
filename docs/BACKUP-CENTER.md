# Backup-Center – Betriebsanleitung

## Implementiert
- Nur ADMIN: Dashboard → Backups.
- Manuelle Sicherung per Klick, PostgreSQL-Custom-Dump und Upload-Tarball.
- Liste mit Zeitstempeln, Grössen und Downloads; SHA-256-Verifikation vor dem Download.
- Admin-Upload von PostgreSQL-Dump und Medienarchiv mit Formatprüfung und Speicherung als importierte Sicherung (max. 512 MiB je Datei standardmässig).
- Täglicher GitHub-Actions-Job (02:00 UTC; in der Schweiz 03:00 Winterzeit / 04:00 Sommerzeit). Er benötigt die vorhandenen Production-SSH-Secrets sowie `CRON_SECRET` auf dem Server.
- Persistentes Docker-Volume `backup_data`, getrennt vom Datenbank- und Upload-Volume.

## Nicht implementiert – Sicherheitsgrenze
**Ein automatischer vollständiger oder selektiver Restore in die produktive Datenbank ist noch nicht implementiert.** Hochgeladene Backup-Dateien werden derzeit nur auf Archiv-Lesbarkeit geprüft und als Sicherung gespeichert; es findet keine isolierte Testwiederherstellung statt. Die Oberfläche zeigt dies ausdrücklich an. Eine direkte Wiederherstellung in die laufende Produktionsdatenbank wäre riskant: Verknüpfungen zwischen Organisationen, Accounts, Zahlungen und Medien dürfen nicht unkontrolliert überschrieben werden. Eine sichere selektive Wiederherstellung erfordert zunächst Restore in eine isolierte Datenbank, Vorschau aller betroffenen Relationen, Konfliktregeln und Transaktionen.

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
