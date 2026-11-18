import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { validBackupOrigin } from "@/lib/backup-origin";
import { deleteBackup } from "@/lib/backup-center";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    if (!validBackupOrigin(request)) return NextResponse.json({ error: "Ungültiger Ursprung" }, { status: 403 });
    await deleteBackup((await params).id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Löschen fehlgeschlagen" }, { status: 422 });
  }
}
