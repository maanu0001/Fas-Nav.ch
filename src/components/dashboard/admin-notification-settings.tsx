"use client";
import * as React from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiRequest, errorMessage } from "@/lib/client-api";
import type { AdminPreferences } from "@/lib/admin-preferences";

export function AdminNotificationSettings({ initial }: { initial: AdminPreferences }) {
  const [value, setValue] = React.useState(initial); const [pending,setPending]=React.useState(false); const {toast}=useToast();
  async function save(e:React.FormEvent){e.preventDefault();setPending(true);try{await apiRequest("/api/account/admin-preferences",{method:"PATCH",body:value});toast("Benachrichtigungen gespeichert.","success");}catch(err){toast(errorMessage(err),"error");}finally{setPending(false)}}
  return <form onSubmit={save} className="space-y-4">
    <Field label="Benachrichtigungs-E-Mail" htmlFor="notification-email" hint="Kann von deiner Login-Adresse abweichen. Hierhin gehen operative Hinweise für dich als Betreiber.">
      <Input id="notification-email" type="email" required value={value.notificationEmail} onChange={e=>setValue({...value,notificationEmail:e.target.value})}/>
    </Field>
    <label className="flex items-start gap-2 text-sm"><Checkbox checked={value.emailTodos} onChange={e=>setValue({...value,emailTodos:e.target.checked})}/><span>Neue Aufgaben und Vorgänge per E-Mail melden<span className="block text-xs text-muted-foreground">Zum Beispiel Kontaktanfragen, Claims und andere Dinge, die deine Aufmerksamkeit brauchen.</span></span></label>
    <label className="flex items-start gap-2 text-sm"><Checkbox checked={value.emailNews} onChange={e=>setValue({...value,emailNews:e.target.checked})}/><span>Wichtige Plattform-Neuigkeiten per E-Mail melden</span></label>
    <Button type="submit" disabled={pending}><Save/>{pending?"Speichert …":"Speichern"}</Button>
  </form>;
}
