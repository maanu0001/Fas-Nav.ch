import Link from "next/link";
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, Building2, CalendarDays, Eye, Minus, Search, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { formatChf } from "@/lib/utils";
import { can } from "@/lib/rbac";
import type { Role } from "@prisma/client";

type Daily = { day: Date; views: bigint; searches: bigint };
function Delta({current,previous}:{current:number;previous:number}) {
  const diff=current-previous;
  const percent=previous>0?Math.round(diff/previous*100):null;
  const Icon=diff>0?ArrowUpRight:diff<0?ArrowDownRight:Minus;
  return <span className={`inline-flex items-center gap-1 text-xs font-semibold ${diff>0?"text-emerald-600":diff<0?"text-rose-600":"text-muted-foreground"}`}>
    <Icon className="h-3.5 w-3.5"/>{diff>0?"+":""}{diff.toLocaleString("de-CH")} {percent!==null?`(${percent>0?"+":""}${percent} %)`:"(kein Vergleichswert)"}
  </span>;
}
function Metric({label,value,prev,icon:Icon,caption}:{label:string;value:number;prev:number;icon:typeof Eye;caption?:string}){
  return <Card className="p-5"><div className="flex items-start justify-between"><p className="text-sm font-medium text-muted-foreground">{label}</p><Icon className="h-5 w-5 text-primary-700"/></div>
    <p className="mt-3 font-display text-3xl font-bold tabular-nums">{value.toLocaleString("de-CH")}</p>
    <div className="mt-2 flex flex-wrap items-center gap-2"><Delta current={value} previous={prev}/><span className="text-xs text-muted-foreground">{caption??"zum Vorzeitraum"}</span></div></Card>;
}
function TrendChart({title,labels,values,color}:{title:string;labels:string[];values:number[];color:string}){
  const max=Math.max(1,...values),width=640,height=172;
  const points=values.map((v,i)=>`${20+i*(width-40)/Math.max(1,values.length-1)},${height-22-v/max*(height-40)}`).join(" ");
  return <Card className="min-w-0 p-5"><div className="flex items-center justify-between gap-3"><h2 className="font-display text-lg font-semibold">{title}</h2><span className="text-xs text-muted-foreground">Maximum {max.toLocaleString("de-CH")}/Tag</span></div>
  <svg className="mt-6 h-48 w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title+" Tagesverlauf"}>
    {[0,.25,.5,.75,1].map(k=><line key={k} x1="20" x2="620" y1={height-22-k*(height-40)} y2={height-22-k*(height-40)} stroke="currentColor" strokeOpacity=".10" strokeDasharray="4 5"/>)}
    <polyline points={points} fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
    {values.map((v,i)=><circle key={i} cx={20+i*(width-40)/Math.max(1,values.length-1)} cy={height-22-v/max*(height-40)} r="2.5" fill={color}><title>{labels[i]}: {v}</title></circle>)}
  </svg>
  <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{labels[0]}</span><span>{labels[Math.floor(labels.length/2)]}</span><span>{labels[labels.length-1]}</span></div></Card>;
}
function Bars({title,rows}:{title:string;rows:{label:string;value:number}[]}){
  const max=Math.max(1,...rows.map(r=>r.value));
  return <Card className="p-5"><h2 className="font-display text-lg font-semibold">{title}</h2><div className="mt-6 space-y-4">{rows.length?rows.map((r,i)=><div key={i}><div className="mb-1 flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate">{r.label}</span><strong className="shrink-0 tabular-nums">{r.value.toLocaleString("de-CH")}</strong></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:`${r.value/max*100}%`}}/></div></div>):<p className="text-sm text-muted-foreground">Für diesen Zeitraum liegen noch keine Daten vor.</p>}</div></Card>;
}
export async function PlatformAnalytics({role,days}:{role:Role;days:number}){
  const now=new Date(),start=new Date(now.getTime()-days*86400000),previous=new Date(start.getTime()-days*86400000);
  const [views,previousViews,visitors,previousVisitors,searches,previousSearches,newOrgs,oldOrgs,newUsers,oldUsers,orgs,events,activeSubs,dayRows,topOrgs,topEvents,topSearches,orgStatus,revenues]=await Promise.all([
    prisma.pageView.count({where:{interaction:"VIEW",createdAt:{gte:start}}}),
    prisma.pageView.count({where:{interaction:"VIEW",createdAt:{gte:previous,lt:start}}}),
    prisma.pageView.groupBy({by:["visitorHash"],where:{interaction:"VIEW",visitorHash:{not:null},createdAt:{gte:start}}}).then(x=>x.length),
    prisma.pageView.groupBy({by:["visitorHash"],where:{interaction:"VIEW",visitorHash:{not:null},createdAt:{gte:previous,lt:start}}}).then(x=>x.length),
    prisma.searchQuery.count({where:{createdAt:{gte:start}}}),
    prisma.searchQuery.count({where:{createdAt:{gte:previous,lt:start}}}),
    prisma.organization.count({where:{createdAt:{gte:start}}}),
    prisma.organization.count({where:{createdAt:{gte:previous,lt:start}}}),
    prisma.user.count({where:{createdAt:{gte:start}}}),
    prisma.user.count({where:{createdAt:{gte:previous,lt:start}}}),
    prisma.organization.count(),
    prisma.event.count({where:{createdAt:{gte:start}}}),
    prisma.subscription.count({where:{status:"ACTIVE"}}),
    prisma.$queryRaw<Daily[]>`SELECT day::timestamp as day, COALESCE(v.views,0)::bigint as views, COALESCE(s.searches,0)::bigint as searches
      FROM generate_series(${start}::date, ${now}::date, interval '1 day') AS day
      LEFT JOIN (SELECT date_trunc('day',"createdAt") AS d, count(*)::bigint AS views FROM "PageView" WHERE "createdAt">=${start} AND interaction='VIEW' GROUP BY 1) v ON v.d=day
      LEFT JOIN (SELECT date_trunc('day',"createdAt") AS d, count(*)::bigint AS searches FROM "SearchQuery" WHERE "createdAt">=${start} GROUP BY 1) s ON s.d=day
      ORDER BY day ASC`,
    prisma.pageView.groupBy({by:["organizationId"],where:{interaction:"VIEW",organizationId:{not:null},createdAt:{gte:start}},_count:{_all:true},orderBy:{_count:{organizationId:"desc"}},take:8}),
    prisma.pageView.groupBy({by:["eventId"],where:{interaction:"VIEW",eventId:{not:null},createdAt:{gte:start}},_count:{_all:true},orderBy:{_count:{eventId:"desc"}},take:8}),
    prisma.searchQuery.groupBy({by:["term"],where:{createdAt:{gte:start}},_count:{_all:true},orderBy:{_count:{term:"desc"}},take:8}),
    prisma.organization.groupBy({by:["status"],_count:{_all:true}}),
    can(role,"viewFinancialFigures")?prisma.payment.aggregate({where:{status:"PAID",createdAt:{gte:start}},_sum:{amountChf:true}}):Promise.resolve(null),
  ]);
  const orgIds=topOrgs.map(o=>o.organizationId).filter((v):v is string=>!!v),eventIds=topEvents.map(o=>o.eventId).filter((v):v is string=>!!v);
  const [names,eventNames]=await Promise.all([prisma.organization.findMany({where:{id:{in:orgIds}},select:{id:true,name:true}}),prisma.event.findMany({where:{id:{in:eventIds}},select:{id:true,title:true}})]);
  const orgMap=new Map(names.map(x=>[x.id,x.name])),eventMap=new Map(eventNames.map(x=>[x.id,x.title]));
  const dates=dayRows.map(r=>new Date(r.day).toLocaleDateString("de-CH",{day:"2-digit",month:"2-digit"}));
  const statusLabels:Record<string,string>={PUBLISHED:"Veröffentlicht",DRAFT:"Entwurf",PENDING_REVIEW:"In Prüfung",UNPUBLISHED:"Nicht veröffentlicht",SUSPENDED:"Gesperrt"};
  return <div className="space-y-6">
    <PageHeader title="Plattform-Statistik" description="Entwicklung, Reichweite und Wachstum – mit Vergleich zum unmittelbar vorherigen Zeitraum."/>
    <div className="flex flex-wrap items-center gap-2" aria-label="Zeitraum wählen">{[7,30,90].map(d=><Link key={d} href={`/dashboard/statistik?tage=${d}`} className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${d===days?"border-primary bg-primary text-primary-foreground":"bg-card hover:bg-muted"}`}>Letzte {d} Tage</Link>)}<span className="ml-auto text-xs text-muted-foreground">Stand {now.toLocaleDateString("de-CH")}</span></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Seitenaufrufe" value={views} prev={previousViews} icon={Eye}/>
      <Metric label="Pseudonyme Besucher" value={visitors} prev={previousVisitors} icon={Users} caption="Besucherkennungen, keine Personen"/>
      <Metric label="Suchanfragen" value={searches} prev={previousSearches} icon={Search}/>
      <Metric label="Neue Organisationen" value={newOrgs} prev={oldOrgs} icon={Building2}/>
      <Metric label="Neue Accounts" value={newUsers} prev={oldUsers} icon={Users}/>
      <Metric label="Neue Veranstaltungen" value={events} prev={0} icon={CalendarDays} caption="im ausgewählten Zeitraum erstellt"/>
      <Card className="p-5"><div className="flex justify-between text-sm text-muted-foreground"><span>Organisationen gesamt</span><Building2 className="h-5 w-5"/></div><p className="mt-3 text-3xl font-bold tabular-nums">{orgs.toLocaleString("de-CH")}</p><p className="mt-2 text-xs text-muted-foreground">{activeSubs} aktive Abonnemente</p></Card>
      {revenues?<Card className="p-5"><div className="flex justify-between text-sm text-muted-foreground"><span>Bezahlte Beträge</span><Activity className="h-5 w-5"/></div><p className="mt-3 text-3xl font-bold">{formatChf(Number(revenues._sum.amountChf??0))}</p><p className="mt-2 text-xs text-muted-foreground">Zahlungen im Zeitraum</p></Card>:null}
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      <TrendChart title="Seitenaufrufe im Verlauf" labels={dates} values={dayRows.map(r=>Number(r.views))} color="#0284c7"/>
      <TrendChart title="Suchaktivität im Verlauf" labels={dates} values={dayRows.map(r=>Number(r.searches))} color="#c2171f"/>
      <Bars title="Organisationsstatus" rows={orgStatus.map(x=>({label:statusLabels[x.status]??x.status,value:x._count._all})).sort((a,b)=>b.value-a.value)}/>
      <Bars title="Meistgesuchte Begriffe" rows={topSearches.map(x=>({label:x.term,value:x._count._all}))}/>
      <Bars title="Meistgesehene Organisationen" rows={topOrgs.map(x=>({label:orgMap.get(x.organizationId??"")??"Unbekannt",value:x._count._all}))}/>
      <Bars title="Meistgesehene Veranstaltungen" rows={topEvents.map(x=>({label:eventMap.get(x.eventId??"")??"Unbekannt",value:x._count._all}))}/>
    </div>
    <p className="text-xs leading-relaxed text-muted-foreground"><BarChart3 className="mr-1 inline h-3.5 w-3.5"/> Zuwachs/Verlust zeigt die Veränderung gegenüber dem gleich langen Vorzeitraum. Die Besucherzahl basiert auf pseudonymen, täglich wechselnden Kennungen und entspricht nicht zwingend eindeutigen Personen.</p>
  </div>;
}
