import Link from "next/link";
import { revalidatePath } from "next/cache";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireStaffPage } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";
import { parseRoadmap, roadmapKey, roadmapManual, roadmapSignals, roadmapSources, ROADMAP_GROUP } from "@/lib/admin-roadmap";
import { notFound } from "next/navigation";
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
  const note = String(form.get("note") ?? "").slice(0, 4000);
  const contactPerson = String(form.get("contactPerson") ?? "").trim().slice(0, 200);
  const contactEmail = String(form.get("contactEmail") ?? "").trim().slice(0, 254);
  const crmStatus = String(form.get("crmStatus") ?? "IMPORTED");
  if (!["IMPORTED","CONTACTED","REPLIED","CLAIMED","CUSTOMER","NOT_INTERESTED","UNREACHABLE"].includes(crmStatus)) throw new Error("Ungültiger Akquise-Status");
  if (contactEmail && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(contactEmail)) throw new Error("Ungültige Kontakt-E-Mail");
  const checked = roadmapManual.filter(s => form.get(s.key) === "on").map(s => s.key);
  const key = roadmapKey(id);
  const existing = await prisma.siteSetting.findUnique({ where: { key }, select: { value: true } });
  const previous = existing ? parseRoadmap(existing.value) : null;
  const submittedVersion = String(form.get("version") ?? "");
  if (existing && submittedVersion !== (previous?.updatedAt ?? "")) throw new Error("Dieser Prozess wurde zwischenzeitlich geändert. Bitte Seite neu laden und Änderungen erneut prüfen.");
  if (!existing && submittedVersion) throw new Error("Der Prozess wurde zwischenzeitlich geändert. Bitte Seite neu laden.");
  const next = { source, status, due, note, contactPerson, contactEmail, crmStatus, checked, updatedAt: new Date().toISOString(), updatedBy: context.user.id };
  const changes: string[] = [];
  if (!previous || previous.source !== source) changes.push("Einstieg: " + source);
  if (!previous || previous.status !== status) changes.push("Status: " + status);
  if (!previous || previous.due !== due) changes.push("Wiedervorlage: " + (due || "entfernt"));
  if (!previous || previous.note !== note) changes.push("Notiz geändert");
  if (!previous || previous.contactPerson !== contactPerson || previous.contactEmail !== contactEmail) changes.push("Kontakt aktualisiert");
  if (!previous || previous.crmStatus !== crmStatus) changes.push("Akquise-Status aktualisiert");
  if (!previous || checked.join(",") !== previous.checked.join(",")) changes.push("Checkliste aktualisiert");
  await prisma.$transaction(async tx => {
    // Serialize updates to the same roadmap case and recheck the submitted version.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))::text AS lock_result`;
    const current = await tx.siteSetting.findUnique({ where: { key }, select: { value: true } });
    const currentVersion = current ? parseRoadmap(current.value).updatedAt ?? "" : "";
    if (currentVersion !== submittedVersion || Boolean(current) !== Boolean(existing)) {
      throw new Error("Dieser Prozess wurde inzwischen geändert. Bitte neu laden.");
    }
    await tx.siteSetting.upsert({ where: { key }, create: { key, group: ROADMAP_GROUP, label: "Interner Kundenprozess", value: next }, update: { value: next } });
    if (changes.length) await tx.auditLog.create({ data: { action: "ROADMAP_UPDATED", entity: "Organization", entityId: id, entityLabel: org.name, userId: context.user.id, userLabel: context.user.name, before: previous ? JSON.parse(JSON.stringify(previous)) : undefined, after: { changes, state: next } } });
  });
  revalidatePath("/dashboard/admin-roadmap");
  revalidatePath("/dashboard/admin-roadmap/" + id);
}


