"use client";
import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { signIn } from "next-auth/react";
type Invite={organizationName:string;organizationType:string;email:string;contactName:string|null;status:string;expired:boolean};
export default function BoardingInvitationPage(){
 const {token}=useParams<{token:string}>();
 const [invite,setInvite]=React.useState<Invite|null>(null),[loading,setLoading]=React.useState(true);
 const [name,setName]=React.useState(""),[password,setPassword]=React.useState("");
 const [error,setError]=React.useState(""),[success,setSuccess]=React.useState("");
 const [busy,setBusy]=React.useState(false);
 React.useEffect(()=>{fetch("/api/boarding/"+encodeURIComponent(token),{cache:"no-store"}).then(async r=>{if(!r.ok)throw new Error("Einladung nicht gefunden.");return r.json();}).then((v:Invite)=>{setInvite(v);setName(v.contactName||"");}).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[token]);
 async function accept(event:React.FormEvent){
  event.preventDefault();setBusy(true);setError("");setSuccess("");
  try{
   const r=await fetch("/api/boarding/"+encodeURIComponent(token),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,password})});
   const data=await r.json();if(!r.ok)throw new Error(data.error||"Anfrage nicht möglich.");
   setInvite(v=>v?{...v,status:"PENDING"}:v);
   setSuccess("Deine Anfrage ist eingegangen. Ein Administrator prüft die Zuordnung. Erst nach Freigabe erhältst du Zugriff.");
   if(data.accountCreated&&password){await signIn("credentials",{email:invite?.email||"",password,redirect:false});setPassword("");}
  }catch(e){setError(e instanceof Error?e.message:"Fehler beim Annehmen.");}finally{setBusy(false);}
 }
 return <main className="mx-auto min-h-[75vh] max-w-xl space-y-6 px-4 py-12">
  <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
   <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">Fas-Nav.ch · Persönliche Einladung</p>
   <h1 className="font-display text-2xl font-bold">{invite?.organizationName||"Organisation übernehmen"}</h1>
   {loading?<p className="mt-5 text-sm">Einladung wird überprüft …</p>:null}
   {invite?<p className="mt-3 text-sm text-muted-foreground">Du wurdest eingeladen, die bereits erfasste Organisation kostenlos zu verwalten. Die Administration prüft deine Anfrage vor der Freischaltung.</p>:null}
   {error?<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>:null}
   {success?<p role="status" className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-800">{success}</p>:null}
   {invite&&invite.status==="SENT"&&!invite.expired?<form onSubmit={accept} className="mt-6 space-y-4">
    <label className="block text-sm font-medium">Eingeladene E-Mail-Adresse<input value={invite.email} readOnly className="mt-1 block w-full rounded-xl border bg-muted px-3 py-3 text-sm"/></label>
    <p className="text-xs text-muted-foreground">Wenn du bereits ein Konto mit dieser Adresse hast, melde dich zuerst an. Andernfalls kannst du hier ein Konto anlegen.</p>
    <Link className="inline-block rounded-xl border px-4 py-2 text-sm font-semibold text-primary hover:bg-muted" href={"/login?callbackUrl="+encodeURIComponent("/boarding/"+token)}>Mit bestehendem Konto anmelden</Link>
    <label className="block text-sm font-medium">Dein Name (für neue Konten)<input value={name} onChange={e=>setName(e.target.value)} autoComplete="name" className="mt-1 block w-full rounded-xl border px-3 py-3 text-sm"/></label>
    <label className="block text-sm font-medium">Passwort (nur für neue Konten)<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" minLength={12} placeholder="Mindestens 12 Zeichen" className="mt-1 block w-full rounded-xl border px-3 py-3 text-sm"/></label>
    <button disabled={busy} className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white disabled:opacity-50">{busy?"Wird geprüft …":"Übernahme zur Freigabe einreichen"}</button>
   </form>:null}
   {invite&&(invite.status==="PENDING"||invite.status==="APPROVED")?<div className="mt-5 rounded-xl bg-muted p-4"><p className="font-semibold">{invite.status==="PENDING"?"Freigabe ausstehend":"Zugriff freigegeben"}</p><p className="mt-1 text-sm">{invite.status==="PENDING"?"Deine Übernahme wird durch die Administration geprüft.":"Melde dich an und richte deine Organisationsseite ein."}</p>{invite.status==="APPROVED"?<Link className="mt-3 inline-block font-semibold text-primary underline" href="/dashboard/onboarding">Zum Onboarding</Link>:null}</div>:null}
   {invite&&(invite.expired||invite.status==="REVOKED"||invite.status==="REJECTED")?<p className="mt-5 rounded-xl bg-muted p-4 text-sm">Diese Einladung ist nicht mehr gültig. Kontaktiere bitte info@fas-nav.ch.</p>:null}
  </div>
 </main>;
}