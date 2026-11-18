import { redirect } from "next/navigation";
export default async function LegacyCrmOrganizationPage({params}:{params:Promise<{organizationId:string}>}) { const {organizationId}=await params; redirect("/dashboard/admin-roadmap/"+encodeURIComponent(organizationId)); }
