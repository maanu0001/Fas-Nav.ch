"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { apiRequest, errorMessage } from "@/lib/client-api";

/**
 * Wartungsmodus ein- und ausschalten.
 *
 * Die Werte werden über den vorhandenen Einstellungs-Endpunkt gespeichert und
 * liegen damit in der Datenbank, nicht im Zustand des Browsers. Der Endpunkt
 * prüft die Berechtigung `manageSettings` serverseitig.
 */
export function MaintenanceSettings({
  enabled: initialEnabled,
  message: initialMessage,
}: {
  enabled: boolean;
  message: string;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [enabled, setEnabled] = React.useState(initialEnabled);
  const [message, setMessage] = React.useState(initialMessage);
  const [pending, setPending] = React.useState(false);

  async function speichern(event: React.FormEvent) {
    event.preventDefault();
    if (!enabled && initialEnabled && !window.confirm("Öffentliche Freigabe bestätigen? Vorher müssen Stripe-Testzahlungen, Zugriffsrollen, Impressum, Backups/Restore und Mobile-Ansichten geprüft sein.")) return;
    setPending(true);
    try {
      await apiRequest("/api/settings", {
        method: "PUT",
        body: {
          settings: [
            { key: "maintenance_enabled", value: enabled ? "true" : "false" },
            { key: "maintenance_message", value: message },
          ],
        },
      });
      toast(
        enabled
          ? "Wartungsmodus ist aktiv. Nur Administratoren sehen die Website."
          : "Wartungsmodus ist ausgeschaltet.",
        "success",
      );
      router.refresh();
    } catch (error) {
      toast(errorMessage(error), "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-1 flex items-center gap-2 font-display text-base font-semibold">
        <Wrench className="h-4 w-4 text-primary" aria-hidden />
        Wartungsmodus
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Bei aktivem Wartungsmodus sehen Besucherinnen und Besucher statt der Website eine
        Wartungsseite. Administratoren können sich weiterhin anmelden und normal arbeiten.
      </p>

      <form onSubmit={speichern} className="space-y-4">
        <label className="flex items-start gap-3 rounded-lg border border-border bg-secondary/60 p-3.5">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-[hsl(var(--primary))]"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium">Wartungsmodus aktivieren</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {enabled
                ? "Die Website ist für alle ausser Administratoren gesperrt."
                : "Die Website ist öffentlich erreichbar."}
            </span>
          </span>
        </label>

        <Field label="Wartungsnachricht" htmlFor="maintenance_message">
          <Textarea
            id="maintenance_message"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            placeholder="Fas-Nav.ch wird momentan aktualisiert. Wir sind in Kürze wieder für dich da."
          />
        </Field>

        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? <Spinner /> : <Save />}
          Wartungsmodus speichern
        </Button>
      </form>
    </Card>
  );
}
