import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, LockKeyhole } from "lucide-react";
import { OrganizationProfile } from "@/components/public/organization-profile";
import { getOrganizationForPreview, organizationEvents, relatedOrganizations } from "@/lib/queries/organization";
import { requireOrganizationAccessPage } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const metadata = { title: "Geschützte Organisationsvorschau", robots: { index: false, follow: false } };
export default async function PreviewPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  await requireOrganizationAccessPage(id, "view");
  const org=await getOrganizationForPreview(id);
  if(!org)notFound();
  const [events, related]=await Promise.all([
    organizationEvents(id),
    relatedOrganizations(id,org.canton.slug,org.type),
  ]);
  return <div className="-mx-3 -my-4 sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-8">
    <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-5 py-3 text-sm text-amber-950 lg:top-0">
      <span className="flex items-center gap-2 font-semibold"><Eye className="h-4 w-4"/> Vorschau · {org.status==="PUBLISHED"?"Veröffentlicht":"Entwurf – nicht öffentlich"}</span>
      <span className="flex items-center gap-2 text-xs"><LockKeyhole className="h-4 w-4"/> Nur für Berechtigte sichtbar</span>
      <Link href="/dashboard/seite" className="font-semibold underline">Zurück zum Editor</Link>
    </div>
    <OrganizationProfile organization={org} events={events} related={related}/>
  </div>;
}
