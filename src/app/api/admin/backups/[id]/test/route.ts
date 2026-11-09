import { NextResponse } from "next/server";
import { validBackupOrigin } from "@/lib/backup-origin";
import { requireAdmin } from "@/lib/rbac";
import { testRestore } from "@/lib/backup-center";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    if (!validBackupOrigin(request)) return NextResponse.json({ error: "Ungültiger Ursprung" }, { status: 403 });
    const { id } = await params;
    const result = await testRestore(id);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Restore-Test fehlgeschlagen", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Restore-Test fehlgeschlagen" }, { status: 422 });
  }
}
