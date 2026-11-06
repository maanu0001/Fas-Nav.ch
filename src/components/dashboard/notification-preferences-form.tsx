"use client";
import * as React from "react";
import type { NotificationPreferences } from "@/lib/notification-preferences";
import { NOTIFICATION_CATEGORIES, notificationTypesForRole } from "@/lib/notification-preferences";
import { apiRequest, errorMessage } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";
export function NotificationPreferencesForm({ initial, role }: { initial: NotificationPreferences; role: string }) {
  const [state, setState] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const { toast } = useToast();
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { await apiRequest("/api/account/notification-preferences", { method: "PATCH", body: Object.fromEntries(notificationTypesForRole(role).map(type => [type, state[type]])) }); toast("E-Mail-Benachrichtigungen gespeichert.", "success"); }
    catch (err) { toast(errorMessage(err), "error"); }
    finally { setSaving(false); }
  }
  return <form onSubmit={submit} className="space-y-4">
    <p className="text-sm text-muted-foreground">Wähle, für welche Ereignisse du zusätzlich zu Meldungen im Dashboard E-Mails erhalten möchtest. Diese Auswahl beeinflusst keine erforderlichen Sicherheitsmails.</p>
    <div className="grid gap-3 sm:grid-cols-2">{notificationTypesForRole(role).map(type=>
      <label key={type} className="flex items-center gap-3 rounded-xl border p-3 text-sm">
        <input type="checkbox" className="h-4 w-4 accent-primary" checked={state[type as keyof NotificationPreferences]} onChange={e=>setState(previous=>({...previous,[type]:e.target.checked}))}/>
        <span>{NOTIFICATION_CATEGORIES[type]}</span>
      </label>
    )}</div>
    <button disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving?"Speichern …":"Benachrichtigungen speichern"}</button>
  </form>;
}
