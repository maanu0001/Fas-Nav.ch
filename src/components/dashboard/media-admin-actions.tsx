"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
const TYPES=["LOGO","HEADER","GALLERY","SPONSOR","EVENT","HOMEPAGE","DOCUMENT"] as const;
export function MediaAdminDelete({id,type,organizationId,name,category,alt,caption}:{id:string;type:"image"|"audio";organizationId?:string;name:string;category?:string;alt?:string|null;caption?:string|null}){
 const router=useRouter();const [busy,setBusy]=React.useState(false);const [error,setError]=React.useState("");const [edit,setEdit]=React.useState(false);
 const [title,setTitle]=React.useState(name);const [description,setDescription]=React.useState(caption||"");const [alternative,setAlternative]=React.useState(alt||"");const [mediaType,setMediaType]=React.useState(category||"GALLERY");
 const url=type==="audio"?`/api/organizations/${organizationId}/audio/${id}`:`/api/media/${id}`;
 async function request(method:"PATCH"|"DELETE",body?:unknown){setBusy(true);setError("");try{const res=await fetch(url,{method,headers:body?{"Content-Type":"application/json"}:undefined,body:body?JSON.stringify(body):undefined});if(!res.ok){const data=await res.json().catch(()=>({}));throw new Error(data.error||"Aktion fehlgeschlagen.");}router.refresh();setEdit(false);}catch(e){setError(e instanceof Error?e.message:"Fehler");}finally{setBusy(false);}}
 async function remove(){if(!window.confirm(`„${name}“ dauerhaft löschen? Noch verknüpfte Medien können nicht gelöscht werden.`))return;await request("DELETE");}
 async function save(){if(type==="audio"){await request("PATCH",{title:title.trim()});}else{await request("PATCH",{alt:alternative,caption:description,type:mediaType});}}
 return <div className="mt-3 space-y-2">
 {edit?<div className="space-y-2 rounded-lg border bg-muted/40 p-2">{type==="audio"?<label className="block text-xs">Titel<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={120} className="mt-1 w-full rounded border bg-background p-1.5"/></label>:<><label className="block text-xs">Bildbeschreibung<input value={alternative} onChange={e=>setAlternative(e.target.value)} maxLength={200} className="mt-1 w-full rounded border bg-background p-1.5"/></label><label className="block text-xs">Bildunterschrift<input value={description} onChange={e=>setDescription(e.target.value)} maxLength={300} className="mt-1 w-full rounded border bg-background p-1.5"/></label><label className="block text-xs">Kategorie<select value={mediaType} onChange={e=>setMediaType(e.target.value)} className="mt-1 w-full rounded border bg-background p-1.5">{TYPES.map(t=><option key={t} value={t}>{t}</option>)}</select></label></>}<button type="button" onClick={save} disabled={busy||(!title.trim()&&type==="audio")} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white">Speichern</button></div>:null}
 <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={()=>setEdit(v=>!v)} className="rounded-lg border px-3 py-1.5 text-xs font-medium">{edit?"Abbrechen":"Bearbeiten"}</button><button type="button" disabled={busy} onClick={remove} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">{busy?"Bitte warten …":"Löschen"}</button></div>
 {error?<p role="alert" className="text-xs text-red-600">{error}</p>:null}
 </div>;
}
