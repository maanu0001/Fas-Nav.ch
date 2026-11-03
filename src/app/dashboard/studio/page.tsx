import { redirect } from "next/navigation";
import { getDashboardContext } from "@/lib/dashboard-context";
import { StudioEditor } from "@/components/studio/studio-editor";

export const metadata = { title: "FAS-NAV Studio" };
export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const context = await getDashboardContext();
  if (!context.organization) redirect("/dashboard");
  return <StudioEditor organizationId={context.organization.id} organizationName={context.organization.name} />;
}
