"use client";
import * as React from "react";
import { MarketplaceManager, type Listing } from "@/components/marketplace/manager";
import { apiRequest, errorMessage } from "@/lib/client-api";

type Organization = { id: string; name: string };
type Result = { items: Listing[]; total: number; page: number; perPage: number };
export function AdminMarketplaceBrowser({ organizations, limitsByOrg }: {
  organizations: Organization[];
  limitsByOrg: Record<string, {tier:string;active:number;images:number;days:number;externalContact:boolean;featured:boolean}>;
}) {
  const [search, setSearch] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [organizationId, setOrganizationId] = React.useState("");
  const [status, setStatus] = React.useState("ALL");
  const [page, setPage] = React.useState(1);
  const [result, setResult] = React.useState<Result | null>(null);
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const url = React.useMemo(() => {
    const p = new URLSearchParams({page:String(page),status});
    if (query) p.set("q",query);
    if (organizationId) p.set("organizationId",organizationId);
    return "/api/boerse/admin?" + p.toString();
  },[query,organizationId,status,page]);
  React.useEffect(()=>{
    let live=true; setBusy(true);setError("");
    apiRequest<Result>(url).then(r=>{if(live)setResult(r);}).catch(err=>{if(live)setError(errorMessage(err));}).finally(()=>{if(live)setBusy(false);});
    return ()=>{live=false;};
  },[url]);
  return <section className="space-y-4 border-t pt-7">
    <div><h2 className="font-display text-xl font-semibold">Alle weiteren Inserate</h2><p className="text-sm text-muted-foreground">Veröffentlichte Inserate und Entwürfe aller anderen Organisationen durchsuchen und verwalten.</p></div>
    <form onSubmit={e=>{e.preventDefault();setPage(1);setQuery(search.trim());}} className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_1fr_auto_auto]">
      <label className="text-sm font-medium">Organisation
        <select className="mt-1 block w-full rounded-lg border bg-background p-2" value={organizationId} onChange={e=>{setPage(1);setOrganizationId(e.target.value);}}>
          <option value="">Alle Organisationen</option>{organizations.map(org=><option key={org.id} value={org.id}>{org.name}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium">Suche
        <input type="search" placeholder="Titel oder Organisation" value={search} onChange={e=>setSearch(e.target.value)} className="mt-1 block w-full rounded-lg border bg-background p-2"/>
      </label>
      <label className="text-sm font-medium">Status
        <select className="mt-1 block w-full rounded-lg border bg-background p-2" value={status} onChange={e=>{setPage(1);setStatus(e.target.value);}}>
          <option value="ALL">Entwürfe und veröffentlicht</option><option value="ACTIVE">Veröffentlicht</option><option value="DRAFT">Entwürfe</option>
        </select>
      </label>
      <button className="self-end rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Suchen</button>
    </form>
    {error?<p role="alert" className="rounded-lg border p-3 text-sm">{error}</p>:null}
    <p className="text-sm text-muted-foreground">{busy?"Inserate werden geladen …":result ? result.total+" Inserate gefunden":""}</p>
    {result&&!busy?<MarketplaceManager key={url} organizations={organizations} initial={result.items} staff limitsByOrg={limitsByOrg} adminBrowseUrl={url} adminOther/>:null}
    {result&&result.total>result.perPage?<nav aria-label="Inserat-Seiten" className="flex items-center justify-between gap-3">
      <button type="button" disabled={page<=1||busy} onClick={()=>setPage(v=>Math.max(1,v-1))} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40">Zurück</button>
      <span className="text-sm">Seite {page} von {Math.ceil(result.total/result.perPage)}</span>
      <button type="button" disabled={page*result.perPage>=result.total||busy} onClick={()=>setPage(v=>v+1)} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-40">Weiter</button>
    </nav>:null}
  </section>;
}
