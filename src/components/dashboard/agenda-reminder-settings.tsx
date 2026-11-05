"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Play, Save } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { apiRequest, errorMessage } from "@/lib/client-api";
import {
  AVAILABLE_PLACEHOLDERS,
  PREVIEW_PLACEHOLDERS,
  REMINDER_SETTING_KEYS,
  fillPlaceholders,
  type ReminderSettings,
} from "@/lib/agenda-reminder";

/**
 * Erinnerung an fehlende Agenda-Einträge einstellen.
 *
 * Die Werte liegen im vorhandenen Schlüssel-Wert-Speicher und werden über den
 * Einstellungs-Endpunkt gespeichert, der die Berechtigung `manageSettings`
 * serverseitig prüft. Die Vorschau setzt dieselbe Ersetzung ein wie der
 * Versand – was hier steht, geht so auch hinaus.
 */
export function AgendaReminderSettings({ initial }: { initial: ReminderSettings }) {
  const router = useRouter();
  const { toast } = useToast();

  const [werte, setWerte] = React.useState(initial);
  const [pending, setPending] = React.useState(false);
  const [laufPending, setLaufPending] = React.useState(false);
  const [testTo,setTestTo]=React.useState("");
  const [testing,setTesting]=React.useState(false);

  const vorschauBetreff = fillPlaceholders(werte.subject, PREVIEW_PLACEHOLDERS);
  const vorschauText = fillPlaceholders(werte.body, PREVIEW_PLACEHOLDERS);

  async function speichern(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      await apiRequest("/api/settings", {
        method: "PUT",
        body: {
          settings: [
            { key: REMINDER_SETTING_KEYS.enabled, value: werte.enabled ? "true" : "false" },
            { key: REMINDER_SETTING_KEYS.subject, value: werte.subject },
            { key: REMINDER_SETTING_KEYS.body, value: werte.body },
            { key: REMINDER_SETTING_KEYS.cooldownDays, value: String(werte.cooldownDays) },
            { key: REMINDER_SETTING_KEYS.ctaLabel, value: werte.ctaLabel },
          ],
        },
      });
      toast(
        werte.enabled
          ? "Gespeichert. Die Erinnerung ist aktiv."
          : "Gespeichert. Die Erinnerung ist ausgeschaltet.",
        "success",
      );
      router.refresh();
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setPending(false);
    }
  }

  async function testmail(){if(!testTo.trim())return;setTesting(true);try{await apiRequest("/api/settings/mail/test",{method:"POST",body:{to:testTo,subject:"[TEST] "+vorschauBetreff,text:vorschauText+"\n\n"+werte.ctaLabel+": "+PREVIEW_PLACEHOLDERS.eventCreateUrl}});toast("Erinnerungs-Testmail versendet.","success")}catch(e){toast(errorMessage(e),"error")}finally{setTesting(false)}}

  async function jetztAusfuehren() {
    setLaufPending(true);
    try {
      const ergebnis = await apiRequest<{
        geprueft: number;
        gesendet: number;
        ohneEmpfaenger: number;
        fehlgeschlagen: number;
        zurueckgesetzt: number;
        abgeschaltet: boolean;
      }>("/api/jobs/agenda-reminders", { method: "POST" });

      toast(
        ergebnis.abgeschaltet
          ? "Die Erinnerung ist ausgeschaltet – es wurde nichts versendet."
          : `${ergebnis.gesendet} Erinnerung(en) versendet, ${ergebnis.geprueft} Organisation(en) geprüft.`,
        ergebnis.abgeschaltet ? "info" : "success",
      );
      router.refresh();
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setLaufPending(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-1 font-display text-base font-semibold">
        Erinnerung an fehlende Veranstaltungen
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Organisationen ohne kommende Veranstaltungen erhalten eine E-Mail an die zuständige
        Person. Der Lauf prüft täglich; erinnert wird erst wieder nach der eingestellten Frist.
      </p>

      <form onSubmit={speichern} className="space-y-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Checkbox
            checked={werte.enabled}
            onChange={(e) => setWerte({ ...werte, enabled: e.target.checked })}
          />
          Erinnerung aktiviert
        </label>

        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <Field label="Betreff" htmlFor="reminder-subject" required>
            <Input
              id="reminder-subject"
              value={werte.subject}
              onChange={(e) => setWerte({ ...werte, subject: e.target.value })}
              maxLength={200}
              required
            />
          </Field>
          <Field
            label="Erneut erinnern nach"
            htmlFor="reminder-cooldown"
            hint="Tagen"
            required
          >
            <Input
              id="reminder-cooldown"
              type="number"
              min={1}
              max={365}
              value={werte.cooldownDays}
              onChange={(e) => setWerte({ ...werte, cooldownDays: Number(e.target.value) })}
              required
            />
          </Field>
        </div>

        <Field
          label="Inhalt der E-Mail"
          htmlFor="reminder-body"
          required
          hint={`Verfügbare Platzhalter: ${AVAILABLE_PLACEHOLDERS.join(" ")}`}
        >
          <Textarea
            id="reminder-body"
            rows={10}
            value={werte.body}
            onChange={(e) => setWerte({ ...werte, body: e.target.value })}
            maxLength={4000}
            required
            className="font-mono text-xs"
          />
        </Field>

        <Field
          label="Beschriftung der Handlungsaufforderung"
          htmlFor="reminder-cta"
          hint="Erscheint als Hinweis über dem Link zum Erfassen einer Veranstaltung."
        >
          <Input
            id="reminder-cta"
            value={werte.ctaLabel}
            onChange={(e) => setWerte({ ...werte, ctaLabel: e.target.value })}
            maxLength={60}
          />
        </Field>

        <div>
          <p className="mb-2 text-sm font-medium">Vorschau mit Beispielwerten</p>
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-sm font-semibold">{vorschauBetreff}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {vorschauText}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">{werte.ctaLabel}</p>
          </div>
        </div>

        <div className="rounded-xl border p-3"><p className="mb-2 text-sm font-semibold">Erinnerung als Testmail versenden</p><div className="flex flex-wrap gap-2"><Input type="email" value={testTo} onChange={e=>setTestTo(e.target.value)} placeholder="test@beispiel.ch" aria-label="Empfänger für Erinnerungs-Testmail"/><Button type="button" variant="outline" disabled={testing||!testTo.trim()} onClick={testmail}>{testing?"Wird gesendet …":"Testmail senden"}</Button></div></div>

        {!werte.enabled ? (
          <Alert variant="info">
            Die Erinnerung ist ausgeschaltet. Es werden keine E-Mails versendet, der
            Erinnerungsstand der Organisationen wird aber weiterhin zurückgesetzt, sobald wieder
            ein Termin erfasst ist.
          </Alert>
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          <Button type="submit" variant="primary" disabled={pending}>
            {pending ? <Spinner /> : <Save />}
            Speichern
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={jetztAusfuehren}
            disabled={laufPending}
          >
            {laufPending ? <Spinner /> : <Play />}
            Lauf jetzt ausführen
          </Button>
        </div>
      </form>
    </Card>
  );
}
