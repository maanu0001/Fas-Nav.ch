import { redirect } from "next/navigation";
import { requireOrganizationContext } from "@/lib/dashboard-context";
import { StudioEditor } from "@/components/studio/studio-editor";

export const metadata = { title: "FAS-NAV Studio" };
export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const context = await requireOrganizationContext();
  if (!context.can("edit")) redirect("/dashboard/kein-zugriff");
  return <StudioEditor organizationId={context.organization.id} organizationName={context.organization.name} />;
}
