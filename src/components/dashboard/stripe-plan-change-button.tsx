"use client";
import {useEffect,useState} from "react";
import {Button} from "@/components/ui/button";
type Quote={kind:"UPGRADE"|"DOWNGRADE";remainingDays:number;totalDays:number;credit:number;newCharge:number;amountDue:number;currency:string;renewalAt:number;renewalCancelled:boolean;error?:string};
export function StripePlanChangeButton({organizationId,planId,label}:{organizationId:string;planId:string;label:string}){
 const [quote,setQuote]=useState<Quote|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const money=(cents:number)=>new Intl.NumberFormat("de-CH",{style:"currency",currency:quote?.currency||"CHF"}).format(cents/100);
 const date=quote?.renewalAt?new Date(quote.renewalAt*1000).toLocaleDateString("de-CH"):"–";
 useEffect(()=>{let active=true;async function load(){try{const res=await fetch("/api/stripe/change-plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({organizationId,planId,confirm:false})});const data=await res.json() as Quote;if(!res.ok)throw new Error(data.error||"Berechnung nicht verfügbar.");if(active)setQuote(data);}catch(e){if(active)setError(e instanceof Error?e.message:"Berechnung nicht verfügbar.");}}void load();return()=>{active=false;};},[organizationId,planId]);
 async function change(){if(!quote)return;const question=quote.kind==="UPGRADE"?`Upgrade bestätigen? Voraussichtlicher Aufpreis ${money(quote.amountDue)}. Der definitive Betrag wird von Stripe berechnet.`:`Downgrade zum ${date} vormerken?`;if(!window.confirm(question))return;setBusy(true);setError("");try{const res=await fetch("/api/stripe/change-plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({organizationId,planId,confirm:true})});const data=await res.json() as {error?:string};if(!res.ok)throw new Error(data.error||"Tarifwechsel fehlgeschlagen.");window.alert(quote.kind==="UPGRADE"?"Upgrade bei Stripe eingereicht. Freischaltung nach erfolgreicher Zahlung.":"Downgrade zum Laufzeitende vorgemerkt.");window.location.reload();}catch(e){setError(e instanceof Error?e.message:"Tarifwechsel fehlgeschlagen.");}finally{setBusy(false);}}
 return <div className="space-y-3">
 {quote?<div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
  <p className="font-semibold text-primary-900">{quote.kind==="UPGRADE"?"Deine Upgrade-Berechnung":"Dein geplanter Tarifwechsel"}</p>
  <dl className="mt-2 space-y-1 text-xs">
   <div className="flex justify-between gap-2"><dt>Verbleibende Laufzeit</dt><dd>{quote.remainingDays} von {quote.totalDays} Tagen</dd></div>
   <div className="flex justify-between gap-2"><dt>Ende der aktuellen Periode</dt><dd>{date}</dd></div>
   {quote.kind==="UPGRADE"?<>
    <div className="flex justify-between gap-2"><dt>Neuer Tarif, anteilmässig</dt><dd>{money(quote.newCharge)}</dd></div>
    <div className="flex justify-between gap-2"><dt>Gutschrift bisheriger Tarif</dt><dd>− {money(quote.credit)}</dd></div>
    <div className="flex justify-between gap-2 border-t border-border pt-2 font-semibold"><dt>Voraussichtlich offen</dt><dd>{money(quote.amountDue)}</dd></div>
   </>:<div className="flex justify-between gap-2 font-semibold"><dt>Heute zu bezahlen</dt><dd>{money(0)}</dd></div>}
  </dl>
  <p className="mt-2 text-xs text-muted-foreground">{quote.kind==="UPGRADE"?"Unverbindliche zeitanteilige Schätzung. Stripe berechnet den endgültigen Betrag inklusive allfälliger Steuern und Rundungsdifferenzen.":"Der bisherige Tarif bleibt bis zum Periodenende aktiv."}{quote.renewalCancelled?" Die automatische Verlängerung ist aktuell deaktiviert.":""}</p>
 </div>:!error?<p className="text-xs text-muted-foreground">Berechnung wird geladen …</p>:null}
 <Button type="button" className="w-full" disabled={busy||!quote} onClick={()=>void change()}>{busy?"Wechsel wird verarbeitet …":label}</Button>
 {error?<p role="alert" className="text-xs text-red-700">{error}</p>:null}
 </div>;
}
