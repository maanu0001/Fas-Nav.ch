import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { requirePermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
export const dynamic="force-dynamic";export const metadata:Metadata={title:"Suche"};
export default async function SearchPage({searchParams}:{searchParams:Promise<{q?:string}>}){await requirePermission("viewAllOrganizations");const q=(await searchParams).q?.trim()??"";const [orgs,events,users,tickets]=q.length>=2?await Promise.all([
 prisma.organization.findMany({where:{OR:[{name:{contains:q,mode:"insensitive"}},{city:{contains:q,mode:"insensitive"}},{contactEmail:{contains:q,mode:"insensitive"}}]},take:12,select:{id:true,name:true,city:true,type:true}}),
 prisma.event.findMany({where:{title:{contains:q,mode:"insensitive"}},take:12,select:{id:true,title:true,organization:{select:{name:true}}}}),
 prisma.user.findMany({where:{OR:[{name:{contains:q,mode:"insensitive"}},{email:{contains:q,mode:"insensitive"}}]},take:12,select:{id:true,name:true,email:true}}),
 prisma.ticket.findMany({where:{category:{not:"CONTACT"},OR:[{subject:{contains:q,mode:"insensitive"}},{guestEmail:{contains:q,mode:"insensitive"}}]},take:12,select:{id:true,number:true,subject:true}})
]):[[],[],[],[]];
 const Row=({href,title,meta}:{href:string;title:string;meta:string})=><Link href={href} className="block rounded-lg px-3 py-2 hover:bg-muted"><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground">{meta}</p></Link>;
 return <><PageHeader title="Globale Suche" description="Organisationen, Personen, Veranstaltungen und Tickets an einem Ort finden."/><form className="mb-6"><input name="q" defaultValue={q} autoFocus placeholder="Name, Ort, E-Mail, Veranstaltung oder Ticket …" className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-ring"/></form>{q.length<2?<Card className="p-8 text-center text-sm text-muted-foreground">Mindestens zwei Zeichen eingeben.</Card>:<div className="grid gap-5 lg:grid-cols-2">{[["Organisationen",orgs.map(x=><Row key={x.id} href={`/dashboard/organisationen/${x.id}`} title={x.name} meta={`${x.type==="CARNIVAL"?"Fasnacht":"Gugge"} · ${x.city}`}/>)],["Veranstaltungen",events.map(x=><Row key={x.id} href={`/dashboard/agenda`} title={x.title} meta={x.organization.name}/>)],["Accounts",users.map(x=><Row key={x.id} href={`/dashboard/accounts/${x.id}`} title={x.name} meta={x.email}/>)],["Tickets",tickets.map(x=><Row key={x.id} href={`/dashboard/tickets/${x.id}`} title={`#${x.number} ${x.subject}`} meta="Support"/>)]].map(([title,rows])=><Card key={String(title)} className="p-4"><h2 className="mb-2 font-display font-semibold">{title as string}</h2><div>{(rows as React.ReactNode[]).length?rows:<p className="p-3 text-sm text-muted-foreground">Keine Treffer</p>}</div></Card>)}</div>}</>}
