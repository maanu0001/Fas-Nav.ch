"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { TICKET_CATEGORY_LABELS, TICKET_PRIORITY_LABELS } from "@/lib/constants";
import { apiRequest, errorMessage, fieldErrors } from "@/lib/client-api";

export function NewTicketForm({
  organizations,
  defaultOrganizationId,
  suggestion = false,
}: {
  organizations: { id: string; name: string }[];
  defaultOrganizationId?: string;
  suggestion?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setErrors({});
    setFormError(null);

    const data = new FormData(event.currentTarget);

    try {
      const ticket = await apiRequest<{ id: string }>("/api/tickets", {
        method: "POST",
        body: {
          subject: suggestion ? "Funktionsvorschlag: " + String(data.get("subject")) : data.get("subject"),
          category: suggestion ? "GENERAL" : data.get("category"),
          priority: data.get("priority"),
          message: data.get("message"),
          organizationId: data.get("organizationId") || null,
        },
      });
      router.push(`/dashboard/tickets/${ticket.id}`);
    } catch (error) {
      setErrors(fieldErrors(error));
      setFormError(errorMessage(error));
      setPending(false);
    }
  }

  return (
    <Card className="max-w-2xl p-6">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {formError ? <Alert variant="error">{formError}</Alert> : null}

        {organizations.length > 1 || !defaultOrganizationId ? (
          <Field
            label="Organisation"
            htmlFor="organizationId"
            error={errors.organizationId}
            required={organizations.length > 0}
          >
            <Select
              id="organizationId"
              name="organizationId"
              defaultValue={defaultOrganizationId ?? ""}
            >
              <option value="">Keine Organisation / allgemeine Anfrage</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <input type="hidden" name="organizationId" value={defaultOrganizationId} />
        )}

        <Field label="Betreff" htmlFor="subject" required error={errors.subject}>
          <Input
            id="subject"
            name="subject"
            required
            maxLength={160}
            placeholder={suggestion ? "Welche neue Funktion wünschst du dir?" : "Kurze Zusammenfassung deines Anliegens"}
          />
        </Field>

        {!suggestion ? <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kategorie" htmlFor="category" error={errors.category}>
            <Select id="category" name="category" defaultValue="GENERAL">
              {Object.entries(TICKET_CATEGORY_LABELS)
                .filter(([value]) => value !== "CONTACT")
                .map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
            </Select>
          </Field>

          <Field label="Priorität" htmlFor="priority" error={errors.priority}>
            <Select id="priority" name="priority" defaultValue="NORMAL">
              {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div> : <input type="hidden" name="priority" value="NORMAL" />}

        <Field
          label="Nachricht"
          htmlFor="message"
          required
          error={errors.message}
          hint={suggestion ? "Beschreibe den Nutzen und wie die Funktion aussehen könnte." : "Beschreibe dein Anliegen möglichst konkret – das hilft uns beim schnellen Antworten."}
        >
          <Textarea id="message" name="message" rows={7} required maxLength={5000} />
        </Field>

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Spinner /> : <Send />}
          {pending ? "Wird gesendet …" : suggestion ? "Funktionsvorschlag absenden" : "Ticket erstellen"}
        </Button>
      </form>
    </Card>
  );
}
