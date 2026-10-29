import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { relativeTime } from "@/lib/dates";
export const dynamic="force-dynamic"; export const metadata:Metadata={title:"Inbox"};
export default async function InboxPage(){await requirePermission("viewAllTickets");const [contacts,tickets,claims,pendingOrgs]=await Promise.all([
 prisma.ticket.findMany({where:{category:"CONTACT",status:{in:["OPEN","IN_PROGRESS"]}},orderBy:{createdAt:"desc"},take:30,select:{id:true,subject:true,guestName:true,guestEmail:true,status:true,createdAt:true}}),
 prisma.ticket.findMany({where:{category:{not:"CONTACT"},status:{in:["OPEN","IN_PROGRESS"]}},orderBy:{lastReplyAt:"desc"},take:30,select:{id:true,number:true,subject:true,status:true,lastReplyAt:true}}),
 prisma.organization.findMany({where:{claimStatus:"CLAIM_REQUESTED"},orderBy:{updatedAt:"desc"},take:30,select:{id:true,name:true,updatedAt:true}}),
 prisma.organization.findMany({where:{status:"PENDING_REVIEW"},orderBy:{updatedAt:"desc"},take:30,select:{id:true,name:true,updatedAt:true}})
]); const total=contacts.length+tickets.length+claims.length+pendingOrgs.length;
 const item=(href:string,title:string,meta:string,type:string)=><Link href={href} className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0 hover:bg-muted/40"><div><p className="text-sm font-semibold text-primary-900">{title}</p><p className="mt-1 text-xs text-muted-foreground">{meta}</p></div><Badge variant="muted">{type}</Badge></Link>;
 return <><PageHeader title="Inbox" description="Alles, was deine Aufmerksamkeit braucht – unabhängig davon, aus welchem Modul es kommt."/><div className="mb-5 grid gap-3 sm:grid-cols-4">{[["Offen",total],["Kontakt",contacts.length],["Tickets",tickets.length],["Claims & Prüfung",claims.length+pendingOrgs.length]].map(([l,v])=><Card key={String(l)} className="p-4"><p className="text-xs uppercase tracking-wide text-muted-foreground">{l}</p><p className="mt-1 text-2xl font-bold">{v}</p></Card>)}</div><Card className="p-5"><div className="divide-y divide-border">
 {contacts.map(x=>item(`/dashboard/kontaktanfragen/${x.id}`,x.subject,`${x.guestName??x.guestEmail??"Extern"} · ${relativeTime(x.createdAt)}`,"Kontakt"))}
 {claims.map(x=>item(`/dashboard/organisationen/${x.id}`,x.name,`Übernahme angefragt · ${relativeTime(x.updatedAt)}`,"Claim"))}
 {pendingOrgs.map(x=>item(`/dashboard/organisationen/${x.id}`,x.name,`Wartet auf Prüfung · ${relativeTime(x.updatedAt)}`,"Prüfung"))}
 {tickets.map(x=>item(`/dashboard/tickets/${x.id}`,`#${x.number} ${x.subject}`,relativeTime(x.lastReplyAt),"Ticket"))}
 {total===0?<p className="py-10 text-center text-sm text-muted-foreground">Alles erledigt. Deine Inbox ist leer.</p>:null}
 </div></Card></>;
}
