import Link from "next/link";
import { revalidatePath } from "next/cache";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireStaffPage } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";
import { parseRoadmap, roadmapDue, roadmapKey, roadmapManual, roadmapSignals, roadmapSources, ROADMAP_GROUP } from "@/lib/admin-roadmap";

export const dynamic = "force-dynamic";

async function save(form: FormData) {
  "use server";
  const context = await requireStaffPage();
  const id = String(form.get("organizationId") ?? "");
  if (!id || id.length > 100) throw new Error("Ungültige Organisation");
  const org = await prisma.organization.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!org) throw new Error("Organisation nicht gefunden");
  const source = String(form.get("source") ?? "CONTACT");
  const status = String(form.get("status") ?? "ACTIVE");
  if (!roadmapSources.some(s => s.key === source) || !["ACTIVE","WAITING","PAUSED","DONE","CANCELLED"].includes(status)) throw new Error("Ungültiger Status");
  const due = String(form.get("due") ?? "");
  if (due && (!/^\d{4}-\d{2}-\d{2}$/.test(due) || Number.isNaN(Date.parse(due)))) throw new Error("Ungültiges Datum");
  const note = String(form.get("note") ?? "").slice(0, 2000);
  const checked = roadmapManual.filter(s => form.get(s.key) === "on").map(s => s.key);
  const key = roadmapKey(id);
  const existing = await prisma.siteSetting.findUnique({ where: { key }, select: { value: true } });
  const previous = existing ? parseRoadmap(existing.value) : null;
  const submittedVersion = String(form.get("version") ?? "");
  if (existing && submittedVersion !== (previous?.updatedAt ?? "")) throw new Error("Dieser Prozess wurde zwischenzeitlich geändert. Bitte Seite neu laden und Änderungen erneut prüfen.");
  if (!existing && submittedVersion) throw new Error("Der Prozess wurde zwischenzeitlich geändert. Bitte Seite neu laden.");
  const next = { source, status, due, note, checked, updatedAt: new Date().toISOString(), updatedBy: context.user.id };
  const changes: string[] = [];
  if (!previous || previous.source !== source) changes.push("Einstieg: " + source);
  if (!previous || previous.status !== status) changes.push("Status: " + status);
  if (!previous || previous.due !== due) changes.push("Wiedervorlage: " + (due || "entfernt"));
  if (!previous || previous.note !== note) changes.push("Notiz geändert");
  if (!previous || checked.join(",") !== previous.checked.join(",")) changes.push("Checkliste aktualisiert");
  await prisma.$transaction(async tx => {
    // Serialize updates to the same roadmap case and recheck the submitted version.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
    const current = await tx.siteSetting.findUnique({ where: { key }, select: { value: true } });
    const currentVersion = current ? parseRoadmap(current.value).updatedAt ?? "" : "";
    if (currentVersion !== submittedVersion || Boolean(current) !== Boolean(existing)) {
      throw new Error("Dieser Prozess wurde inzwischen geändert. Bitte neu laden.");
    }
    await tx.siteSetting.upsert({ where: { key }, create: { key, group: ROADMAP_GROUP, label: "Interner Kundenprozess", value: next }, update: { value: next } });
    if (changes.length) await tx.auditLog.create({ data: { action: "ROADMAP_UPDATED", entity: "Organization", entityId: id, entityLabel: org.name, userId: context.user.id, userLabel: context.user.name, before: previous ? JSON.parse(JSON.stringify(previous)) : undefined, after: { changes, state: next } } });
  });
  revalidatePath("/dashboard/admin-roadmap");
}

