"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { apiRequest, errorMessage } from "@/lib/client-api";

type ContactStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

const labels: Record<ContactStatus, string> = {
  OPEN: "Neu",
  IN_PROGRESS: "In Bearbeitung",
  RESOLVED: "Erledigt",
};

export function ContactRequestActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const initial: ContactStatus =
    status === "IN_PROGRESS" ? "IN_PROGRESS" : status === "RESOLVED" || status === "CLOSED" ? "RESOLVED" : "OPEN";
  const [value, setValue] = React.useState<ContactStatus>(initial);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function save() {
    setPending(true);
    setError(null);
    try {
      await apiRequest(`/api/contact-requests/${id}`, {
        method: "PATCH",
        body: { status: value },
      });
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Select
        aria-label="Bearbeitungsstand"
        value={value}
        onChange={(event) => setValue(event.target.value as ContactStatus)}
        className="w-auto min-w-40"
      >
        {Object.entries(labels).map(([option, label]) => (
          <option key={option} value={option}>
            {label}
          </option>
        ))}
      </Select>
      <Button type="button" variant="outline" onClick={save} disabled={pending || value === initial}>
        {pending ? "Speichert …" : "Status speichern"}
      </Button>
      {error ? <span className="basis-full text-right text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
