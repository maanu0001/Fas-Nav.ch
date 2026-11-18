import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { validBackupOrigin } from "@/lib/backup-origin";
import { getBackupFile, validBackupId, BACKUP_ROOT } from "@/lib/backup-center";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    if (!validBackupOrigin(request)) return NextResponse.json({ error: "Ungültiger Ursprung" }, { status: 403 });
    const { id } = await params;
    if (!validBackupId(id)) return NextResponse.json({ error: "Ungültige Backup-ID" }, { status: 400 });
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("confirmation" in body) || (body as { confirmation: unknown }).confirmation !== "RESTORE " + id) return NextResponse.json({ error: "Bestätigung ungültig" }, { status: 400 });
    const [db, media] = await Promise.all([getBackupFile(id, "database"), getBackupFile(id, "uploads")]);
    if (!db || !media) return NextResponse.json({ error: "Backup fehlt" }, { status: 404 });
    const manifest = JSON.parse(await readFile(join(BACKUP_ROOT, id, "manifest.json"), "utf8"));
    if (manifest.restoreTest?.status !== "passed" || manifest.restoreTest.databaseHash !== manifest.sha256?.database || manifest.restoreTest.uploadsHash !== manifest.sha256?.uploads) return NextResponse.json({ error: "Erfolgreicher Restore-Test erforderlich" }, { status: 409 });
    const token = process.env.BACKUP_RESTORE_GITHUB_TOKEN;
    if (!token) return NextResponse.json({ error: "BACKUP_RESTORE_GITHUB_TOKEN nicht konfiguriert" }, { status: 503 });
    const response = await fetch("https://api.github.com/repos/maanu0001/Fas-Nav.ch/actions/workflows/restore-production.yml/dispatches", {
      method: "POST", headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
      body: JSON.stringify({ ref: "main", inputs: { backup_id: id } }), cache: "no-store"
    });
    if (!response.ok) return NextResponse.json({ error: "Workflow konnte nicht gestartet werden (" + response.status + ")" }, { status: 502 });
    return NextResponse.json({ queued: true }, { status: 202 });
  } catch (error) { console.error("Restore-Anfrage fehlgeschlagen", error); return NextResponse.json({ error: "Restore-Anfrage abgelehnt" }, { status: 403 }); }
}
