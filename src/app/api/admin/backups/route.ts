import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { createBackup, listBackups } from "@/lib/backup-center";
export const dynamic = "force-dynamic";
export async function GET() {
  try { await requireAdmin(); return NextResponse.json({ backups: await listBackups() }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Kein Zugriff oder Backups nicht verfügbar" }, { status: 403 }); }
}
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const origin = request.headers.get("origin");
    const expected = new URL(request.url).origin;
    if (!origin || origin !== expected) return NextResponse.json({ error: "Ungültiger Ursprung" }, { status: 403 });
    const result = await createBackup();
    return NextResponse.json({ backup: result }, { status: 201 });
  } catch (error) {
    console.error("Backup fehlgeschlagen", error);
    return NextResponse.json({ error: "Backup fehlgeschlagen. Serverprotokoll prüfen." }, { status: 500 });
  }
}
