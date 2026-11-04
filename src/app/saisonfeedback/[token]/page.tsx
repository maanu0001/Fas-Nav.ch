"use client";
import * as React from "react";
import { useParams } from "next/navigation";
import { apiRequest,errorMessage } from "@/lib/client-api";
import type { Question } from "@/lib/season-survey-questions";
type Survey={title:string;season:string;questions:Question[];answered:boolean;optedOut:boolean};
export default function SurveyPage(){
 const {token}=useParams<{token:string}>();const [survey,setSurvey]=React.useState<Survey|null>(null);const [answers,setAnswers]=React.useState<Record<string,string|number|string[]>>({});
 const [identity,setIdentity]=React.useState(false),[contact,setContact]=React.useState(false),[error,setError]=React.useState(""),[done,setDone]=React.useState(false),[busy,setBusy]=React.useState(false);
 React.useEffect(()=>{void apiRequest<Survey>("/api/saisonfeedback/"+token).then(setSurvey).catch(e=>setError(errorMessage(e)));},[token]);
 async function submit(optOut=false){setBusy(true);setError("");try{await apiRequest("/api/saisonfeedback/"+token,{method:"POST",body:optOut?{optOut:true}:{answers,revealIdentity:identity,contactConsent:contact}});setDone(true);}catch(e){setError(errorMessage(e));}finally{setBusy(false);}}
 if(done)return <main className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-bold">Vielen Dank!</h1><p>Deine Rückmeldung wurde gespeichert.</p></main>;
 return <main className="mx-auto max-w-2xl space-y-6 px-5 py-12"><h1 className="text-3xl font-bold">{survey?.title??"Saisonfeedback"}</h1><p className="text-muted-foreground">Dein Feedback hilft uns, FAS-NAV für die nächste Saison zu verbessern. Dauer: ca. 3–5 Minuten.</p>
 {error?<p role="alert" className="text-red-700">{error}</p>:null}
 {survey?.answered||survey?.optedOut?<p>Dieser Link wurde bereits verwendet.</p>:survey?.questions.map(q=><fieldset key={q.id} className="space-y-3 rounded-xl border border-border p-5"><legend className="px-2 font-semibold">{q.label}</legend>
 {q.type==="text"?<textarea rows={3} maxLength={3000} className="w-full rounded-lg border p-3" value={String(answers[q.id]??"")} onChange={e=>setAnswers(a=>({...a,[q.id]:e.target.value}))}/>:
 (q.type==="rating"||q.type==="nps"?Array.from({length:q.type==="rating"?5:11},(_,i)=>String(i+(q.type==="rating"?1:0))):q.options??[]).map(v=><label key={v} className="mr-2 inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 py-2 text-sm">
 <input type={q.type==="multi"?"checkbox":"radio"} name={q.id} checked={q.type==="multi"?(Array.isArray(answers[q.id])&&(answers[q.id] as string[]).includes(v)):String(answers[q.id]??"")===v} onChange={e=>setAnswers(a=>({...a,[q.id]:q.type==="multi"?(e.target.checked?[...((a[q.id] as string[])??[]),v]:((a[q.id] as string[])??[]).filter(x=>x!==v)):q.type==="rating"||q.type==="nps"?Number(v):v}))}/>{v}</label>)}
 </fieldset>)}
 {survey&&!survey.answered&&!survey.optedOut?<div className="space-y-4 rounded-xl border p-5"><p className="text-sm text-muted-foreground">Standardmässig werden Antworten ohne Organisationsnamen ausgewertet. Die Zuordnung wird nur mit deiner Einwilligung angezeigt.</p>
 <label className="flex gap-2"><input type="checkbox" checked={identity} onChange={e=>setIdentity(e.target.checked)}/>Organisation in der Auswertung nennen</label>
 <label className="flex gap-2"><input type="checkbox" checked={contact} onChange={e=>setContact(e.target.checked)}/>Ich darf für Rückfragen kontaktiert werden</label>
 <button disabled={busy} onClick={()=>submit()} className="min-h-11 rounded-lg bg-primary px-6 text-primary-foreground">Feedback absenden</button>
 <button disabled={busy} onClick={()=>submit(true)} className="ml-3 text-sm underline">Keine weiteren Einladungen zu dieser Umfrage</button></div>:null}
 </main>;
}
