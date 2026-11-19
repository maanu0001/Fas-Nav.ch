"use client";
import {useState} from "react";
import {Button} from "@/components/ui/button";
export function StripePlanChangeButton({organizationId,planId,label}:{organizationId:string;planId:string;label:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 async function run(confirm:boolean):Promise<void>{
 setBusy(true);setError("");
 try{
 const res=await fetch("/api/stripe/change-plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({organizationId,planId,confirm})});
 const data=await res.json() as {error?:string;kind?:string;amountDue?:number;currency?:string;renewalAt?:number};
 if(!res.ok)throw new Error(data.error||"Tarifwechsel fehlgeschlagen");
 if(!confirm){
  const date=data.renewalAt?new Date(data.renewalAt*1000).toLocaleDateString("de-CH"):"Laufzeitende";
  const amount=new Intl.NumberFormat("de-CH",{style:"currency",currency:data.currency||"CHF"}).format((data.amountDue||0)/100);
  const question=data.kind==="UPGRADE"?"Upgrade mit anteilmässiger Zahlung von "+amount+" bestätigen? Die Freischaltung erfolgt nach Zahlung.":"Downgrade auf "+date+" vormerken? Bis dahin bleibt der aktuelle Tarif bestehen.";
  if(window.confirm(question))await run(true);
 }else{window.alert(data.kind==="UPGRADE"?"Upgrade eingereicht. Freischaltung erst nach Zahlungsbestätigung.":"Downgrade zum Laufzeitende vorgemerkt.");window.location.reload();}
 }catch(e){setError(e instanceof Error?e.message:"Tarifwechsel fehlgeschlagen");}finally{setBusy(false);}
 }
 return <div><Button type="button" className="w-full" disabled={busy} onClick={()=>void run(false)}>{busy?"Tarif wird geprüft …":label}</Button>{error?<p role="alert" className="mt-2 text-xs text-red-700">{error}</p>:null}</div>;
}
