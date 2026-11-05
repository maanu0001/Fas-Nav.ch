"use client";
import * as React from "react";
import { useRouter } from "next/navigation";

export function MediaAdminDelete({id,type,organizationId,name}:{id:string;type:"image"|"audio";organizationId?:string;name:string}){
 const router=useRouter();const [busy,setBusy]=React.useState(false);const [error,setError]=React.useState("");
 async function remove(){
  if(!window.confirm(`„${name}“ dauerhaft löschen? Verwendete Dateien können dadurch auf Seiten fehlen.`))return;
  setBusy(true);setError("");
  try{
   const url=type==="audio"?`/api/organizations/${organizationId}/audio/${id}`:`/api/media/${id}`;
   const res=await fetch(url,{method:"DELETE"});
   if(!res.ok){const data=await res.json().catch(()=>({}));throw new Error(data.error||"Löschen fehlgeschlagen.");}
   router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Fehler beim Löschen");}finally{setBusy(false);}
 }
 return <div className="mt-3"><button type="button" disabled={busy} onClick={remove} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">{busy?"Wird gelöscht …":"Löschen"}</button>{error?<p role="alert" className="mt-1 text-xs text-red-600">{error}</p>:null}</div>;
}
