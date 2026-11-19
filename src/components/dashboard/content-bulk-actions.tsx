"use client";
import * as React from "react";
import {useRouter} from "next/navigation";
import {apiRequest,errorMessage} from "@/lib/client-api";
type Item={id:string;name:string;organizationId:string|null;organizationName:string;status?:string};
export function ContentBulkActions({kind,items}:{kind:"EVENT"|"MEDIA";items:Item[]}){
 const router=useRouter();
 const [org,setOrg]=React.useState("");
 const [q,setQ]=React.useState("");
 const [selected,setSelected]=React.useState<string[]>([]);
 const [action,setAction]=React.useState("");
 const [preview,setPreview]=React.useState<number|null>(null);
 const [confirm,setConfirm]=React.useState(false);
 const [busy,setBusy]=React.useState(false);
 const [message,setMessage]=React.useState("");
 const orgs=[...new Map(items.filter(i=>i.organizationId).map(i=>[i.organizationId!,i.organizationName])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
 const visible=items.filter(i=>(!org||i.organizationId===org)&&(i.name+" "+i.organizationName).toLowerCase().includes(q.toLowerCase()));
 const actions=kind==="EVENT"?[["PUBLISH","Veröffentlichen"],["UNPUBLISH","Veröffentlichung aufheben"],["DRAFT","Als Entwurf markieren"],["SUSPEND","Sperren"],["FEATURE","Hervorheben"],["UNFEATURE","Hervorhebung entfernen"],["DELETE","Endgültig löschen"]]:[["TYPE_LOGO","Typ: Logo"],["TYPE_HEADER","Typ: Banner"],["TYPE_GALLERY","Typ: Galerie"],["TYPE_DOCUMENT","Typ: Dokument"],["DELETE","Unverknüpfte Dateien löschen"]];
 function reset(){setPreview(null);setConfirm(false);}
 async function run(dry:boolean){setBusy(true);setMessage("");try{const result=await apiRequest<{count:number}>("/api/admin/content-bulk",{method:"POST",body:{kind,ids:selected,action,preview:dry}});if(dry){setPreview(result.count);setConfirm(false);}else{setMessage(result.count+" Einträge bearbeitet.");setSelected([]);reset();router.refresh();}}catch(e){setMessage(errorMessage(e));reset();}finally{setBusy(false);}}
 return <section className="my-5 space-y-4 rounded-xl border bg-card p-4">
 <h2 className="font-semibold">Bulk-Actions · {kind==="EVENT"?"Agenda":"Medien"}</h2>
 <p className="text-xs text-muted-foreground">Bis zu 100 Einträge auswählen. Jede Änderung wird protokolliert. Löschen ist endgültig; verknüpfte Medien sind geschützt.</p>
 <div className="grid gap-2 sm:grid-cols-2"><select aria-label="Organisation filtern" value={org} onChange={e=>{setOrg(e.target.value);reset();}} className="rounded-lg border bg-background p-2 text-sm"><option value="">Alle Organisationen</option>{orgs.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select><input aria-label="Einträge suchen" placeholder="Titel, Datei oder Organisation suchen" value={q} onChange={e=>setQ(e.target.value)} className="rounded-lg border bg-background p-2 text-sm"/></div>
 <div className="flex items-center gap-3 text-sm"><button type="button" className="underline" onClick={()=>{setSelected(s=>[...new Set([...s,...visible.map(i=>i.id)])].slice(0,100));reset();}}>Sichtbare auswählen</button><button type="button" className="underline" onClick={()=>{setSelected(s=>s.filter(id=>!visible.some(i=>i.id===id)));reset();}}>Sichtbare abwählen</button><span>{selected.length} ausgewählt</span></div>
 <div className="max-h-52 space-y-1 overflow-auto rounded-lg border p-2">{visible.map(item=><label key={item.id} className="flex items-center gap-2 rounded p-1 text-sm hover:bg-muted"><input type="checkbox" checked={selected.includes(item.id)} onChange={e=>{setSelected(s=>e.target.checked?[...s,item.id].slice(0,100):s.filter(id=>id!==item.id));reset();}}/><span className="min-w-0 flex-1 truncate">{item.name}</span><span className="max-w-36 truncate text-xs text-muted-foreground">{item.organizationName}</span></label>)}{!visible.length?<p className="p-2 text-sm">Keine Einträge gefunden.</p>:null}</div>
 <div className="flex flex-wrap items-center gap-2"><select aria-label="Bulk-Aktion" className="min-w-48 rounded-lg border bg-background p-2 text-sm" value={action} onChange={e=>{setAction(e.target.value);reset();}}><option value="">Aktion wählen</option>{actions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><button disabled={busy||!action||!selected.length} onClick={()=>void run(true)} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Vorschau prüfen</button></div>
 {preview!==null?<div className="space-y-2 rounded-lg border p-3 text-sm"><strong>{preview} Einträge betroffen · {actions.find(a=>a[0]===action)?.[1]}</strong><label className="flex gap-2"><input type="checkbox" checked={confirm} onChange={e=>setConfirm(e.target.checked)}/>Ich bestätige diese {action==="DELETE"?"endgültige Löschung":"Massenänderung"}.</label><button disabled={busy||!confirm} onClick={()=>void run(false)} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">Jetzt ausführen</button></div>:null}
 {message?<p role="status" className="text-sm">{message}</p>:null}
 </section>;
}