export default async function AdminRoadmapPage({ searchParams }: { searchParams: Promise<{ org?: string; q?: string; filter?: string }> }) {
  await requireStaffPage();
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 100);
  const saved = await prisma.siteSetting.findMany({ where: { group: ROADMAP_GROUP }, select: { key: true, value: true } });
  const states = new Map(saved.filter(s => s.key.startsWith("admin-roadmap:")).map(s => [s.key.slice("admin-roadmap:".length), parseRoadmap(s.value)]));
  const trackedIds = [...states.keys()];
  const [organizations, trackedOrgs] = await Promise.all([
    prisma.organization.findMany({ where: q ? { name: { contains: q, mode: "insensitive" } } : {}, orderBy: { name: "asc" }, take: 100, select: { id: true, name: true } }),
    trackedIds.length ? prisma.organization.findMany({ where: { id: { in: trackedIds } }, select: { id: true, name: true } }) : Promise.resolve([] as { id: string; name: string }[]),
  ]);
  const selected = params.org ? await prisma.organization.findUnique({ where: { id: params.org }, select: { id: true, name: true } }) : null;
  const state = selected ? states.get(selected.id) : undefined;
  const details = selected ? await roadmapSignals(selected.id) : null;
  const history = selected ? await prisma.auditLog.findMany({ where: { entity: "Organization", entityId: selected.id, action: "ROADMAP_UPDATED" }, orderBy: { createdAt: "desc" }, take: 25, select: { id: true, createdAt: true, userLabel: true, after: true } }) : [];
  const dueItems = trackedOrgs.filter(o => { const s = states.get(o.id); return s && roadmapDue(s); });
  const active = trackedOrgs.filter(o => !["DONE","CANCELLED"].includes(states.get(o.id)?.status ?? ""));
  const statusLabels: Record<string,string> = { ACTIVE: "Aktiv", WAITING: "Warten auf Kunde", PAUSED: "Pausiert", DONE: "Abgeschlossen", CANCELLED: "Abgebrochen" };
  return <div className="space-y-6">
    <PageHeader title="Admin Roadmap" description="Interne Steuerung der Kundengewinnung, des Onboardings und der Betreuung – nur für Admin und Team." />
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[
      ["Aktive Prozesse", active.length],
      ["Warten auf Kunde", trackedOrgs.filter(o => states.get(o.id)?.status === "WAITING").length],
      ["Wiedervorlagen fällig", dueItems.length],
      ["Abgeschlossen", trackedOrgs.filter(o => states.get(o.id)?.status === "DONE").length],
    ].map(([label,value]) => <div key={label} className="rounded-xl border bg-card p-4"><div className="text-2xl font-bold">{value}</div><div className="text-sm text-muted-foreground">{label}</div></div>)}</div>
    {dueItems.length > 0 && <section className="rounded-xl border border-amber-500/40 p-4"><h2 className="mb-2 font-semibold">Fällige Wiedervorlagen</h2><div className="grid gap-2">{dueItems.slice(0, 30).map(o => <Link key={o.id} href={`/dashboard/admin-roadmap?org=${encodeURIComponent(o.id)}`} className="rounded-lg bg-muted/40 p-3 text-sm hover:underline">{o.name} · {states.get(o.id)?.due}</Link>)}</div></section>}
    <section className="space-y-3 rounded-xl border p-4">
      <h2 className="text-lg font-semibold">Kundenprozesse</h2>
      <form action="/dashboard/admin-roadmap" className="flex gap-2"><input name="q" defaultValue={q} placeholder="Organisation suchen …" className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm"/><button className="rounded-lg border px-4 py-2 text-sm">Suchen</button></form>
      <p className="text-xs text-muted-foreground">Die Suche zeigt maximal 100 Organisationen. Ein Prozess wird erst beim ersten Speichern aktiviert.</p>
      <div className="grid gap-2 sm:grid-cols-2">{organizations.map(o => <Link key={o.id} href={`/dashboard/admin-roadmap?org=${encodeURIComponent(o.id)}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className="rounded-lg border p-3 hover:bg-muted/40"><div className="font-medium">{o.name}</div><div className="text-xs text-muted-foreground">{states.has(o.id) ? statusLabels[states.get(o.id)?.status ?? "ACTIVE"] : "Noch kein Prozess"}</div></Link>)}</div>
    </section>
    {selected && details && <section className="space-y-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">{selected.name}</h2><Link href={`/dashboard/organisationen/${selected.id}`} className="text-sm underline">Organisation öffnen</Link></div>
      <h3 className="font-semibold">Automatisch erkannte Meilensteine</h3>
      <p className="text-xs text-muted-foreground">Live aus Organisationsprofil, CRM, Boarding-Einladungen, Account und Abonnement. Nicht relevante Meilensteine können offen bleiben.</p>
      <div className="grid gap-2 sm:grid-cols-2">{details.signals.map(s => <div key={s.key} className="rounded-lg bg-muted/40 p-3 text-sm">{s.done ? "✓" : "○"} {s.label}</div>)}</div>
      {details.pendingClaim && <p className="rounded-lg border border-amber-500/40 p-3 text-sm">Eine Profilbeanspruchung wartet auf Prüfung. Vor Freigabe die Berechtigung verifizieren.</p>}
      {details.invitation && <p className="text-sm text-muted-foreground">Letzte Boarding-Einladung: {details.invitation.status} · {details.invitation.openCount} Öffnungen · Ablauf {details.invitation.expiresAt.toLocaleDateString("de-CH")}</p>}
      <form action={save} className="space-y-4 border-t pt-4">
        <input type="hidden" name="organizationId" value={selected.id}/><input type="hidden" name="version" value={state?.updatedAt ?? ""}/>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Einstiegsweg<select name="source" defaultValue={state?.source ?? (details.pendingClaim ? "CLAIM" : details.invitation ? "BOARDING" : details.crmStatus === "CONTACTED" ? "ACQUISITION" : "CONTACT")} className="mt-1 w-full rounded-lg border bg-background p-2">{roadmapSources.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select></label>
          <label className="text-sm">Prozessstatus<select name="status" defaultValue={state?.status ?? "ACTIVE"} className="mt-1 w-full rounded-lg border bg-background p-2">{Object.entries(statusLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        </div>
        <h3 className="font-semibold">Manuelle Aufgaben</h3>
        {roadmapManual.map(s => <label key={s.key} className="flex items-center gap-2 text-sm"><input type="checkbox" name={s.key} defaultChecked={state?.checked.includes(s.key) ?? false}/><span>{s.label} <Link href={s.href} className="text-xs text-muted-foreground underline">Modul öffnen</Link></span></label>)}
        <label className="block text-sm">Wiedervorlage<input name="due" type="date" defaultValue={state?.due ?? ""} className="mt-1 block rounded-lg border bg-background p-2"/></label>
        <label className="block text-sm">Interne Notiz<textarea name="note" rows={3} maxLength={2000} defaultValue={state?.note ?? ""} className="mt-1 w-full rounded-lg border bg-background p-2"/></label>
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Prozess speichern</button>
      </form>
      <div className="border-t pt-4"><h3 className="mb-2 font-semibold">Änderungshistorie</h3>{history.length ? <div className="space-y-2">{history.map(entry => {const after = entry.after && typeof entry.after === "object" && !Array.isArray(entry.after) ? entry.after as Record<string, unknown> : {};return <div key={entry.id} className="rounded-lg bg-muted/40 p-3 text-xs"><span className="font-medium">{entry.createdAt.toLocaleString("de-CH")} · {entry.userLabel ?? "System"}</span><div>{Array.isArray(after.changes) ? after.changes.join(" · ") : "Prozess aktualisiert"}</div></div>})}</div> : <p className="text-sm text-muted-foreground">Noch keine Änderungen.</p>}</div>
    </section>}
    <section className="space-y-3 rounded-xl border p-4"><h2 className="text-lg font-semibold">Prozesshandbuch</h2><p className="text-sm text-muted-foreground">Jeder Einstieg führt über Identitätsprüfung und Accountzuordnung zum Profil, selbstständig gebuchten Tarif und zur Veröffentlichung. Danach beginnt die laufende Betreuung.</p>{roadmapSources.map(s => <div key={s.key} className="rounded-lg border p-3"><div className="font-medium">{s.label}</div><p className="my-1 text-sm text-muted-foreground">{s.guide}</p><Link href={s.href} className="text-sm underline">Zum zuständigen Modul</Link></div>)}</section>
  </div>;
}
