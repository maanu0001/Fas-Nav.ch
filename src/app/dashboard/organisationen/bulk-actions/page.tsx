import { requireAdmin } from "@/lib/rbac";
import { BulkActions } from "@/components/dashboard/organization-bulk-actions";
export const dynamic="force-dynamic";
export default async function Page(){await requireAdmin();return <BulkActions/>;}
