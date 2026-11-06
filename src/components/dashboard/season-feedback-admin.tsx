"use client";
import * as React from "react";
import { apiRequest,errorMessage } from "@/lib/client-api";
import { defaultQuestions,type Question } from "@/lib/season-survey-questions";
type Survey={id:string;title:string;season:string;status:string;audience:string;questions:Question[];_count:{invitations:number}};
export function SeasonFeedbackAdmin({initial}:{initial:Survey[]}){
 const [surveys,setSurveys]=React.useState(initial);
 const [editing,setEditing]=React.useState<string|null>(null);
 const [title,setTitle]=React.useState("Saisonfeedback");
 const [season,setSeason]=React.useState(String(new Date().getFullYear()));
 const [audience,setAudience]=React.useState("ALL");
 const [questions,setQuestions]=React.useState<Question[]>(defaultQuestions);
 const [testEmail,setTestEmail]=React.useState<Record<string,string>>({});
 const [busy,setBusy]=React.useState(false),[error,setError]=React.useState(""),[result,setResult]=React.useState("");
 const locked=Boolean(editing&&surveys.find(s=>s.id===editing)?.status!=="DRAFT");
 async function refresh(){setSurveys(await apiRequest<Survey[]>("/api/admin/saisonfeedback"));}
 function startEdit(s:Survey){setEditing(s.id);setTitle(s.title);setSeason(s.season);setAudience(s.audience);setQuestions(s.questions);window.scrollTo({top:0,behavior:"smooth"});}
 async function save(){
  setBusy(true);setError("");setResult("");
  try{
   if(editing)await apiRequest("/api/admin/saisonfeedback/"+editing,{method:"PATCH",body:{action:"edit",title,season,audience,questions}});
   else await apiRequest("/api/admin/saisonfeedback",{method:"POST",body:{title,season,audience,questions}});
   await refresh();setResult(editing?"Änderungen gespeichert.":"Umfrage erstellt.");setEditing(null);
  }catch(e){setError(errorMessage(e));}finally{setBusy(false);}
 }
 async function action(id:string,command:string){
  setBusy(true);setError("");try{const response=await apiRequest<Record<string,unknown>>("/api/admin/saisonfeedback/"+id,{method:"PATCH",body:{action:command}});setResult(JSON.stringify(response));await refresh();}catch(e){setError(errorMessage(e));}finally{setBusy(false);}
 }
 async function test(id:string){
  const email=testEmail[id]?.trim();if(!email){setError("Bitte eine Testadresse eingeben.");return;}
  setBusy(true);setError("");try{await apiRequest("/api/admin/saisonfeedback/"+id,{method:"PATCH",body:{action:"test",email}});setResult("Testmail mit funktionierendem Umfragelink an "+email+" versendet.");await refresh();}catch(e){setError(errorMessage(e));}finally{setBusy(false);}
 }
 async function remove(id:string){
  if(window.prompt("Die Umfrage und sämtliche Antworten werden unwiderruflich gelöscht. Gib zur Bestätigung DELETE ein.")!=="DELETE")return;
  setBusy(true);setError("");try{await apiRequest("/api/admin/saisonfeedback/"+id+"?confirm=DELETE",{method:"DELETE"});await refresh();setResult("Umfrage gelöscht.");if(editing===id)setEditing(null);}catch(e){setError(errorMessage(e));}finally{setBusy(false);}
 }
 const inputClass="mt-1 w-full rounded-xl border bg-background px-3 py-2.5 text-sm";
 return <div className="space-y-6">
  {error?<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>:null}
  {result?<p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{result}</p>:null}
  <section className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6">
   <h2 className="font-display text-lg font-semibold">{editing?"Umfrage bearbeiten":"Neue Saisonumfrage"}</h2>
   <div className="grid gap-3 sm:grid-cols-3">
    <label className="text-sm font-semibold">Titel<input className={inputClass} value={title} onChange={e=>setTitle(e.target.value)}/></label>
    <label className="text-sm font-semibold">Saison<input className={inputClass} value={season} onChange={e=>setSeason(e.target.value)}/></label>
    <label className="text-sm font-semibold">Zielgruppe<select className={inputClass} value={audience} onChange={e=>setAudience(e.target.value)}><option value="ALL">Alle</option><option value="GUGGE">Guggen</option><option value="CARNIVAL">Fasnachten</option></select></label>
   </div>
   <h3 className="font-semibold">Fragen</h3>
   {locked?<p className="text-xs text-amber-800">Bereits versendete Fragen bleiben unverändert; die Metadaten kannst du weiter bearbeiten.</p>:null}
   {questions.map((q,i)=><div key={q.id} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_125px_90px]">
    <input disabled={locked} aria-label="Frage" className={inputClass} value={q.label} onChange={e=>setQuestions(v=>v.map((x,j)=>i===j?{...x,label:e.target.value}:x))}/>
    <select disabled={locked} aria-label="Antworttyp" className={inputClass} value={q.type} onChange={e=>setQuestions(v=>v.map((x,j)=>i===j?{...x,type:e.target.value as Question["type"]}:x))}>{["rating","nps","single","multi","text"].map(t=><option key={t} value={t}>{t}</option>)}</select>
    <button type="button" disabled={locked} className="rounded-xl border px-3 py-2 text-xs" onClick={()=>setQuestions(v=>v.filter((_,j)=>i!==j))}>Entfernen</button>
    {["single","multi"].includes(q.type)?<input disabled={locked} className={"sm:col-span-3 "+inputClass} aria-label="Antwortmöglichkeiten" value={(q.options||[]).join(", ")} onChange={e=>setQuestions(v=>v.map((x,j)=>i===j?{...x,options:e.target.value.split(",").map(s=>s.trim()).filter(Boolean)}:x))}/>:null}
   </div>)}
   <div className="flex flex-wrap gap-2">
    <button type="button" disabled={locked} className="rounded-xl border px-4 py-2 text-sm" onClick={()=>setQuestions(v=>[...v,{id:"q"+Date.now(),label:"Neue Frage",type:"text"}])}>Frage hinzufügen</button>
    <button type="button" disabled={busy||questions.length===0} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={()=>void save()}>{editing?"Änderungen speichern":"Umfrage erstellen"}</button>
    {editing?<button type="button" className="rounded-xl border px-4 py-2 text-sm" onClick={()=>setEditing(null)}>Abbrechen</button>:null}
   </div>
  </section>
  <section className="space-y-3">
   <h2 className="font-display text-lg font-semibold">Gespeicherte Umfragen</h2>
   {surveys.map(s=><article key={s.id} className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
     <div><h3 className="font-semibold">{s.title} · {s.season}</h3><p className="text-sm text-muted-foreground">{s.status} · {s._count.invitations} Einladungen · {s.audience}</p></div>
     <a href={"/dashboard/saisonfeedback/"+s.id} className="text-sm font-semibold text-primary underline">Auswertung ansehen</a>
    </div>
    <div className="flex flex-wrap gap-2">
     <button type="button" disabled={busy} onClick={()=>startEdit(s)} className="rounded-xl border px-3 py-2 text-xs">Bearbeiten</button>
     <button type="button" disabled={busy} onClick={()=>void remove(s.id)} className="rounded-xl border border-red-200 px-3 py-2 text-xs text-red-700">Löschen</button>
     {s.status==="DRAFT"?<><button type="button" disabled={busy} onClick={()=>void action(s.id,"prepare")} className="rounded-xl border px-3 py-2 text-xs">Empfänger vorbereiten</button><button type="button" disabled={busy} onClick={()=>void action(s.id,"activate")} className="rounded-xl border px-3 py-2 text-xs">Aktivieren</button></>:null}
     {s.status==="ACTIVE"?<><button type="button" disabled={busy} onClick={()=>void action(s.id,"send")} className="rounded-xl border px-3 py-2 text-xs">Einladungen senden (bis 100)</button><button type="button" disabled={busy} onClick={()=>void action(s.id,"remind")} className="rounded-xl border px-3 py-2 text-xs">Erinnerungen senden</button><button type="button" disabled={busy} onClick={()=>void action(s.id,"close")} className="rounded-xl border px-3 py-2 text-xs">Abschliessen</button></>:null}
    </div>
    {s.status!=="CLOSED"?<div className="flex flex-wrap items-end gap-2 border-t pt-3">
     <label className="flex-1 text-xs font-semibold">Testmail an frei wählbare Adresse<input type="email" placeholder="name@beispiel.ch" value={testEmail[s.id]||""} onChange={e=>setTestEmail(v=>({...v,[s.id]:e.target.value}))} className={inputClass}/></label>
     <button type="button" disabled={busy} className="rounded-xl border border-primary/30 px-4 py-2.5 text-xs font-semibold text-primary" onClick={()=>void test(s.id)}>Testmail mit Umfragelink senden</button>
    </div>:null}
   </article>)}
  </section>
 </div>;
}
