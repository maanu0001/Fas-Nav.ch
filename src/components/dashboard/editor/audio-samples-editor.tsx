"use client";
import * as React from "react";
import { apiRequest,errorMessage } from "@/lib/client-api";
type Sample={id:string;title:string;url:string;durationSeconds:number;sortOrder:number};
type Data={items:Sample[];limits:{count:number;seconds:number}};
export function AudioSamplesEditor({organizationId}:{organizationId:string}){
 const [data,setData]=React.useState<Data|null>(null);
 const [error,setError]=React.useState("");
 const [busy,setBusy]=React.useState(false);
 const [title,setTitle]=React.useState("");
 const [file,setFile]=React.useState<File|null>(null);
 const [start,setStart]=React.useState(0);
 const [seconds,setSeconds]=React.useState(30);
 const [rights,setRights]=React.useState(false);
 const reload=React.useCallback(async()=>{try{const next=await apiRequest<Data>("/api/organizations/"+organizationId+"/audio");setData(next);setSeconds(next.limits.seconds);}catch(e){setError(errorMessage(e));}},[organizationId]);
 React.useEffect(()=>{void reload();},[reload]);
 async function upload(e:React.FormEvent){e.preventDefault();if(!file)return;setBusy(true);setError("");try{
 const form=new FormData();form.set("file",file);form.set("title",title);form.set("start",String(start));form.set("seconds",String(seconds));form.set("rights",String(rights));
 await apiRequest("/api/organizations/"+organizationId+"/audio",{method:"POST",formData:form});setFile(null);setTitle("");await reload();
 }catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
 async function update(item:Sample,patch:Partial<Sample>){setBusy(true);setError("");try{await apiRequest("/api/organizations/"+organizationId+"/audio/"+item.id,{method:"PATCH",body:{title:patch.title??item.title,sortOrder:patch.sortOrder??item.sortOrder}});await reload();}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
 async function remove(item:Sample){if(!window.confirm("Hörprobe löschen?"))return;setBusy(true);try{await apiRequest("/api/organizations/"+organizationId+"/audio/"+item.id,{method:"DELETE"});await reload();}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
 return <div className="space-y-5">
 <div><h3 className="font-semibold">Hörproben</h3><p className="text-sm text-muted-foreground">Lade MP3-Dateien hoch und wähle den Ausschnitt, der öffentlich abgespielt wird. Die Originaldatei wird nicht gespeichert.</p></div>
 {error?<p role="alert" className="text-sm text-red-700">{error}</p>:null}
 <p className="text-sm">{data?data.items.length+" von "+data.limits.count+" Hörproben · maximal "+data.limits.seconds+" Sekunden pro Ausschnitt":"Wird geladen …"}</p>
 {data?.items.map((item)=><div key={item.id} className="space-y-2 rounded-xl border border-border p-4">
 <audio controls preload="none" className="w-full" src={item.url}/>
 <label className="block text-sm">Titel<input className="mt-1 block w-full rounded-lg border border-input bg-background p-2" defaultValue={item.title} key={item.id+item.title} onBlur={(e)=>{if(e.target.value.trim()!==item.title)void update(item,{title:e.target.value.trim()});}} /></label>
 <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} className="min-h-11 rounded-lg border px-3" onClick={()=>update(item,{sortOrder:Math.max(0,item.sortOrder-1)})}>Nach oben</button><button type="button" disabled={busy} className="min-h-11 rounded-lg border px-3" onClick={()=>update(item,{sortOrder:item.sortOrder+1})}>Nach unten</button><button type="button" disabled={busy} className="min-h-11 rounded-lg border px-3 text-red-700" onClick={()=>remove(item)}>Löschen</button></div>
 </div>)}
 {data&&data.items.length<data.limits.count?<form onSubmit={upload} className="space-y-3 rounded-xl border border-border p-4">
 <label className="block text-sm">Titel<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} className="mt-1 block w-full rounded-lg border border-input bg-background p-2"/></label>
 <label className="block text-sm">MP3 (max. 25 MB)<input required type="file" accept=".mp3,audio/mpeg" onChange={e=>setFile(e.target.files?.[0]??null)} className="mt-1 block w-full text-sm"/></label>
 <div className="grid grid-cols-2 gap-3"><label className="text-sm">Beginn (Sekunden)<input type="number" min="0" step="0.1" value={start} onChange={e=>setStart(Number(e.target.value))} className="mt-1 block w-full rounded-lg border p-2"/></label><label className="text-sm">Länge (Sekunden)<input type="number" min="1" max={data.limits.seconds} step="0.1" value={seconds} onChange={e=>setSeconds(Number(e.target.value))} className="mt-1 block w-full rounded-lg border p-2"/></label></div>
 <label className="flex gap-2 text-sm"><input type="checkbox" required checked={rights} onChange={e=>setRights(e.target.checked)}/>Ich bestätige, dass wir die erforderlichen Rechte zur Veröffentlichung dieser Musik besitzen.</label>
 <button disabled={busy||!file||!rights} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">{busy?"Wird verarbeitet …":"Hörprobe hinzufügen"}</button>
 </form>:null}
 </div>;
}
