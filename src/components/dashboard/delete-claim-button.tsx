"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteClaimButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    if (!window.confirm("Diese Profilübernahme-Anfrage endgültig löschen? Dies kann nicht rückgängig gemacht werden.")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/uebernahmeanfragen/" + encodeURIComponent(id), { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Löschen fehlgeschlagen.");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Löschen fehlgeschlagen.");
    } finally { setBusy(false); }
  }
  return <span className="inline-flex flex-col items-start gap-1">
    <button type="button" onClick={() => { void remove(); }} disabled={busy} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 disabled:opacity-50">{busy ? "Wird gelöscht …" : "Anfrage löschen"}</button>
    {error && <span role="alert" className="text-xs text-red-700">{error}</span>}
  </span>;
}
