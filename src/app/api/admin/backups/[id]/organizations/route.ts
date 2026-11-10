import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { validBackupOrigin } from "@/lib/backup-origin";
import { requireAdmin } from "@/lib/rbac";
import { requireTestedBackup } from "@/lib/backup-center";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Read-only preview. Never writes to production.
 * The test database is shared; a new restore test can replace its contents.
 * Therefore this endpoint deliberately does not authorize applying a restore.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let isolated: PrismaClient | undefined;
  try {
    await requireAdmin();
    if (!validBackupOrigin(request)) return NextResponse.json({ error: "Ungültiger Ursprung" }, { status: 403 });
    const { id } = await params;
    const backup = await requireTestedBackup(id);
    const url = process.env.BACKUP_TEST_DATABASE_URL;
    if (!url) throw new Error("Isolierte Testdatenbank fehlt");
    const live = new URL(process.env.DATABASE_URL || "");
    const test = new URL(url);
    if (live.hostname === test.hostname) throw new Error("Testdatenbank darf nicht auf dem Produktivserver liegen");
    isolated = new PrismaClient({ datasources: { db: { url } } });
    const organizations = await isolated.organization.findMany({
      select: { id: true, name: true, slug: true, type: true, updatedAt: true,
        _count: { select: { events: true, media: true, sponsors: true, socialLinks: true,
          programItems: true, faqs: true, downloads: true } } },
      orderBy: { name: "asc" }
    });
    return NextResponse.json({ backupId: backup.id, testedAt: backup.testedAt, organizations,
      previewOnly: true, warning: "Vorschau des isolierten Testservers. Keine produktive Wiederherstellung freigegeben." },
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Selective restore preview failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Vorschau fehlgeschlagen" }, { status: 422 });
  } finally { await isolated?.$disconnect(); }
}
