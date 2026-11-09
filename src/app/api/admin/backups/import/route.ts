import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { importBackupFiles } from "@/lib/backup-center";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ error: "Ungültiger Ursprung" }, { status: 403 });
    const size = Number(request.headers.get("content-length") || 0);
    const max = Number(process.env.BACKUP_IMPORT_MAX_BYTES || 536870912);
    if (!size || size > 2 * max + 1048576) return NextResponse.json({ error: "Upload zu gross oder Grösse unbekannt" }, { status: 413 });
    const form = await request.formData();
    const db = form.get("database");
    const uploads = form.get("uploads");
    if (!(db instanceof File) || !(uploads instanceof File)) return NextResponse.json({ error: "Datenbank- und Medien-Datei erforderlich" }, { status: 400 });
    const result = await importBackupFiles(db, uploads);
    return NextResponse.json({ backup: result }, { status: 201 });
  } catch (error) {
    console.error("Backup-Importprüfung fehlgeschlagen", error);
    return NextResponse.json({ error: "Backup-Importprüfung fehlgeschlagen. Dateien nicht übernommen." }, { status: 422 });
  }
}
