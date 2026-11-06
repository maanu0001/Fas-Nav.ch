import { requireAdmin } from "@/lib/rbac";
import { BoardingManagement } from "@/components/dashboard/boarding-management";
export const dynamic="force-dynamic";
export default async function BoardingPage(){await requireAdmin();return <main className="space-y-5"><h1 className="font-display text-2xl font-bold">Boarding und Freigaben</h1><BoardingManagement/></main>;}
