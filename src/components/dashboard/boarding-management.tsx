"use client";
import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Send, ShieldCheck } from "lucide-react";
import type { EmailTemplateView } from "@/lib/email-template-config";
type Organization={id:string;name:string;type:string;slug:string;claimStatus:string};
type Invitation={id:string;email:string;contactName:string|null;status:string;expiresAt:string;sentAt:string;acceptedAt:string|null;openedAt:string|null;openCount:number;organization:{name:string};user:{name:string;email:string}|null};
const STATUS:Record<string,string>={SENT:"Einladung versendet",PENDING:"Wartet auf Freigabe",APPROVED:"Freigegeben",REJECTED:"Abgelehnt",REVOKED:"Widerrufen"};
export function BoardingManagement({compact=false,onClose,onSent}:{compact?:boolean;onClose?:()=>void;onSent?:()=>Promise<void>}){
 const [organizations,setOrganizations]=React.useState<Organization[]>([]);
 const [invitations,setInvitations]=React.useState<Invitation[]>([]);
 const [templates,setTemplates]=React.useState<EmailTemplateView[]>([]);
 const [organizationId,setOrganizationId]=React.useState(""),[email,setEmail]=React.useState(""),[contactName,setContactName]=React.useState("");
 const [filter,setFilter]=React.useState(""),[busy,setBusy]=React.useState(false),[error,setError]=React.useState(""),[notice,setNotice]=React.useState("");
 async function load(){
  const [res,temp]=await Promise.all([fetch("/api/admin/boarding",{cache:"no-store"}),fetch("/api/settings/email-templates",{cache:"no-store"})]);
  if(!res.ok||!temp.ok)throw new Error("Boarding-Daten konnten nicht geladen werden.");
  const data=await res.json();setOrganizations(data.organizations);setInvitations(data.invitations);setTemplates(await temp.json());
 }
 React.useEffect(()=>{void load().catch(e=>setError(e.message));},[]);
 const filtered=organizations.filter(o=>o.name.toLowerCase().includes(filter.toLowerCase())).slice(0,100);
 const org=organizations.find(o=>o.id===organizationId);
 const template=templates.find(t=>t.id==="boarding_invite");
 const values:Record<string,string>={contactName:contactName||"zusammen",organizationName:org?.name||"Ihre Organisation",invitationUrl:"https://fas-nav.ch/boarding/[persönlicher-link]"};
 const preview=(v:string)=>v.replace(/{{\s*(\w+)\s*}}/g,(_m,k:string)=>values[k]||"");
 async function create(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError("");setNotice("");
  try{
   const res=await fetch("/api/admin/boarding",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({organizationId,email,contactName})});
   const data=await res.json();if(!res.ok)throw new Error(data.error||"Einladung konnte nicht gesendet werden.");
   setNotice("Persönliche Boarding-Mail versendet. Die Einladung wurde gespeichert.");setEmail("");setContactName("");
   await load();await onSent?.();
  }catch(e){setError(e instanceof Error?e.message:"Fehler beim Versand.");}finally{setBusy(false);}
 }
 async function update(id:string,action:"approve"|"reject"|"revoke"){
  if(action==="approve"&&!window.confirm("Zugriff auf diese Organisation wirklich freigeben?"))return;
  if(action==="reject"&&!window.confirm("Übernahmeanfrage ablehnen?"))return;
  setBusy(true);setError("");setNotice("");
  try{const res=await fetch("/api/admin/boarding/"+encodeURIComponent(id),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({action})});const data=await res.json();if(!res.ok)throw new Error(data.error||"Aktion fehlgeschlagen.");setNotice("Status aktualisiert.");await load();}
  catch(e){setError(e instanceof Error?e.message:"Fehler.");}finally{setBusy(false);}
 }
 return <section className="space-y-5 rounded-2xl border bg-card p-4 sm:p-6">
  <div className="flex items-start gap-3">{onClose?<button type="button" className="rounded-xl border p-2" onClick={onClose} aria-label="Zurück zu Mails"><ArrowLeft className="h-5 w-5"/></button>:null}<div className="flex-1"><h2 className="font-display text-xl font-bold">Boarding Mail</h2><p className="text-sm text-muted-foreground">Organisation persönlich einladen. Zugang wird erst nach deiner Freigabe erteilt.</p></div><Link href="/dashboard/e-mails" className="text-xs font-semibold text-primary underline">Template bearbeiten</Link></div>
  {error?<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>:null}{notice?<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>:null}
  <div className="grid gap-5 lg:grid-cols-2"><form onSubmit={create} className="space-y-3">
   <label className="block text-sm font-semibold">Organisation suchen<input value={filter} onChange={e=>setFilter(e.target.value)} className="mt-1 block w-full rounded-xl border bg-background px-3 py-3 font-normal" placeholder="Name der Organisation"/></label>
   <label className="block text-sm font-semibold">Organisation auswählen<select required value={organizationId} onChange={e=>setOrganizationId(e.target.value)} className="mt-1 block w-full rounded-xl border bg-background px-3 py-3 font-normal"><option value="">Bitte auswählen</option>{filtered.map(o=><option key={o.id} value={o.id}>{o.name} · {o.type==="GUGGE"?"Gugge":"Fasnacht"}</option>)}</select></label>
   <label className="block text-sm font-semibold">E-Mail-Adresse<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="kontakt@organisation.ch" className="mt-1 block w-full rounded-xl border bg-background px-3 py-3 font-normal"/></label>
   <label className="block text-sm font-semibold">Kontaktperson (optional)<input value={contactName} onChange={e=>setContactName(e.target.value)} maxLength={100} className="mt-1 block w-full rounded-xl border bg-background px-3 py-3 font-normal"/></label>
   <p className="text-xs text-muted-foreground">Der Link ist 14 Tage gültig. Die E-Mail-Adresse ist beim Registrieren vorausgefüllt und kann geändert werden. Die Übernahme bestätigst du manuell.</p>
   <button disabled={busy||!organizationId||!email||!template?.enabled} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"><Send className="h-4 w-4"/>Boarding-Mail versenden</button>
  </form><div className="min-w-0"><p className="mb-2 text-sm font-semibold">E-Mail-Vorschau</p><div className="overflow-hidden rounded-xl border bg-white text-slate-800"><div className="border-b p-5 text-center"><img src="/brand/fas-nav-logo-transparent.png" alt="Fas-Nav.ch" className="mx-auto h-16 w-auto object-contain"/><p className="mt-2 text-xs text-slate-500">Schweizer Fasnacht</p></div><div className="space-y-4 p-5"><h3 className="font-bold">{template?preview(template.subject):"Vorlage wird geladen …"}</h3><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{template?preview(template.body):""}</p></div></div></div></div>
  {!compact?<div className="space-y-3 border-t pt-5"><h3 className="font-semibold">Boarding-Einladungen und Freigaben</h3><div className="space-y-2">{invitations.map(v=><article key={v.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"><div className="min-w-0"><strong className="block text-sm">{v.organization.name}</strong><p className="break-all text-xs text-muted-foreground">{v.email} · {v.contactName||"Ohne Anrede"}</p><p className="text-xs text-primary">{STATUS[v.status]||v.status}{v.openCount>0?" · Link geöffnet: "+v.openCount+"× · zuletzt "+new Date(v.openedAt||v.sentAt).toLocaleString("de-CH"):" · Noch nicht geöffnet"}{v.status==="SENT"&&new Date(v.expiresAt)<new Date()?" · Abgelaufen":""}</p></div><div className="flex flex-wrap gap-2">{v.status==="PENDING"?<><button disabled={busy} onClick={()=>void update(v.id,"approve")} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white"><ShieldCheck className="h-4 w-4"/>Freigeben</button><button disabled={busy} onClick={()=>void update(v.id,"reject")} className="rounded-lg border px-3 py-2 text-xs">Ablehnen</button></>:null}{v.status==="SENT"?<button disabled={busy} onClick={()=>void update(v.id,"revoke")} className="rounded-lg border px-3 py-2 text-xs">Widerrufen</button>:null}</div></article>)}{!invitations.length?<p className="text-sm text-muted-foreground">Noch keine Einladungen verschickt.</p>:null}</div></div>:<Link className="inline-block text-sm font-semibold text-primary underline" href="/dashboard/boarding">Einladungen und Freigaben verwalten</Link>}
 </section>;
}