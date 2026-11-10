import { NextResponse } from "next/server";
import { validBackupOrigin } from "@/lib/backup-origin";
import { requireAdmin } from "@/lib/rbac";
import { getBackupFile, listBackups, validBackupId } from "@/lib/backup-center";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    if (!validBackupOrigin(request)) return NextResponse.json({ error: "Ungültiger Ursprung" }, { status: 403 });
    const { id } = await params;
    if (!validBackupId(id)) return NextResponse.json({ error: "Ungültige Backup-ID" }, { status: 400 });
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("confirmation" in body) || body.confirmation !== id) {
      return NextResponse.json({ error: "Zur Bestätigung die vollständige Backup-ID eingeben" }, { status: 400 });
    }
    const backup = (await listBackups()).find(item => item.id === id);
    if (!backup?.verified || backup.restoreTest?.status !== "passed") {
      return NextResponse.json({ error: "Nur verifizierte Backups mit bestandenem Restore-Test sind zulässig" }, { status: 422 });
    }
    await Promise.all([getBackupFile(id, "database"), getBackupFile(id, "uploads")]);
    const token = process.env.BACKUP_RESTORE_GITHUB_TOKEN;
    const repository = process.env.BACKUP_RESTORE_GITHUB_REPOSITORY || "maanu0001/Fas-Nav.ch";
    if (!token || !/^[\w.-]+\/[\w.-]+$/.test(repository)) {
      return NextResponse.json({ error: "Restore-Ausführung nicht konfiguriert (BACKUP_RESTORE_GITHUB_TOKEN)" }, { status: 503 });
    }
    const response = await fetch(`https://api.github.com/repos/${repository}/actions/workflows/restore-production.yml/dispatches`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json" },
      body: JSON.stringify({ ref: "main", inputs: { backup_id: id } }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      console.error("Restore dispatch failed", response.status);
      return NextResponse.json({ error: "Wiederherstellungsauftrag konnte nicht gestartet werden. GitHub-Konfiguration prüfen." }, { status: 502 });
    }
    console.warn("Full system restore requested", { backupId: id, at: new Date().toISOString() });
    return NextResponse.json({ status: "queued", backupId: id, workflowUrl: `https://github.com/${repository}/actions/workflows/restore-production.yml` }, { status: 202 });
  } catch (error) {
    console.error("Restore request rejected", error);
    return NextResponse.json({ error: "Wiederherstellungsauftrag abgelehnt" }, { status: 403 });
  }
}
