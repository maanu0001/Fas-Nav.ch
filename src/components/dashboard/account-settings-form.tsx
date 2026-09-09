"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { apiRequest, errorMessage, fieldErrors } from "@/lib/client-api";

/**
 * Eigene Kontodaten.
 *
 * Die E-Mail-Adresse ist zugleich die Anmeldeadresse – es gibt bewusst keine
 * zweite Adresse nur für Meldungen, die dasselbe bedeuten würde. Sie ist
 * privat: Sie erscheint weder auf dem öffentlichen Profil noch bei anderen
 * Organisationen; die Kontaktadresse der Organisation steht getrennt davon
 * unter „Meine Seite".
 *
 * Der Endpunkt liest die Kennung aus der Sitzung. Ein fremdes Konto lässt
 * sich über dieses Formular nicht ändern, auch nicht durch Manipulation der
 * Anfrage.
 */
export function AccountSettingsForm({
  initial,
}: {
  initial: { name: string; email: string; ticketEmails: boolean };
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [werte, setWerte] = React.useState(initial);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, setPending] = React.useState(false);

  const unveraendert =
    werte.name === initial.name &&
    werte.email === initial.email &&
    werte.ticketEmails === initial.ticketEmails;

  async function speichern(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    try {
      await apiRequest("/api/account/profile", { method: "PATCH", body: werte });
      toast("Konto gespeichert.", "success");
      router.refresh();
    } catch (error) {
      setErrors(fieldErrors(error));
      toast(errorMessage(error), "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={speichern} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="account-name" error={errors.name}>
          <Input
            id="account-name"
            value={werte.name}
            onChange={(e) => setWerte({ ...werte, name: e.target.value })}
            maxLength={120}
            required
          />
        </Field>

        <Field
          label="E-Mail-Adresse"
          htmlFor="account-email"
          error={errors.email}
          hint="Zugleich deine Anmeldeadresse. Sie bleibt privat."
        >
          <Input
            id="account-email"
            type="email"
            value={werte.email}
            onChange={(e) => setWerte({ ...werte, email: e.target.value })}
            maxLength={200}
            required
          />
        </Field>
      </div>

      <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
        <Checkbox
          checked={werte.ticketEmails}
          onChange={(e) => setWerte({ ...werte, ticketEmails: e.target.checked })}
        />
        <span>
          E-Mail bei neuen Ticketantworten erhalten
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Die Meldung im Dashboard erscheint unabhängig davon weiterhin.
          </span>
        </span>
      </label>

      <Button type="submit" disabled={pending || unveraendert}>
        {pending ? <Spinner /> : <Save />}
        {pending ? "Wird gespeichert …" : "Speichern"}
      </Button>
    </form>
  );
}
