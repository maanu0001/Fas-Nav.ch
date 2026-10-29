"use client";
import * as React from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { apiRequest, errorMessage } from "@/lib/client-api";
import type { EmailTemplateView } from "@/lib/email-template-config";

export function EmailTemplatesForm({initial}:{initial:EmailTemplateView[]}){
 const [templates,setTemplates]=React.useState(initial);const [pending,setPending]=React.useState(false);const {toast}=useToast();
 const update=(id:string,patch:Partial<EmailTemplateView>)=>setTemplates(old=>old.map(t=>t.id===id?{...t,...patch}:t));
 async function save(){setPending(true);try{await apiRequest("/api/settings/email-templates",{method:"PUT",body:{templates:templates.map(({id,enabled,subject,body})=>({id,enabled,subject,body}))}});toast("E-Mail-Vorlagen gespeichert.","success");}catch(e){toast(errorMessage(e),"error");}finally{setPending(false);}}
 return <div className="space-y-5">
  {templates.map(t=><Card key={t.id} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-base font-semibold">{t.label}</h2><p className="mt-1 text-sm text-muted-foreground">{t.description}</p></div><label className="flex items-center gap-2 text-sm font-medium"><Checkbox checked={t.enabled} onChange={e=>update(t.id,{enabled:e.target.checked})}/>Aktiv</label></div><div className="mt-5 space-y-4"><Field label="Betreff" htmlFor={`${t.id}-subject`}><Input id={`${t.id}-subject`} value={t.subject} maxLength={300} onChange={e=>update(t.id,{subject:e.target.value})}/></Field><Field label="Text" htmlFor={`${t.id}-body`}><Textarea id={`${t.id}-body`} rows={8} value={t.body} maxLength={8000} onChange={e=>update(t.id,{body:e.target.value})}/></Field><div><p className="text-xs font-medium text-muted-foreground">Platzhalter</p><div className="mt-1 flex flex-wrap gap-1.5">{t.placeholders.map(p=><code key={p} className="rounded bg-secondary px-1.5 py-0.5 text-xs">{"{{"+p+"}}"}</code>)}</div></div></div></Card>)}
  <Button onClick={save} disabled={pending}>{pending?<Spinner/>:<Save/>}{pending?"Wird gespeichert …":"Alle Vorlagen speichern"}</Button>
 </div>;
}
