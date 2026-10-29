"use client";

import * as React from "react";
import { Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/states";
import { apiRequest, errorMessage, fieldErrors } from "@/lib/client-api";

type PlanOption = { key: string; name: string };

export function ContactForm({
  defaultSubject = "",
  subjectPlaceholder,
  intro,
  organizationEntry = false,
  plans = [],
  defaultPlanKey = "",
}: {
  defaultSubject?: string;
  subjectPlaceholder?: string;
  intro?: string;
  organizationEntry?: boolean;
  plans?: PlanOption[];
  defaultPlanKey?: string;
}) {
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setFormError(null);

    const data = new FormData(event.currentTarget);

    try {
      await apiRequest("/api/contact", {
        method: "POST",
        body: {
          name: data.get("name"),
          email: data.get("email"),
          subject: data.get("subject"),
          message: data.get("message"),
          organizationName: data.get("organizationName") || null,
          phone: data.get("phone") || null,
          planKey: data.get("planKey") || null,
          website: data.get("website"),
        },
      });
      setSent(true);
      event.currentTarget.reset();
    } catch (error) {
      setErrors(fieldErrors(error));
      setFormError(errorMessage(error));
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <Alert variant="success" title="Nachricht erhalten – vielen Dank!">
        Deine Kontaktanfrage ist bei uns eingegangen. Wir melden uns so rasch wie möglich per E-Mail bei dir.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {intro ? <p className="text-sm text-muted-foreground">{intro}</p> : null}
      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" required error={errors.name}>
          <Input id="name" name="name" autoComplete="name" required maxLength={120} />
        </Field>
        <Field label="E-Mail" htmlFor="email" required error={errors.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required maxLength={200} />
        </Field>
      </div>

      {organizationEntry ? (
        <>
          <Field label="Name der Organisation (optional)" htmlFor="organizationName" error={errors.organizationName}>
            <Input id="organizationName" name="organizationName" maxLength={140} autoComplete="organization" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Telefonnummer (optional)" htmlFor="phone" error={errors.phone}>
              <Input id="phone" name="phone" type="tel" maxLength={40} autoComplete="tel" />
            </Field>
            <Field label="Gewünschter Tarif" htmlFor="planKey" error={errors.planKey}>
              <Select id="planKey" name="planKey" defaultValue={defaultPlanKey}>
                <option value="">Noch offen / beraten lassen</option>
                {plans.map((plan) => (
                  <option key={plan.key} value={plan.key}>{plan.name}</option>
                ))}
              </Select>
            </Field>
          </div>
        </>
      ) : null}

      <Field label="Betreff" htmlFor="subject" required error={errors.subject}>
        <Input id="subject" name="subject" defaultValue={defaultSubject} placeholder={subjectPlaceholder} required maxLength={160} />
      </Field>

      <Field label="Nachricht" htmlFor="message" required error={errors.message}>
        <Textarea id="message" name="message" rows={6} required maxLength={5000} />
      </Field>

      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Bitte leer lassen</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <p className="text-xs text-muted-foreground">
        Mit dem Absenden stimmst du der Bearbeitung deiner Angaben gemäss unserer{" "}
        <a href="/datenschutz" className="underline hover:text-foreground">Datenschutzerklärung</a>{" "}
        zu.
      </p>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? <Spinner /> : <Send />}
        {pending ? "Wird gesendet …" : "Nachricht senden"}
      </Button>
    </form>
  );
}
