"use client";
import { useState } from "react";
import { CreditCard, LoaderCircle } from "lucide-react";
export function StripePortalButton({organizationId}:{organizationId:string}){
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function open(){
  setBusy(true);setError("");
  try{
   const response=await fetch("/api/stripe/portal",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({organizationId})});
   const result=await response.json() as {url?:string;error?:string};
   if(!response.ok||!result.url)throw new Error(result.error||"Kundenportal nicht verfügbar.");
   window.location.assign(result.url);
  }catch(e){setError(e instanceof Error?e.message:"Kundenportal nicht verfügbar.");setBusy(false);}
 }
 return <div className="space-y-2"><button type="button" disabled={busy} onClick={()=>void open()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy?<LoaderCircle className="h-4 w-4 animate-spin"/>:<CreditCard className="h-4 w-4"/>}{busy?"Kundenportal wird geöffnet …":"Abo und Zahlungsmittel online verwalten"}</button>{error?<p className="text-xs text-red-700" role="alert">{error}</p>:null}</div>;
}
