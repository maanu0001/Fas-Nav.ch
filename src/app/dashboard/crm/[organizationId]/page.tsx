import Link from "next/link";
import { ArrowLeft, ExternalLink, Mail, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { CrmRow } from "@/components/dashboard/crm-row";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

export const dynamic="force-dynamic";
type CRMStatus="IMPORTED"|"CONTACTED"|"REPLIED"|"CLAIMED"|"CUSTOMER"|"NOT_INTERESTED"|"UNREACHABLE";
type History={at?:string;by?:string;changes?:string[]};
type CRM={status:CRMStatus;nextFollowUp:string|null;notes:string;contactPerson:string;history?:History[]};

export default async function CrmOrganizationPage({params}:{params:Promise<{organizationId:string}>}){
 await requirePermission("manageOrganizations");const {organizationId}=await params;
 const[org,setting]=await Promise.all([prisma.organization.findUnique({where:{id:organizationId},select:{id:true,name:true,city:true,type:true,slug:true,contactName:true,contactEmail:true,claimStatus:true}}),prisma.siteSetting.findUnique({where:{key:`crm.organization.${organizationId}`},select:{value:true}})]);if(!org)notFound();
 const raw=setting?.value&&typeof setting.value==="object"&&!Array.isArray(setting.value)?setting.value as Partial<CRM>:{};const crm:CRM={status:raw.status??(org.claimStatus==="CLAIMED"?"CLAIMED":"IMPORTED"),nextFollowUp:raw.nextFollowUp??null,notes:raw.notes??"",contactPerson:raw.contactPerson??org.contactName??"",history:Array.isArray(raw.history)?raw.history:[]};
 return <><Link href="/dashboard/crm" className="mb-4 inline-flex items-center gap-1 text-sm text-primary-700 hover:underline"><ArrowLeft className="h-4 w-4"/>Zurück zum CRM</Link><PageHeader title={org.name} description="CRM-Arbeitsbereich für Kontakt, Status, Wiedervorlage und interne Notizen."/>
 <div className="grid gap-5 xl:grid-cols-[1fr_320px]"><div className="space-y-5"><Card className="p-5"><h2 className="mb-4 font-display text-lg font-semibold">Nächster Schritt</h2><CrmRow organizationId={org.id} initial={crm}/></Card><Card className="p-5"><h2 className="mb-4 font-display text-lg font-semibold">Verlauf</h2>{crm.history?.length?<div className="divide-y divide-border">{[...crm.history].reverse().map((entry,index)=><div key={`${entry.at}-${index}`} className="py-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium">{entry.changes?.join(" · ")}</p><span className="text-xs text-muted-foreground">{entry.at?new Intl.DateTimeFormat("de-CH",{dateStyle:"medium",timeStyle:"short"}).format(new Date(entry.at)):""}</span></div>{entry.by?<p className="mt-1 text-xs text-muted-foreground">{entry.by}</p>:null}</div>)}</div>:<p className="text-sm text-muted-foreground">Noch keine CRM-Aktivität protokolliert.</p>}</Card></div>
 <div className="space-y-5"><Card className="p-5"><h2 className="mb-3 font-display font-semibold">Organisation</h2><div className="space-y-3 text-sm"><p className="font-medium">{org.type==="CARNIVAL"?"Fasnacht":"Gugge"}</p>{org.city?<p className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4"/>{org.city}</p>:null}{org.contactEmail?<a href={`mailto:${org.contactEmail}`} className="flex items-center gap-2 text-primary-700 hover:underline"><Mail className="h-4 w-4"/>{org.contactEmail}</a>:null}</div><div className="mt-5 grid gap-2"><Link href={`/dashboard/organisationen/${org.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-medium hover:bg-muted">Organisation verwalten</Link>{org.slug?<Link href={`/organisationen/${org.slug}`} target="_blank" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-medium hover:bg-muted">Öffentliches Profil <ExternalLink className="h-4 w-4"/></Link>:null}</div></Card></div></div></>;
}
