import { NextResponse } from "next/server";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { requireAdmin } from "@/lib/rbac";
import { getBackupFile } from "@/lib/backup-center";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string; kind: string }> }) {
  try {
    await requireAdmin();
    const { id, kind } = await params;
    if (kind !== "database" && kind !== "uploads") return NextResponse.json({ error: "Ungültiger Dateityp" }, { status: 400 });
    const file = await getBackupFile(id, kind);
    if (!file) return NextResponse.json({ error: "Backup nicht gefunden" }, { status: 404 });
    const stream = Readable.toWeb(createReadStream(file.path)) as ReadableStream<Uint8Array>;
    return new NextResponse(stream, { headers: { "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename="${id}-${file.filename}"`, "Content-Length": String(file.size), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error("Backup-Download fehlgeschlagen", error);
    return NextResponse.json({ error: "Download nicht möglich" }, { status: 403 });
  }
}
