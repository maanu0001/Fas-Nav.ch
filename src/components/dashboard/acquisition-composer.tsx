"use client";
import * as React from "react";
import { ArrowLeft, Send } from "lucide-react";
import type { EmailTemplateView } from "@/lib/email-template-config";

type Kind="CARNIVAL"|"GUGGE";
const IDS:Record<Kind,string>={CARNIVAL:"acquisition_carnival",GUGGE:"acquisition_gugge"};
function render(source:string,values:Record<string,string>){return source.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g,(_match,name:string)=>values[name]??"");}
export function AcquisitionComposer({onClose,onSent}:{onClose:()=>void;onSent:()=>Promise<void>}){
 const [type,setType]=React.useState<Kind>("CARNIVAL");
 const [to,setTo]=React.useState("");
 const [name,setName]=React.useState("");
 const [templates,setTemplates]=React.useState<EmailTemplateView[]>([]);
 const [busy,setBusy]=React.useState(false);
 const [error,setError]=React.useState("");
 const [success,setSuccess]=React.useState("");
 React.useEffect(()=>{let active=true;fetch("/api/settings/email-templates",{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error("Vorlagen konnten nicht geladen werden.");return r.json();}).then((v:EmailTemplateView[])=>{if(active)setTemplates(v);}).catch(e=>{if(active)setError(e.message)});return()=>{active=false;};},[]);
 const template=templates.find(x=>x.id===IDS[type]);
 const values={organizationName:name.trim()||"Ihre Organisation",websiteUrl:"https://fas-nav.ch"};
 const subject=template?render(template.subject,values):"";
 const text=template?render(template.body,values):"";
 async function submit(event:React.FormEvent){
  event.preventDefault();if(!template||!template.enabled)return;
  setBusy(true);setError("");setSuccess("");
  try{
   const response=await fetch("/api/mail-center",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"acquisition",to:to.trim(),type,organizationName:name.trim()})});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||"Die Akquise-Mail konnte nicht verschickt werden.");
   await onSent();
   setSuccess("Die Akquise-Mail wurde versendet und im Mail Center gespeichert.");
   setTo("");setName("");
  }catch(e){setError(e instanceof Error?e.message:"Versand fehlgeschlagen.");}finally{setBusy(false);}
 }
 return <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
  <div className="flex items-center gap-3 border-b border-border px-4 py-4 sm:px-6"><button type="button" onClick={onClose} className="rounded-xl border p-2" aria-label="Zurück zur Mailübersicht"><ArrowLeft className="h-5 w-5"/></button><div><h2 className="font-display text-lg font-bold">Neue Akquise</h2><p className="text-xs text-muted-foreground">Neue Organisation persönlich auf Fas-Nav.ch aufmerksam machen</p></div></div>
  <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.2fr)]">
   <form id="acquisition-form" onSubmit={submit} className="space-y-4">
    <label className="block text-sm font-semibold">Empfängeradresse<input type="email" required autoComplete="email" value={to} onChange={e=>setTo(e.target.value)} placeholder="kontakt@organisation.ch" className="mt-1.5 w-full min-w-0 rounded-xl border border-border bg-background px-4 py-3 font-normal"/></label>
    <label className="block text-sm font-semibold">Art der Organisation<select value={type} onChange={e=>setType(e.target.value as Kind)} className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 font-normal"><option value="CARNIVAL">Fasnachtsorganisation</option><option value="GUGGE">Guggenmusik</option></select></label>
    <label className="block text-sm font-semibold">Name der Organisation (optional)<input value={name} onChange={e=>setName(e.target.value)} maxLength={120} placeholder="z. B. Gugge Musterstadt" className="mt-1.5 w-full rounded-xl border border-border bg-background px-4 py-3 font-normal"/></label>
    <p className="text-xs leading-relaxed text-muted-foreground">Die Vorschau nutzt die aktuell gespeicherte Akquise-Vorlage. Anpassungen machst du unter <a className="font-semibold text-primary underline" href="/dashboard/e-mails">E-Mail Templates</a>. Versende ausschliesslich gezielte Anfragen mit berechtigtem Interesse; respektiere Abmeldungen und widersprechende Empfängerwünsche.</p>
    {error?<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>:null}
    {success?<p role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">{success}</p>:null}
    <button type="submit" disabled={busy||!template?.enabled||!to.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4"/>{busy?"Wird versendet …":"Akquise-Mail senden"}</button>
   </form>
   <div className="min-w-0"><p className="mb-3 text-sm font-semibold">Vorschau der E-Mail</p><div className="overflow-hidden rounded-2xl border border-border bg-white text-slate-800 shadow-sm"><header className="border-b p-5 text-center"><img src="/brand/fas-nav-logo-transparent.png" alt="Fas-Nav.ch" className="mx-auto h-16 w-auto object-contain"/><p className="mt-2 text-[11px] tracking-widest text-slate-500">DIE SCHWEIZER FASNACHT AUF EINEN BLICK</p></header><div className="space-y-4 p-5"><p className="break-words text-lg font-bold">{subject||"Vorlage wird geladen …"}</p><p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{text}</p></div><footer className="space-y-2 bg-slate-900 p-5 text-xs text-slate-200"><strong className="text-white">Fas-Nav.ch</strong><p>Fasnacht entdecken, organisieren und gemeinsam erleben.</p><p>fas-nav.ch</p></footer></div></div>
  </div>
 </section>;
}
