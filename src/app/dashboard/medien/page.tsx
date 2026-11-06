import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Archive, CalendarDays, FileText, ImageIcon, Mail, Music2, Store, Ticket, VenetianMask } from "lucide-react";
import type { Prisma } from "@prisma/client";

import { MediaAdminDelete } from "@/components/dashboard/media-admin-actions";
import { MailAttachmentCards } from "@/components/dashboard/media-mail-attachments";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "@/components/dashboard/page-header";
import { MEDIA_TYPE_LABELS } from "@/lib/constants";
import { formatDateShort } from "@/lib/dates";
import { requireStaffPage } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Medienverwaltung"};
type SearchParams=Promise<Record<string,string|undefined>>;
type Category="FASNACHT"|"GUGGE"|"AGENDA"|"TICKETS"|"INSERATE"|"MAILS";
const CATEGORIES:{id:Category;title:string;subtitle:string;icon:typeof ImageIcon}[]=[
 {id:"FASNACHT",title:"Fasnacht",subtitle:"Bilder und Dokumente",icon:VenetianMask},
 {id:"GUGGE",title:"Gugge",subtitle:"Bilder und Hörproben",icon:Music2},
 {id:"AGENDA",title:"Agendaeinträge",subtitle:"Veranstaltungsbilder",icon:CalendarDays},
 {id:"TICKETS",title:"Tickets",subtitle:"Ticketdateien",icon:Ticket},
 {id:"INSERATE",title:"Inserate",subtitle:"Marktplatzbilder",icon:Store},
 {id:"MAILS",title:"Mails",subtitle:"E-Mail-Anhänge",icon:Mail},
];
function formatBytes(n:number){return n<1024?`${n} B`:n<1048576?`${Math.round(n/1024)} KB`:`${(n/1048576).toFixed(1)} MB`;}
export default async function MediaLibraryPage({searchParams}:{searchParams:SearchParams}){
 const context=await requireStaffPage();
 const params=await searchParams;
 const category=CATEGORIES.some(item=>item.id===params.kategorie)?params.kategorie as Category:"FASNACHT";
 const q=(params.q||"").trim().slice(0,120);
 const isAdmin=context.user.role==="ADMIN";
 const mediaWhere:Prisma.MediaWhereInput={
  ...(category==="FASNACHT"?{organization:{is:{type:"CARNIVAL"}},type:{notIn:["EVENT","DOCUMENT"]}}:{}),
  ...(category==="GUGGE"?{organization:{is:{type:"GUGGE"}},type:{notIn:["EVENT","DOCUMENT"]}}:{}),
  ...(category==="AGENDA"?{eventImages:{some:{}}}:{}),
  ...(q?{AND:[{OR:[{filename:{contains:q,mode:"insensitive"}},{organization:{is:{name:{contains:q,mode:"insensitive"}}}}]}]}:{}),
 };
 const filesCategory=["FASNACHT","GUGGE","AGENDA"].includes(category);
 const [media,audio,listings,mailMessages,mediaCount,audioCount,eventsCount,listingsCount,mailCount]=await Promise.all([
  filesCategory?prisma.media.findMany({where:mediaWhere,orderBy:{createdAt:"desc"},take:150,select:{id:true,url:true,thumbnailUrl:true,filename:true,mimeType:true,alt:true,caption:true,type:true,size:true,width:true,height:true,createdAt:true,organization:{select:{id:true,name:true,type:true}},eventImages:{select:{title:true},take:1}}}):Promise.resolve([]),
  category==="GUGGE"?prisma.audioSample.findMany({where:q?{OR:[{title:{contains:q,mode:"insensitive"}},{organization:{name:{contains:q,mode:"insensitive"}}}]}:{},orderBy:{createdAt:"desc"},take:100,select:{id:true,title:true,url:true,durationSeconds:true,createdAt:true,organizationId:true,organization:{select:{name:true}}}}):Promise.resolve([]),
  category==="INSERATE"?prisma.marketplaceListing.findMany({where:{imageUrls:{isEmpty:false},...(q?{OR:[{title:{contains:q,mode:"insensitive"}},{organization:{name:{contains:q,mode:"insensitive"}}}]}:{})},orderBy:{createdAt:"desc"},take:100,select:{id:true,title:true,imageUrls:true,createdAt:true,organization:{select:{name:true}}}}):Promise.resolve([]),
  category==="MAILS"&&isAdmin?prisma.mailCenterMessage.findMany({where:{attachmentInfo:{not:{equals:null}},...(q?{OR:[{subject:{contains:q,mode:"insensitive"}},{sender:{contains:q,mode:"insensitive"}}]}:{})},orderBy:{receivedAt:"desc"},take:80,select:{id:true,conversationId:true,subject:true,sender:true,direction:true,receivedAt:true,attachmentInfo:true}}):Promise.resolve([]),
  prisma.media.count({where:{organization:{is:{type:"CARNIVAL"}},type:{notIn:["EVENT","DOCUMENT"]}}}),
  prisma.audioSample.count(),
  prisma.media.count({where:{eventImages:{some:{}}}}),
  prisma.marketplaceListing.count({where:{imageUrls:{isEmpty:false}}}),
  isAdmin?prisma.mailCenterMessage.count({where:{attachmentInfo:{not:{equals:null}}}}):Promise.resolve(0),
 ]);
 const guggeCount=await prisma.media.count({where:{organization:{is:{type:"GUGGE"}},type:{notIn:["EVENT","DOCUMENT"]}}});
 const counts:Record<Category,number>={FASNACHT:mediaCount,GUGGE:guggeCount+audioCount,AGENDA:eventsCount,TICKETS:0,INSERATE:listingsCount,MAILS:mailCount};
 const countShown=media.length+audio.length+listings.length+mailMessages.length;
 return <>
  <PageHeader title="Medien" description="Dateien zentral nach ihrem Einsatzbereich verwalten – mit klarer Trennung zwischen Organisationen, Agenda, Tickets, Inseraten und Mails."/>
  <nav aria-label="Medien-Kategorien" className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{CATEGORIES.map(item=>{const Icon=item.icon;const active=category===item.id;return <Link key={item.id} href={"/dashboard/medien?kategorie="+item.id} aria-current={active?"page":undefined} className={"flex items-center gap-3 rounded-xl border p-4 transition-colors "+(active?"border-primary bg-primary/10 ring-1 ring-primary/30":"bg-card hover:border-primary/40 hover:bg-muted/50")}><span className={"rounded-xl p-3 "+(active?"bg-primary text-white":"bg-muted")}><Icon className="h-5 w-5"/></span><span className="min-w-0 flex-1"><strong className="block text-sm">{item.title}</strong><span className="text-xs text-muted-foreground">{item.subtitle}</span></span><span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold tabular-nums">{counts[item.id]}</span></Link>})}</nav>
  <div className="mt-7 flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-bold">{CATEGORIES.find(item=>item.id===category)?.title}</h2><form action="/dashboard/medien" className="flex max-w-full items-center gap-2"><input type="hidden" name="kategorie" value={category}/><input name="q" defaultValue={q} placeholder="Datei, Betreff oder Organisation suchen" aria-label="Medien durchsuchen" className="min-w-0 rounded-lg border bg-background px-3 py-2 text-sm"/><button className="rounded-lg bg-primary px-3 py-2 text-sm text-white">Suchen</button></form></div>
  {category==="MAILS"&&!isAdmin?<p className="mt-4 rounded-xl border bg-muted p-4 text-sm">Mail-Anhänge sind ausschliesslich für Administratoren sichtbar.</p>:null}
  {category==="TICKETS"?<div className="mt-5 rounded-xl border border-dashed bg-card p-8"><h3 className="font-semibold">Noch keine Ticketdateien im Medienarchiv</h3><p className="mt-2 text-sm text-muted-foreground">Die derzeitige Ticketverwaltung speichert Textnachrichten, jedoch keine eigenen Dateianhänge. Entsprechend werden hier keine fremden oder nicht vorhandenen Dateien angezeigt.</p><Link href="/dashboard/tickets" className="mt-3 inline-block text-sm font-semibold text-primary underline">Tickets öffnen</Link></div>:null}
  {filesCategory&&media.length>0?<section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{media.map(item=><Card key={item.id} className="overflow-hidden"><div className="relative aspect-[4/3] bg-muted">{item.mimeType.startsWith("image/")?<Image src={item.thumbnailUrl||item.url} alt={item.alt||item.filename} fill sizes="(max-width:640px) 100vw,25vw" className="object-cover"/>:<div className="flex h-full items-center justify-center"><FileText className="h-12 w-12 text-muted-foreground"/></div>}<Badge variant="secondary" className="absolute left-2 top-2">{MEDIA_TYPE_LABELS[item.type]}</Badge></div><div className="space-y-1 p-3"><a href={item.url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-semibold hover:underline" title={item.filename}>{item.filename}</a><p className="truncate text-xs text-muted-foreground">{item.eventImages[0]?.title||item.organization?.name||"Plattform"}</p><p className="text-xs text-muted-foreground">{formatBytes(item.size)} · {formatDateShort(item.createdAt)}</p><MediaAdminDelete id={item.id} type="image" name={item.filename} category={item.type} alt={item.alt} caption={item.caption}/></div></Card>)}</section>:null}
  {category==="GUGGE"&&audio.length>0?<section className="mt-8 space-y-4"><h3 className="flex items-center gap-2 font-display text-lg font-semibold"><Music2 className="h-5 w-5"/>Hörproben</h3><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{audio.map(item=><Card key={item.id} className="space-y-3 p-4"><p className="truncate text-sm font-semibold">{item.title}</p><p className="text-xs text-muted-foreground">{item.organization.name} · {formatDateShort(item.createdAt)}</p><audio controls preload="none" className="w-full" src={item.url} aria-label={item.title}/><MediaAdminDelete id={item.id} type="audio" organizationId={item.organizationId} name={item.title}/></Card>)}</div></section>:null}
  {category==="INSERATE"&&listings.length>0?<section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{listings.map(item=><Card key={item.id} className="space-y-3 p-4"><strong className="block text-sm">{item.title}</strong><p className="text-xs text-muted-foreground">{item.organization.name}</p><div className="flex flex-wrap gap-2">{item.imageUrls.map((url,index)=><a key={url+index} href={url} target="_blank" rel="noopener noreferrer" className="relative block h-24 w-24 overflow-hidden rounded-lg border bg-muted"><Image src={url} alt={item.title+" Bild "+(index+1)} fill sizes="96px" className="object-cover" unoptimized/></a>)}</div><p className="text-xs text-muted-foreground">Bilder gehören zum Inserat und können dort bearbeitet werden.</p><Link href="/dashboard/boerse" className="text-sm font-semibold text-primary underline">Inserate verwalten</Link></Card>)}</section>:null}
  {category==="MAILS"&&isAdmin&&mailMessages.length>0?<section className="mt-5 grid gap-4 lg:grid-cols-2">{mailMessages.map(message=><Card key={message.id} className="space-y-3 p-4"><div className="flex items-start justify-between gap-2"><div><strong className="text-sm">{message.subject||"(Ohne Betreff)"}</strong><p className="mt-1 text-xs text-muted-foreground">{message.direction==="IN"?"Empfangen":"Gesendet"} · {message.sender} · {formatDateShort(message.receivedAt)}</p></div><Mail className="h-4 w-4 shrink-0 text-muted-foreground"/></div><MailAttachmentCards messageId={message.id}/><Link href={"/dashboard/mails/"+encodeURIComponent(message.conversationId)} className="inline-block text-sm font-semibold text-primary underline">Konversation öffnen</Link></Card>)}</section>:null}
  {countShown===0&&category!=="TICKETS"&&(category!=="MAILS"||isAdmin)?<div className="mt-6"><EmptyState icon={Archive} title="Keine Medien gefunden" description={q?"Mit diesem Suchbegriff wurden keine Dateien gefunden.":"In dieser Kategorie sind noch keine Medien erfasst."}/></div>:null}
  <p className="mt-5 text-xs text-muted-foreground">Dateien, die noch an Organisationen, Veranstaltungen oder anderen Inhalten hängen, können nicht unbeabsichtigt gelöscht werden. Bei Inseraten erfolgt die Bearbeitung über den betreffenden Eintrag.</p>
 </>;
}
