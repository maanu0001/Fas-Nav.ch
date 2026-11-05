"use client";
import * as React from "react";
import { Plug, Save, ShieldCheck } from "lucide-react";

type Config={configured:boolean;user:string;mailbox:string;host:string;port:number;smtpPort:number};
export function MailboxConnectionSettings({initial}:{initial:Config}){
 const [user,setUser]=React.useState(initial.user||"info@fas-nav.ch");
 const [password,setPassword]=React.useState("");
 const [configured,setConfigured]=React.useState(initial.configured);
 const [busy,setBusy]=React.useState(false);
 const [message,setMessage]=React.useState("");
 const [error,setError]=React.useState("");
 async function request(action:"config"|"test"){
  setBusy(true);setError("");setMessage("");
  try{
   const response=await fetch("/api/mail-center",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(action==="config"?{action,user,password}:{action})});
   const json=await response.json();
   if(!response.ok)throw new Error(json.error||"Verbindung fehlgeschlagen.");
   if(action==="config"){setPassword("");setConfigured(true);}
   setMessage(action==="test"?"IMAP-Verbindung zum Postfach erfolgreich.":"Postfach sicher gespeichert.");
  }catch(e){setError(e instanceof Error?e.message:"Aktion fehlgeschlagen.");}finally{setBusy(false);}
 }
 return <div className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
  <div className="flex items-center gap-3"><div className="rounded-xl bg-primary/10 p-2.5 text-primary"><Plug className="h-5 w-5"/></div><div><h3 className="font-display font-semibold">Mail-Center-Postfach (IMAP)</h3><p className="text-xs text-muted-foreground">Empfang, Konversationen und automatische Synchronisierung verwalten</p></div></div>
  <div className="grid gap-3 rounded-xl bg-muted/40 p-3 text-xs sm:grid-cols-2"><span>IMAP: {initial.host}:{initial.port} (TLS)</span><span>SMTP: {initial.host}:{initial.smtpPort} (STARTTLS)</span><span>Postfach: {initial.mailbox}</span><span className={configured?"text-emerald-700":"text-amber-700"}>{configured?"● Postfach konfiguriert":"● Noch nicht verbunden"}</span></div>
  <div className="grid gap-3 sm:grid-cols-2">
   <label className="text-sm font-medium">Postfach-Benutzername<input type="email" autoComplete="username" value={user} onChange={e=>setUser(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm"/></label>
   <label className="text-sm font-medium">Postfachpasswort<input type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={configured?"Leer lassen = unverändert":"Passwort eingeben"} className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm"/></label>
  </div>
  {error?<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>:null}
  {message?<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>:null}
  <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>void request("config")} disabled={busy||!user.trim()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4"/>Postfach verbinden / speichern</button><button type="button" onClick={()=>void request("test")} disabled={busy||!configured} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold disabled:opacity-50"><ShieldCheck className="h-4 w-4"/>Verbindung testen</button></div>
 </div>;
}
