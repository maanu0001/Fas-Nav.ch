"use client";
import * as React from "react";
import Link from "next/link";
import { apiRequest,errorMessage } from "@/lib/client-api";
type Org={id:string;name:string;type:"CARNIVAL"|"GUGGE";status:string;logoId:string|null;headerId:string|null};
type Uploaded={id:string;url:string};
export function BulkActions(){
 const [orgs,setOrgs]=React.useState<Org[]>([]);
 const [type,setType]=React.useState("ALL");
 const [query,setQuery]=React.useState("");
 const [excluded,setExcluded]=React.useState<string[]>([]);
 const [logo,setLogo]=React.useState<Uploaded|null>(null);
 const [header,setHeader]=React.useState<Uploaded|null>(null);
 const [status,setStatus]=React.useState("");
 const [verification,setVerification]=React.useState("");
 const [review,setReview]=React.useState(false);
 const [busy,setBusy]=React.useState(false);
 const [message,setMessage]=React.useState("");
 const [preview,setPreview]=React.useState<{count:number}|null>(null);
 const [confirm,setConfirm]=React.useState(false);
 React.useEffect(()=>{apiRequest<Org[]>("/api/admin/organization-bulk").then(setOrgs).catch(e=>setMessage(errorMessage(e)));},[]);
 const scoped=orgs.filter(o=>type==="ALL"||o.type===type);
 const selected=scoped.filter(o=>!excluded.includes(o.id));
 const visible=scoped.filter(o=>o.name.toLowerCase().includes(query.toLowerCase()));
 function invalidate(){setPreview(null);setConfirm(false);}
 async function upload(file:File|undefined,kind:"LOGO"|"HEADER"){
   if(!file)return;setBusy(true);setMessage("");invalidate();
   try{const form=new FormData();form.append("file",file);form.append("type",kind);
   const media=await apiRequest<Uploaded>("/api/media",{method:"POST",formData:form});
   if(kind==="LOGO")setLogo(media);else setHeader(media);
   }catch(e){setMessage(errorMessage(e));}finally{setBusy(false);}
 }
 function payload(dry:boolean){return {type,excludedIds:excluded,logoId:logo?.id,headerId:header?.id,
 status:status||undefined,verification:verification||undefined,needsManualReview:review?true:undefined,preview:dry};}
 async function run(dry:boolean){
   setBusy(true);setMessage("");
   try{const result=await apiRequest<{count:number;batchId?:string}>("/api/admin/organization-bulk",{method:"POST",body:payload(dry)});
     if(dry){setPreview(result);setConfirm(false);}else{setMessage(result.count+" Organisationen erfolgreich aktualisiert. Vorgang: "+result.batchId);setPreview(null);setConfirm(false);setOrgRefresh();}
   }catch(e){setMessage(errorMessage(e));}finally{setBusy(false);}
 }
 function setOrgRefresh(){apiRequest<Org[]>("/api/admin/organization-bulk").then(setOrgs).catch(()=>{});}
 return <div className="space-y-6">
  <div><Link href="/dashboard/organisationen" className="text-sm underline">← Organisationen</Link><h1 className="mt-3 text-3xl font-bold">Bulk-Actions</h1><p className="text-muted-foreground">Massenänderungen mit Ausschlüssen, Vorschau und Audit-Log. Bestehende Bilder bleiben zur Prüfung erhalten.</p></div>
  {message?<p role="status" className="rounded-lg border p-3">{message}</p>:null}
  <section className="space-y-3 rounded-xl border p-5"><h2 className="text-lg font-bold">1. Organisationen auswählen</h2>
  <label className="block">Organisationstyp<select className="mt-1 block w-full rounded border p-2" value={type} onChange={e=>{setType(e.target.value);invalidate();}}><option value="ALL">Alle</option><option value="CARNIVAL">Fasnachten</option><option value="GUGGE">Guggen</option></select></label>
  <p className="font-medium">{selected.length} von {scoped.length} Organisationen ausgewählt</p>
  <input placeholder="Organisation suchen …" value={query} onChange={e=>setQuery(e.target.value)} className="w-full rounded border p-2"/>
  <div className="flex gap-2"><button type="button" className="rounded border px-3 py-2" onClick={()=>{setExcluded(excluded.filter(id=>!scoped.some(o=>o.id===id)));invalidate();}}>Alle auswählen</button><button type="button" className="rounded border px-3 py-2" onClick={()=>{setExcluded([...new Set([...excluded,...scoped.map(o=>o.id)])]);invalidate();}}>Alle abwählen</button></div>
  <div className="max-h-80 space-y-2 overflow-y-auto rounded border p-3">{visible.map(o=><label key={o.id} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={!excluded.includes(o.id)} onChange={e=>{setExcluded(v=>e.target.checked?v.filter(id=>id!==o.id):[...v,o.id]);invalidate();}}/><span>{o.name}</span><span className="ml-auto text-muted-foreground">{o.type==="GUGGE"?"Gugge":"Fasnacht"}</span></label>)}</div></section>
  <section className="space-y-4 rounded-xl border p-5"><h2 className="text-lg font-bold">2. Änderungen auswählen</h2>
  <div className="grid gap-5 md:grid-cols-2">{(["LOGO","HEADER"] as const).map(kind=>{const value=kind==="LOGO"?logo:header;return <label key={kind} className="block space-y-2"><span className="font-medium">{kind==="LOGO"?"Logo ersetzen":"Banner ersetzen"}</span><input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>{void upload(e.target.files?.[0],kind);e.target.value="";}} className="block w-full text-sm"/>{value?<div><img src={value.url} alt="Vorschau Ersatzbild" className="max-h-48 w-full rounded border object-contain"/><button type="button" className="mt-2 rounded border px-3 py-1" onClick={()=>{kind==="LOGO"?setLogo(null):setHeader(null);invalidate();}}>Bild entfernen</button></div>:null}</label>;})}</div>
  <label className="block">Veröffentlichungsstatus (optional)<select className="mt-1 block w-full rounded border p-2" value={status} onChange={e=>{setStatus(e.target.value);invalidate();}}><option value="">Unverändert</option>{["DRAFT","PENDING_REVIEW","PUBLISHED","UNPUBLISHED","SUSPENDED"].map(v=><option key={v} value={v}>{v}</option>)}</select></label>
  <label className="block">Verifizierung (optional)<select className="mt-1 block w-full rounded border p-2" value={verification} onChange={e=>{setVerification(e.target.value);invalidate();}}><option value="">Unverändert</option>{["UNVERIFIED","VERIFIED","OFFICIAL"].map(v=><option key={v} value={v}>{v}</option>)}</select></label>
  <label className="flex items-center gap-2"><input type="checkbox" checked={review} onChange={e=>{setReview(e.target.checked);invalidate();}}/>Zur manuellen Prüfung markieren</label>
  </section>
  <section className="space-y-3 rounded-xl border p-5"><h2 className="text-lg font-bold">3. Vorschau und Ausführung</h2>
  <p className="text-sm text-muted-foreground">Nicht ausgewählte Felder bleiben unverändert. Die bisherigen Medienzuordnungen werden im Audit-Log gespeichert. Alte Bild-URLs können weiterhin erreichbar sein und müssen gesondert bereinigt werden.</p>
  <button type="button" disabled={busy||selected.length===0||(!logo&&!header&&!status&&!verification&&!review)} onClick={()=>void run(true)} className="rounded border px-5 py-3">Änderungen prüfen</button>
  {preview?<div className="space-y-3 rounded-lg bg-secondary p-4"><p className="font-semibold">{preview.count} Organisationen werden aktualisiert.</p><label className="flex items-start gap-2"><input type="checkbox" checked={confirm} onChange={e=>setConfirm(e.target.checked)}/>Ich bestätige die Massenänderung an den ausgewählten Organisationen.</label><button type="button" disabled={!confirm||busy} onClick={()=>void run(false)} className="rounded bg-primary px-5 py-3 text-primary-foreground">Jetzt ausführen</button></div>:null}</section>
 </div>;
}