export default async function RoadmapOrganizationPage({params}:{params:Promise<{id:string}>}) {
 await requireStaffPage();
 const {id}=await params;
 const selected=await prisma.organization.findUnique({where:{id},select:{id:true,name:true}});
 if(!selected)notFound();
 const setting=await prisma.siteSetting.findUnique({where:{key:roadmapKey(id)},select:{value:true}});
 const state=setting?parseRoadmap(setting.value):undefined;
 const details=await roadmapSignals(id);
 const history=await prisma.auditLog.findMany({where:{entity:"Organization",entityId:id,action:"ROADMAP_UPDATED"},orderBy:{createdAt:"desc"},take:50,select:{id:true,createdAt:true,userLabel:true,after:true}});
 const statusLabels:Record<string,string>={ACTIVE:"Aktiv",WAITING:"Warten auf Kunde",PAUSED:"Pausiert",DONE:"Abgeschlossen",CANCELLED:"Abgebrochen"};
 return <div className="space-y-5">
  <Link href="/dashboard/admin-roadmap" className="text-sm font-semibold text-primary hover:underline">← Zur Admin-Roadmap</Link>
  <PageHeader title={selected.name} description="Kundenprozess, automatische Meilensteine, manuelle Aufgaben und Änderungshistorie." />
      <section className="space-y-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">{selected.name}</h2><Link href={`/dashboard/organisationen/${selected.id}`} className="text-sm underline">Organisation öffnen</Link></div>
      <h3 className="font-semibold">Automatisch erkannte Meilensteine</h3>
      <p className="text-xs text-muted-foreground">Live aus Organisationsprofil, CRM, Boarding-Einladungen, Account und Abonnement. Nicht relevante Meilensteine können offen bleiben.</p>
      <div className="grid gap-2 sm:grid-cols-2">{details.signals.map(s => <div key={s.key} className={"rounded-lg border p-3 text-sm " + (s.done ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-200" : "border-slate-200 bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300")}>{s.done ? "✓" : "○"} {s.label}</div>)}</div>
      {details.pendingClaim && <p className="rounded-lg border border-amber-500/40 p-3 text-sm">Eine Profilbeanspruchung wartet auf Prüfung. Vor Freigabe die Berechtigung verifizieren.</p>}
      {details.invitation && <div className="grid gap-2 sm:grid-cols-3"><div className="rounded-lg border bg-card p-3 text-sm"><strong>Boarding-Mail</strong><p>{details.invitation.status}</p></div><div className="rounded-lg border border-sky-300 bg-sky-50 p-3 text-sm dark:bg-sky-950/20"><strong>Einladungslink</strong><p>{details.invitation.openCount ? "Geöffnet (" + details.invitation.openCount + "×)" : "Noch nicht geöffnet"}</p></div><div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm dark:bg-emerald-950/20"><strong>Account</strong><p>{details.invitation.acceptedAt ? "Erstellt am " + details.invitation.acceptedAt.toLocaleDateString("de-CH") : "Noch nicht erstellt"}</p></div></div>}
      <form action={save} className="space-y-4 border-t pt-4">
      <div className="rounded-xl border bg-muted/20 p-4">
        <h3 className="mb-3 font-semibold">Kontakt & Akquise</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Ansprechperson<input name="contactPerson" defaultValue={contactPerson} maxLength={200} className="mt-1 w-full rounded-lg border bg-background p-2" /></label>
          <label className="text-sm">Kontakt-E-Mail<input name="contactEmail" type="email" defaultValue={contactEmail} maxLength={254} className="mt-1 w-full rounded-lg border bg-background p-2" /></label>
          <label className="text-sm sm:col-span-2">Akquise-Status<select name="crmStatus" defaultValue={acquisitionStatus} className="mt-1 w-full rounded-lg border bg-background p-2">
            <option value="IMPORTED">Nicht kontaktiert</option><option value="CONTACTED">Kontaktiert</option><option value="REPLIED">Antwort erhalten</option><option value="CLAIMED">Profil übernommen</option><option value="CUSTOMER">Kunde</option><option value="NOT_INTERESTED">Kein Interesse</option><option value="UNREACHABLE">Nicht erreichbar</option>
          </select></label>
        </div>
        {details.invitation ? <p className="mt-2 text-xs text-muted-foreground">Boarding-Einladung an {details.invitation.email} · {details.invitation.sentAt.toLocaleDateString("de-CH")}</p> : null}
      </div>
        <input type="hidden" name="organizationId" value={selected.id}/><input type="hidden" name="version" value={state?.updatedAt ?? ""}/>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Einstiegsweg<select name="source" defaultValue={state?.source ?? (details.pendingClaim ? "CLAIM" : details.invitation ? "BOARDING" : details.crmStatus === "CONTACTED" ? "ACQUISITION" : "CONTACT")} className="mt-1 w-full rounded-lg border bg-background p-2">{roadmapSources.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select></label>
          <label className="text-sm">Prozessstatus<select name="status" defaultValue={state?.status ?? "ACTIVE"} className="mt-1 w-full rounded-lg border bg-background p-2">{Object.entries(statusLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        </div>
        <h3 className="font-semibold">Manuelle Aufgaben</h3>
        {roadmapManual.map(s => <label key={s.key} className="flex items-center gap-2 text-sm"><input type="checkbox" name={s.key} defaultChecked={state?.checked.includes(s.key) ?? false}/><span>{s.label} <Link href={s.href} className="text-xs text-muted-foreground underline">Modul öffnen</Link></span></label>)}
        <label className="block text-sm">Wiedervorlage<input name="due" type="date" defaultValue={dueDate} className="mt-1 block rounded-lg border bg-background p-2"/></label>
        <label className="block text-sm">Interne Notiz<textarea name="note" rows={3} maxLength={4000} defaultValue={notes} className="mt-1 w-full rounded-lg border bg-background p-2"/></label>
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Prozess speichern</button>
      </form>
      <div className="border-t pt-4"><h3 className="mb-2 font-semibold">Änderungshistorie</h3>{history.length ? <div className="space-y-2">{history.map(entry => {const after = entry.after && typeof entry.after === "object" && !Array.isArray(entry.after) ? entry.after as Record<string, unknown> : {};return <div key={entry.id} className="rounded-lg bg-muted/40 p-3 text-xs"><span className="font-medium">{entry.createdAt.toLocaleString("de-CH")} · {entry.userLabel ?? "System"}</span><div>{Array.isArray(after.changes) ? after.changes.join(" · ") : "Prozess aktualisiert"}</div></div>})}</div> : <p className="text-sm text-muted-foreground">Noch keine Änderungen.</p>}</div>
    </section>

 </div>;
}