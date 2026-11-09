"use client";
import { useEffect, useState } from "react";
type Entry = { id: string; createdAt: string; databaseBytes: number; uploadsBytes: number; verified: boolean; restoreTest?: { status: "passed" | "failed"; checkedAt: string } };
export function BackupCenter() {
  const [items, setItems] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [databaseFile, setDatabaseFile] = useState<File | null>(null);
  const [uploadsFile, setUploadsFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function refresh() {
    try {
      const response = await fetch("/api/admin/backups", { cache: "no-store" });
      if (!response.ok) throw new Error("Backups konnten nicht geladen werden");
      const data = await response.json();
      setItems(data.backups);
    } catch (e) { setError(e instanceof Error ? e.message : "Unbekannter Fehler"); }
  }
  useEffect(() => { void refresh(); }, []);
  async function create() {
    if (!window.confirm("Jetzt eine vollständige Sicherung von Datenbank und Uploads erstellen?")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/backups", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!response.ok) { const data = await response.json().catch(() => null); throw new Error(`Backup konnte nicht erstellt werden (HTTP ${response.status}): ${data?.error || "Keine Servermeldung"}`); }
      setNotice("Backup erfolgreich erstellt und geprüft.");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Unbekannter Fehler"); }
    finally { setBusy(false); }
  }
  async function test(id: string) {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/backups/${id}/test`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Restore-Prüfung fehlgeschlagen");
      setNotice("Datenbank auf separatem Testserver wiederhergestellt und Medienarchiv isoliert entpackt und geprüft.");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Restore-Prüfung fehlgeschlagen"); }
    finally { setBusy(false); }
  }
  async function importFiles() {
    if (!databaseFile || !uploadsFile) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const form = new FormData();
      form.set("database", databaseFile);
      form.set("uploads", uploadsFile);
      const response = await fetch("/api/admin/backups/import", { method: "POST", body: form });
      if (!response.ok) { const data = await response.json().catch(() => null); throw new Error(`Importprüfung fehlgeschlagen (HTTP ${response.status}): ${data?.error || "Keine Servermeldung"}`); }
      setNotice("Dateien erfolgreich geprüft und als Backup abgelegt. Die produktive Datenbank wurde nicht verändert.");
      setDatabaseFile(null); setUploadsFile(null);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Import fehlgeschlagen"); }
    finally { setBusy(false); }
  }
  const size = (n: number) => (n / 1048576).toFixed(1) + " MB";
  return <div className="space-y-5">
    <section className="rounded-xl border bg-card p-5 space-y-3">
      <h2 className="text-lg font-semibold">Vollständiges Backup erstellen</h2>
      <p className="text-sm text-muted-foreground">Sichert die PostgreSQL-Datenbank und alle Uploads in zwei verifizierten Dateien. Während der Sicherung keine grösseren Datenänderungen vornehmen.</p>
      <button type="button" disabled={busy} onClick={create} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? "Backup wird erstellt …" : "Backup erstellen"}</button>
      {notice && <p role="status" className="text-sm">{notice}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </section>
    <section className="rounded-xl border bg-card p-5 space-y-3">
      <h2 className="text-lg font-semibold">Backup-Verlauf</h2>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">Noch keine Backups im Backup-Verzeichnis vorhanden.</p> : <div className="space-y-3">{items.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
        <div><p className="font-medium">{new Date(item.createdAt).toLocaleString("de-CH", { timeZone: "Europe/Zurich" })}</p><p className="text-xs text-muted-foreground">Datenbank {size(item.databaseBytes)} · Medien {size(item.uploadsBytes)} · {item.verified ? "Archiv geprüft" : "Nicht verifiziert"} · Restore-Test: {item.restoreTest?.status === "passed" ? "Bestanden" : item.restoreTest?.status === "failed" ? "Fehlgeschlagen" : "Ausstehend"}</p></div>
        <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => test(item.id)} className="rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50">Restore testen</button><a className="rounded-lg border px-3 py-2 text-sm hover:bg-muted" href={`/api/admin/backups/${item.id}/database`}>Datenbank herunterladen</a><a className="rounded-lg border px-3 py-2 text-sm hover:bg-muted" href={`/api/admin/backups/${item.id}/uploads`}>Medien herunterladen</a></div>
      </div>)}</div>}
    </section>
    <section className="rounded-xl border border-amber-500/40 p-5 space-y-2">
      <h2 className="text-lg font-semibold">Wiederherstellung</h2>
      <p className="text-sm text-muted-foreground">Lade die beiden Dateien einer Sicherung hoch. Das System prüft die Archivstruktur und legt sie erst danach im Backup-Verlauf ab.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">PostgreSQL-Dump (.dump)<input aria-label="Datenbankdatei" className="mt-1 block w-full text-sm" type="file" accept=".dump" onChange={e => setDatabaseFile(e.target.files?.[0] ?? null)}/></label>
        <label className="text-sm">Medienarchiv (.tar.gz)<input aria-label="Mediendatei" className="mt-1 block w-full text-sm" type="file" accept=".gz,.tgz" onChange={e => setUploadsFile(e.target.files?.[0] ?? null)}/></label>
      </div>
      <button type="button" disabled={busy || !databaseFile || !uploadsFile} onClick={importFiles} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50">Backup prüfen und ablegen</button>
      <p className="text-sm text-muted-foreground">Ein direkter Import in die laufende Produktionsdatenbank ist aus Sicherheitsgründen gesperrt. Vollständige und selektive Wiederherstellungen erfordern eine isolierte Testumgebung, eine geprüfte Sicherung und die Freigabe des Betreibers. Eine automatische selektive Wiederherstellung ist noch nicht implementiert. Über «Restore testen» wird die Datenbank auf dem separat konfigurierten Testserver probeweise eingespielt.</p>
    </section>
  </div>;
}
