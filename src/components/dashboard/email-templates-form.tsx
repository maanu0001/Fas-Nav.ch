"use client";
import * as React from "react";
import { Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { apiRequest, errorMessage } from "@/lib/client-api";
import type { EmailTemplateView } from "@/lib/email-template-config";

const TEST_VALUES: Record<string,string>={
 recipientName:"Testempfänger",ticketNumber:"1234",ticketTitle:"Testticket",senderName:"Fas-Nav Team",messagePreview:"Dies ist ein Testinhalt für die Vorschau.",ticketUrl:"https://fas-nav.ch/dashboard/tickets",contactName:"Max Muster",contactEmail:"max@example.ch",subject:"Testanfrage",message:"Dies ist eine Testnachricht.",dashboardUrl:"https://fas-nav.ch/dashboard",organizationName:"Beispiel Fasnacht",eventTitle:"Beispiel Veranstaltung",eventUrl:"https://fas-nav.ch/agenda",todoTitle:"Test-Aufgabe",todoDescription:"Dies ist eine automatisch erzeugte Test-Aufgabe.",newsTitle:"Test-Neuigkeit",newsBody:"Dies ist ein Testinhalt für die Vorlage.",
};
function renderTest(value:string){return value.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g,(_,key:string)=>TEST_VALUES[key]??`[${key}]`)}

export function EmailTemplatesForm({initial}:{initial:EmailTemplateView[]}){
 const [templates,setTemplates]=React.useState(initial);const [pending,setPending]=React.useState(false);const [testRecipient,setTestRecipient]=React.useState<Record<string,string>>({});const [testing,setTesting]=React.useState<string|null>(null);const {toast}=useToast();
 const update=(id:string,patch:Partial<EmailTemplateView>)=>setTemplates(old=>old.map(t=>t.id===id?{...t,...patch}:t));
 async function save(){setPending(true);try{await apiRequest("/api/settings/email-templates",{method:"PUT",body:{templates:templates.map(({id,enabled,subject,body})=>({id,enabled,subject,body}))}});toast("E-Mail-Vorlagen gespeichert.","success");}catch(e){toast(errorMessage(e),"error");}finally{setPending(false);}}
 async function testTemplate(t:EmailTemplateView){const to=(testRecipient[t.id]??"").trim();if(!to){toast("Bitte eine Empfangsadresse für den Test angeben.","error");return}setTesting(t.id);try{await apiRequest("/api/settings/mail/test",{method:"POST",body:{to,subject:`[TEST] ${renderTest(t.subject)}`,text:renderTest(t.body)}});toast(`Test für „${t.label}“ wurde gesendet.`,"success")}catch(e){toast(errorMessage(e),"error")}finally{setTesting(null)}}
 return <div className="space-y-5">
  {templates.map(t=><Card key={t.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-base font-semibold">{t.label}</h2><p className="mt-1 text-sm text-muted-foreground">{t.description}</p></div><label className="flex items-center gap-2 text-sm font-medium"><Checkbox checked={t.enabled} onChange={e=>update(t.id,{enabled:e.target.checked})}/>Aktiv</label></div><div className="mt-5 space-y-4"><Field label="Betreff" htmlFor={`${t.id}-subject`}><Input id={`${t.id}-subject`} value={t.subject} maxLength={300} onChange={e=>update(t.id,{subject:e.target.value})}/></Field><Field label="Text" htmlFor={`${t.id}-body`}><Textarea id={`${t.id}-body`} rows={8} value={t.body} maxLength={8000} onChange={e=>update(t.id,{body:e.target.value})}/></Field><div><p className="text-xs font-medium text-muted-foreground">Platzhalter</p><div className="mt-1 flex flex-wrap gap-1.5">{t.placeholders.map(p=><code key={p} className="rounded bg-secondary px-1.5 py-0.5 text-xs">{"{{"+p+"}}"}</code>)}</div></div><div className="rounded-xl border border-border bg-muted/30 p-4"><p className="text-sm font-semibold">Vorlage testen</p><p className="mt-1 text-xs text-muted-foreground">Sendet diese aktuell sichtbare Vorlage mit sicheren Testwerten. Speichern ist dafür nicht nötig.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><Input type="email" value={testRecipient[t.id]??""} onChange={e=>setTestRecipient(old=>({...old,[t.id]:e.target.value}))} placeholder="test@beispiel.ch" aria-label={`Test-E-Mail für ${t.label}`}/><Button type="button" variant="outline" disabled={testing===t.id} onClick={()=>testTemplate(t)}>{testing===t.id?<Spinner/>:<Send/>}{testing===t.id?"Sendet …":"Test senden"}</Button></div></div></div></Card>)}
  <Button onClick={save} disabled={pending}>{pending?<Spinner/>:<Save/>}{pending?"Wird gespeichert …":"Alle Vorlagen speichern"}</Button>
 </div>;
}
