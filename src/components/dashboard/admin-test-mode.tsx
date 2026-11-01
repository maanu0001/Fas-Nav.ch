"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, LogOut, Search } from "lucide-react";
import { apiRequest, errorMessage } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";

export function StartOrganizationTestMode({ organizationId }: { organizationId: string }) {
 const router=useRouter();const{toast}=useToast();const[pending,setPending]=React.useState(false);
 async function start(){setPending(true);try{await apiRequest("/api/admin/testmodus",{method:"POST",body:{organizationId}});router.push("/dashboard");router.refresh()}catch(e){toast(errorMessage(e),"error")}finally{setPending(false)}}
 return <button type="button" onClick={start} disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted disabled:opacity-50"><Eye className="h-4 w-4"/>{pending?"Wird geöffnet …":"Als Organisation testen"}</button>;
}

export type TestModeOrganization={id:string;name:string;type:string;city:string|null;status:string};
export function TestModeOrganizationList({organizations}:{organizations:TestModeOrganization[]}){
 const[query,setQuery]=React.useState("");const normalized=query.trim().toLocaleLowerCase("de-CH");
 const filtered=React.useMemo(()=>normalized?organizations.filter(org=>[org.name,org.city??"",org.type==="CARNIVAL"?"Fasnacht":"Gugge",org.status].some(value=>value.toLocaleLowerCase("de-CH").includes(normalized))):organizations,[organizations,normalized]);
 return <div className="overflow-hidden rounded-xl border border-border bg-card"><div className="border-b border-border p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-semibold">Organisation auswählen</p><p className="text-sm text-muted-foreground">{normalized?`${filtered.length} von ${organizations.length} Organisationen`:`${organizations.length} Organisationen verfügbar`}</p></div><label className="relative block w-full sm:max-w-sm"><span className="sr-only">Organisation suchen</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Organisation oder Ort suchen …" className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"/></label></div></div><div className="divide-y divide-border">{filtered.length?filtered.map(org=><div key={org.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate font-medium">{org.name}</p><p className="text-sm text-muted-foreground">{org.type==="CARNIVAL"?"Fasnacht":"Gugge"}{org.city?` · ${org.city}`:""} · {org.status}</p></div><StartOrganizationTestMode organizationId={org.id}/></div>):<div className="p-8 text-center"><Search className="mx-auto mb-2 h-5 w-5 text-muted-foreground"/><p className="font-medium">Keine Organisation gefunden</p><p className="mt-1 text-sm text-muted-foreground">Versuche einen anderen Namen oder Ort.</p></div>}</div></div>;
}

export function AdminTestModeBanner({ organizationName }: { organizationName: string }) {
 const router=useRouter();const{toast}=useToast();const[pending,setPending]=React.useState(false);
 async function stop(){setPending(true);try{await apiRequest("/api/admin/testmodus",{method:"DELETE"});router.push("/dashboard/organisationen");router.refresh()}catch(e){toast(errorMessage(e),"error")}finally{setPending(false)}}
 return <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-950"><div className="flex items-center gap-2"><Eye className="h-4 w-4"/><strong>Testmodus</strong><span>Du nutzt Fas-Nav als „{organizationName}“.</span></div><button type="button" onClick={stop} disabled={pending} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-amber-950 px-3 font-semibold text-white disabled:opacity-50"><LogOut className="h-4 w-4"/>{pending?"Wird beendet …":"Testmodus beenden"}</button></div>;
}
