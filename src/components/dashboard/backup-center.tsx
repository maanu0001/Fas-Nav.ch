"use client";
import { useEffect, useState } from "react";
type Entry = { id: string; createdAt: string; databaseBytes: number; uploadsBytes: number; verified: boolean; restoreTest?: { status: "passed" | "failed"; checkedAt: string } };
export function BackupCenter() {
  const [items, setItems] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const [selectedRestore, setSelectedRestore] = useState("");
  const [restoreConfirmation, setRestoreConfirmation] = useState("");
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
  async function restore() {
    if (!selectedRestore || restoreConfirmation !== selectedRestore) return;
    if (!window.confirm("ACHTUNG: Das gesamte produktive System wird auf den gewählten Backup-Stand zurückgesetzt. Fortfahren?")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/admin/backups/${selectedRestore}/restore`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: restoreConfirmation }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Restore-Auftrag fehlgeschlagen");
      setNotice("Wiederherstellungsauftrag an GitHub Actions übergeben. Die Ausführung erfolgt nur, wenn der Wartungsmodus auf dem Host bestätigt ist. Status im Workflow prüfen.");
      setRestoreConfirmation("");
    } catch (e) { setError(e instanceof Error ? e.message : "Restore-Auftrag fehlgeschlagen"); }
    finally { setBusy(false); }
  }
  const restoreEntry = items.find(item => item.id === selectedRestore);
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
    <section className="rounded-xl border border-amber-500/40 p-5 space-y-3">
      <h2 className="text-lg font-semibold">Vollständige Systemwiederherstellung vorbereiten</h2>
      <p className="text-sm text-muted-foreground">Wähle ein erfolgreich getestetes Backup. Die Wiederherstellung umfasst die gesamte Datenbank und alle Uploads. Sie muss ausserhalb des Webservers auf dem Produktionshost im Wartungsmodus ausgeführt werden, damit die Anwendung sich nicht während der Ausführung selbst beendet.</p>
      <label className="block text-sm">Backup auswählen
        <select aria-label="Backup für vollständige Wiederherstellung" value={selectedRestore} onChange={e => { setSelectedRestore(e.target.value); setRestoreConfirmation(""); }} className="mt-1 block w-full rounded-lg border bg-background p-2">
          <option value="">Backup wählen</option>
          {items.filter(item => item.verified && item.restoreTest?.status === "passed").map(item => <option key={item.id} value={item.id}>{new Date(item.createdAt).toLocaleString("de-CH", { timeZone: "Europe/Zurich" })} · {item.id}</option>)}
        </select>
      </label>
      {restoreEntry && <div className="space-y-2 rounded-lg border p-3">
        <p className="text-sm font-medium">Ausgewählt: {restoreEntry.id}</p>
        <p className="text-xs text-muted-foreground">Vor Ausführung: Wartungsseite aktivieren, externe Schreibzugriffe stoppen, Backup-Dateien extern sichern und Wiederherstellung auf einer separaten Instanz prüfen. Das Skript erstellt einen zusätzlichen Rollback-Snapshot.</p>
        <label className="block text-sm">Backup-ID zur Bestätigung vollständig eingeben
          <input value={restoreConfirmation} onChange={e => setRestoreConfirmation(e.target.value)} autoComplete="off" spellCheck={false} className="mt-1 block w-full rounded-lg border bg-background p-2" placeholder={restoreEntry.id} />
        </label>
        <button type="button" disabled={busy || restoreConfirmation !== selectedRestore} onClick={() => { void restore(); }} className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-50">Vollständige Wiederherstellung starten</button>
        <p className="text-xs text-muted-foreground">Der Auftrag wird an einen separaten GitHub-Actions-Runner übergeben. Der Host muss bereits im Wartungsmodus sein und die Datei /opt/fas-nav/maintenance-confirmed mit Berechtigung 600 besitzen. Ohne diese Freigabe wird nichts wiederhergestellt.</p>
        <a className="text-sm underline" href="https://github.com/maanu0001/Fas-Nav.ch/actions/workflows/restore-production.yml" target="_blank" rel="noreferrer">Restore-Status in GitHub Actions öffnen</a>
      </div>}
    </section>
    <section className="rounded-xl border border-amber-500/40 p-5 space-y-2">
      <h2 className="text-lg font-semibold">Wiederherstellung</h2>
      <p className="text-sm text-muted-foreground">Lade die beiden Dateien einer Sicherung hoch. Das System prüft die Archivstruktur und legt sie erst danach im Backup-Verlauf ab.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">PostgreSQL-Dump (.dump)<input aria-label="Datenbankdatei" className="mt-1 block w-full text-sm" type="file" accept=".dump" onChange={e => setDatabaseFile(e.target.files?.[0] ?? null)}/></label>
        <label className="text-sm">Medienarchiv (.tar.gz)<input aria-label="Mediendatei" className="mt-1 block w-full text-sm" type="file" accept=".gz,.tgz" onChange={e => setUploadsFile(e.target.files?.[0] ?? null)}/></label>
      </div>
      <button type="button" disabled={busy || !databaseFile || !uploadsFile} onClick={importFiles} className="rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50">Backup prüfen und ablegen</button>
      <p className="text-sm text-muted-foreground">Ein direkter Import in die laufende Produktionsdatenbank ist aus Sicherheitsgründen gesperrt. Die vollständige Systemwiederherstellung erfordert eine isolierte Testumgebung, eine geprüfte Sicherung und die Freigabe des Betreibers. Über «Restore testen» wird die Datenbank auf dem separat konfigurierten Testserver probeweise eingespielt.</p>
    </section>
  </div>;
}
