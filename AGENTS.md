# AGENTS.md — Fas-Nav.ch

## Projekt und Git-Workflow
- Repository: `maanu0001/Fas-Nav.ch`; produktiver Integrationsbranch ist **`main`**.
- **Wichtig:** Der aktuell auf GitHub eingestellte Default-Branch kann von `main` abweichen. Jede Änderung ausdrücklich von der aktuellen Spitze von `main` ableiten, niemals implizit vom Default-Branch.
- Änderungen nur auf eigenen, kurzlebigen Branches entwickeln; als Pull Request gegen `main` bereitstellen.
- Nicht ungefragt direkt auf `main` pushen oder PRs mergen. Das Deployment auf `main` ist produktiv.
- Vor Beginn eines Tasks gezielt die betroffenen Module, deren Aufrufer, Datenmodelle und Tests untersuchen. Keine breitflächigen Refactorings ohne Notwendigkeit.

## Architektur
- Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS.
- PostgreSQL über Prisma (`prisma/schema.prisma`, versionierte Migrationen in `prisma/migrations`).
- Authentifizierung: NextAuth Credentials; Berechtigungen zentral in `src/lib/rbac.ts`.
- Oberfläche: `src/app` und `src/components`; Geschäftslogik: `src/lib`; API-Routen: `src/app/api`.
- Produktivbetrieb: Docker Compose, GitHub Actions `.github/workflows/deploy-production.yml`, Deployment auf `main`.
- Mail Center: eigener IMAP/SMTP-Server (nicht Microsoft Graph); Betriebs- und Sicherheitshinweise in `docs/mail-center.md`.

## Sicherheit und Datenintegrität
- API-Routen und Server Actions müssen Authentifizierung und die jeweils passende Berechtigung serverseitig prüfen.
- Eingaben mit bestehenden Zod-Schemas validieren; Risiken durch CSRF, XSS, SSRF, SQL-Injection, unkontrollierte Uploads und sensible Logs beachten.
- Keine Zugangsdaten, Tokens, Passwörter, Live-Postfachdaten oder `.env`-Inhalte in Code, Commits, PR-Texte oder Chat schreiben.
- Bestehende Daten erhalten; Datenbankänderungen über additive, nachvollziehbare Prisma-Migrationen. Keine destruktiven Migrationen oder Seeds für Produktivdaten ohne ausdrücklichen Auftrag und Migrations-/Backup-Konzept.
- Bei E-Mail-Versand, Zahlungsabwicklung, Abonnements, Berechtigungen und Uploads besonders sorgfältig auf Idempotenz, Fehlerzustände und Zugriffskontrolle achten.
- Bestehende Schnittstellen und Abläufe nicht stillschweigend brechen.

## Qualität und Freigabe
- Für betroffene Bereiche relevante automatisierte Tests ergänzen oder aktualisieren.
- Vor PR möglichst `npm ci`, `npx prisma generate`, `npm run typecheck`, `npm test`, `npm run lint` und `npm run build` ausführen; fehlende Ausführung ausdrücklich deklarieren.
- Änderungen mit fokussierter PR-Beschreibung: Zweck, betroffene Bereiche, Datenbank-/ENV-Änderungen, Risiken, Tests und notwendige manuelle Schritte.
- Kein «fehlerfrei» oder «produktiv bereit» behaupten, bevor die passenden Checks und ggf. Live-Integrationstests erfolgreich sind.
- Keine automatisch ausgeführten produktiven Mail-, Zahlungs- oder Dateneingriffe ohne ausdrückliche Anweisung.
