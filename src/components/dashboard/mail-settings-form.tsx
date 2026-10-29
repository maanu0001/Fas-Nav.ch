"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save, Send } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { apiRequest, errorMessage, fieldErrors } from "@/lib/client-api";
import { MAIL_SECURITY_LABELS, SECRET_PLACEHOLDER, type MailSettingsView } from "@/lib/mail-config";
import { PREVIEW_TICKET_PLACEHOLDERS, TICKET_MAIL_PLACEHOLDERS, fillTicketPlaceholders } from "@/lib/ticket-mail";

export function MailSettingsForm({ initial }: { initial: MailSettingsView }) {
  const router = useRouter();
  const { toast } = useToast();
  const [werte, setWerte] = React.useState({
    enabled: initial.enabled, host: initial.host, port: initial.port, security: initial.security,
    user: initial.user, fromName: initial.fromName, fromEmail: initial.fromEmail,
    replyTo: initial.replyTo, ticketRecipient: initial.ticketRecipient,
    ticketSubject: initial.ticketSubject, ticketBody: initial.ticketBody,
  });
  const [passwort, setPasswort] = React.useState("");
  const [passwortEntfernen, setPasswortEntfernen] = React.useState(false);
  const [hasPassword, setHasPassword] = React.useState(initial.hasPassword);
  const [lastSuccessAt, setLastSuccessAt] = React.useState(initial.lastSuccessAt);
  const [lastError, setLastError] = React.useState(initial.lastError);
  const [lastErrorAt, setLastErrorAt] = React.useState(initial.lastErrorAt);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, setPending] = React.useState(false);
  const [testAdresse, setTestAdresse] = React.useState("");
  const [testPending, setTestPending] = React.useState(false);
  const [testErgebnis, setTestErgebnis] = React.useState<{ ok: boolean; message: string } | null>(null);

  React.useEffect(() => {
    setWerte({
      enabled: initial.enabled, host: initial.host, port: initial.port, security: initial.security,
      user: initial.user, fromName: initial.fromName, fromEmail: initial.fromEmail,
      replyTo: initial.replyTo, ticketRecipient: initial.ticketRecipient,
      ticketSubject: initial.ticketSubject, ticketBody: initial.ticketBody,
    });
    setHasPassword(initial.hasPassword);
    setLastSuccessAt(initial.lastSuccessAt);
    setLastError(initial.lastError);
    setLastErrorAt(initial.lastErrorAt);
  }, [initial]);

  const vollstaendig = werte.host.trim().length > 0 && werte.fromEmail.trim().length > 0;
  const vorschauBetreff = fillTicketPlaceholders(werte.ticketSubject, PREVIEW_TICKET_PLACEHOLDERS);
  const vorschauText = fillTicketPlaceholders(werte.ticketBody, PREVIEW_TICKET_PLACEHOLDERS);

  function feld<K extends keyof typeof werte>(key: K, value: (typeof werte)[K]) {
    setWerte((alt) => ({ ...alt, [key]: value }));
  }

  async function speichern(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setErrors({});
    try {
      const result = await apiRequest<MailSettingsView>("/api/settings/mail", {
        method: "PUT",
        body: { ...werte, ...(passwort ? { password: passwort } : {}), ...(passwortEntfernen ? { clearPassword: true } : {}) },
      });
      setPasswort(""); setPasswortEntfernen(false); setHasPassword(result.hasPassword);
      setLastSuccessAt(result.lastSuccessAt); setLastError(result.lastError); setLastErrorAt(result.lastErrorAt);
      toast("Mail-Einstellungen gespeichert.", "success"); router.refresh();
    } catch (error) {
      setErrors(fieldErrors(error)); toast(errorMessage(error), "error");
    } finally { setPending(false); }
  }

  async function testmail() {
    setTestPending(true); setTestErgebnis(null);
    try {
      await apiRequest("/api/settings/mail/test", { method: "POST", body: { to: testAdresse } });
      const now = new Date().toISOString();
      setLastSuccessAt(now); setLastError(null); setLastErrorAt(null);
      setTestErgebnis({ ok: true, message: `SMTP-Verbindung erfolgreich. Testmail an ${testAdresse} gesendet.` });
      toast("Testmail erfolgreich versendet.", "success"); router.refresh();
    } catch (error) {
      const message = errorMessage(error); const now = new Date().toISOString();
      setLastError(message); setLastErrorAt(now);
      setTestErgebnis({ ok: false, message });
      toast("Testmail konnte nicht versendet werden.", "error"); router.refresh();
    } finally { setTestPending(false); }
  }

  return <form onSubmit={speichern} className="space-y-6">
    <Card className="p-5">
      <h3 className="mb-1 font-display text-base font-semibold">Allgemein</h3>
      <p className="mb-4 text-sm text-muted-foreground">Ohne Mailversand arbeitet die Plattform vollständig weiter – Tickets und Meldungen im Dashboard sind davon nicht betroffen.</p>
      <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="flex items-center gap-2"><span aria-hidden className={werte.enabled ? "h-2.5 w-2.5 rounded-full bg-emerald-500" : "h-2.5 w-2.5 rounded-full border border-border"}/>Mailversand: <strong>{werte.enabled ? "Aktiv" : "Deaktiviert"}</strong></span>
        <span>Konfiguration: <strong className={vollstaendig ? "text-emerald-700" : undefined}>{vollstaendig ? "✓ vollständig" : "⚠ unvollständig"}</strong></span>
        {lastSuccessAt ? <span className="text-muted-foreground">Letzter erfolgreicher Versand: {new Date(lastSuccessAt).toLocaleString("de-CH")}</span> : null}
      </div>
      {lastError ? <Alert variant="warning">Letzter Fehler{lastErrorAt ? ` (${new Date(lastErrorAt).toLocaleString("de-CH")})` : ""}: {lastError}</Alert> : null}
      {!vollstaendig ? <Alert variant="info">Mailversand noch nicht konfiguriert. SMTP-Host und Absenderadresse müssen ausgefüllt sein.</Alert> : <Alert variant="success">SMTP-Grundkonfiguration vollständig. Mit der Testmail unten kannst du Verbindung, Anmeldung und Versand direkt prüfen.</Alert>}
      <label className="mt-4 flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"><Checkbox checked={werte.enabled} onChange={(e)=>feld("enabled",e.target.checked)}/><span>Mailversand aktiviert<span className="mt-0.5 block text-xs text-muted-foreground">Die Testmail funktioniert auch ohne diesen Haken.</span></span></label>
    </Card>

    <Card className="p-5"><h3 className="mb-4 font-display text-base font-semibold">Verbindung</h3><div className="grid gap-4 sm:grid-cols-2">
      <Field label="SMTP-Host" htmlFor="mail-host" error={errors.host}><Input id="mail-host" value={werte.host} onChange={(e)=>feld("host",e.target.value)} placeholder="smtp.example.ch" maxLength={200}/></Field>
      <Field label="Port" htmlFor="mail-port" error={errors.port}><Input id="mail-port" type="number" min={1} max={65535} value={werte.port} onChange={(e)=>feld("port",Number(e.target.value))}/></Field>
      <Field label="Verschlüsselung" htmlFor="mail-security" error={errors.security}><Select id="mail-security" value={werte.security} onChange={(e)=>feld("security",e.target.value as typeof werte.security)}>{Object.entries(MAIL_SECURITY_LABELS).map(([wert,label])=><option key={wert} value={wert}>{label}</option>)}</Select></Field>
      <Field label="Benutzername" htmlFor="mail-user" error={errors.user} hint="Leer lassen, wenn der Server ohne Anmeldung annimmt."><Input id="mail-user" value={werte.user} onChange={(e)=>feld("user",e.target.value)} maxLength={200} autoComplete="off"/></Field>
      <Field label="Passwort" htmlFor="mail-password" error={errors.password} hint={hasPassword ? "Ein Passwort ist hinterlegt. Leer lassen, um es unverändert zu lassen." : "Wird verschlüsselt gespeichert und nie wieder angezeigt."}><Input id="mail-password" type="password" value={passwort} onChange={(e)=>{setPasswort(e.target.value);if(e.target.value)setPasswortEntfernen(false)}} placeholder={hasPassword ? SECRET_PLACEHOLDER : ""} maxLength={400} autoComplete="new-password" disabled={passwortEntfernen}/></Field>
      {hasPassword ? <label className="flex items-center gap-2 self-end pb-2 text-sm text-slate-700 dark:text-slate-300"><Checkbox checked={passwortEntfernen} onChange={(e)=>{setPasswortEntfernen(e.target.checked);if(e.target.checked)setPasswort("")}}/>Hinterlegtes Passwort entfernen</label> : null}
    </div></Card>

    <Card className="p-5"><h3 className="mb-4 font-display text-base font-semibold">Absender</h3><div className="grid gap-4 sm:grid-cols-2">
      <Field label="Absendername" htmlFor="mail-from-name" error={errors.fromName}><Input id="mail-from-name" value={werte.fromName} onChange={(e)=>feld("fromName",e.target.value)} maxLength={120}/></Field>
      <Field label="Absenderadresse" htmlFor="mail-from-email" error={errors.fromEmail}><Input id="mail-from-email" type="email" value={werte.fromEmail} onChange={(e)=>feld("fromEmail",e.target.value)} placeholder="info@fas-nav.ch" maxLength={200}/></Field>
      <Field label="Antwortadresse" htmlFor="mail-reply-to" error={errors.replyTo} hint="Optional. Leer lassen, wenn Antworten an den Absender gehen sollen."><Input id="mail-reply-to" type="email" value={werte.replyTo} onChange={(e)=>feld("replyTo",e.target.value)} maxLength={200}/></Field>
    </div></Card>

    <Card className="p-5"><h3 className="mb-1 font-display text-base font-semibold">Ticket-Benachrichtigungen</h3><p className="mb-4 text-sm text-muted-foreground">Antwortet eine Organisation, geht die E-Mail an die zuständige Person des Tickets. Ist niemand zugewiesen, an diese Adresse. Bleibt sie leer, erscheint die Meldung weiterhin im Dashboard.</p><Field label="Sammeladresse für Tickets ohne Zuweisung" htmlFor="mail-ticket-recipient" error={errors.ticketRecipient}><Input id="mail-ticket-recipient" type="email" value={werte.ticketRecipient} onChange={(e)=>feld("ticketRecipient",e.target.value)} placeholder="support@fas-nav.ch" maxLength={200}/></Field></Card>

    <Card className="p-5"><h3 className="mb-4 font-display text-base font-semibold">Vorlage der Ticketmail</h3><div className="space-y-4">
      <Field label="Betreff" htmlFor="mail-ticket-subject" error={errors.ticketSubject}><Input id="mail-ticket-subject" value={werte.ticketSubject} onChange={(e)=>feld("ticketSubject",e.target.value)} maxLength={300}/></Field>
      <Field label="Text" htmlFor="mail-ticket-body" error={errors.ticketBody}><Textarea id="mail-ticket-body" rows={12} value={werte.ticketBody} onChange={(e)=>feld("ticketBody",e.target.value)} maxLength={5000}/></Field>
      <div className="text-sm text-muted-foreground"><p className="mb-1 font-medium text-slate-700 dark:text-slate-300">Verfügbare Platzhalter</p><div className="flex flex-wrap gap-1.5">{TICKET_MAIL_PLACEHOLDERS.map((p)=><code key={p} className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">{p}</code>)}</div></div>
      <div className="rounded-xl border border-border bg-secondary/40 p-4"><p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Vorschau mit Beispieldaten</p><p className="text-sm font-semibold text-primary-900 dark:text-slate-100">{vorschauBetreff}</p><pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-slate-700 dark:text-slate-300">{vorschauText}</pre></div>
    </div></Card>

    <Button type="submit" disabled={pending}>{pending ? <Spinner/> : <Save/>}{pending ? "Wird gespeichert …" : "Mail-Einstellungen speichern"}</Button>

    <Card className="border-primary-200 bg-primary-50/40 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="mb-1 font-display text-base font-semibold">SMTP-Verbindung testen</h3><p className="mb-4 text-sm text-muted-foreground">Sendet eine echte Testmail mit der gespeicherten Konfiguration. Änderungen oben vorher speichern.</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${vollstaendig ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{vollstaendig ? "Bereit zum Test" : "Konfiguration fehlt"}</span></div>
      <div className="flex flex-wrap items-end gap-3"><div className="min-w-[240px] flex-1"><Field label="Zieladresse" htmlFor="mail-test-to"><Input id="mail-test-to" type="email" value={testAdresse} onChange={(e)=>setTestAdresse(e.target.value)} placeholder="name@example.ch" maxLength={200}/></Field></div><Button type="button" onClick={testmail} disabled={testPending || !testAdresse || !vollstaendig}>{testPending ? <Spinner/> : <Send/>}{testPending ? "SMTP wird geprüft …" : "Testmail senden"}</Button></div>
      {testErgebnis ? <div className="mt-4"><Alert variant={testErgebnis.ok ? "success" : "error"}>{testErgebnis.ok ? "✓ " : "✕ "}{testErgebnis.message}</Alert></div> : null}
    </Card>
  </form>;
}
