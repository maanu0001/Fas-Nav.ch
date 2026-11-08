import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/dashboard-context";
import { PageHeader } from "@/components/dashboard/page-header";
import { BackupCenter } from "@/components/dashboard/backup-center";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Backups" };
export default async function BackupsPage() {
  await requireAdminPage();
  return <div className="space-y-6"><PageHeader title="Backups" description="Datenbank und hochgeladene Medien sichern, prüfen und herunterladen. Nur für Administratoren."/><BackupCenter /></div>;
}
