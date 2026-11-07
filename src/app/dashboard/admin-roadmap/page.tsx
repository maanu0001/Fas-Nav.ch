import Link from "next/link";
import { revalidatePath } from "next/cache";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireStaffPage } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const sources = [
  { key: "ACQUISITION", name: "Akquise per E-Mail", description: "Organisation recherchieren, Akquise versenden, Antwort prüfen, Boarding-Mail senden.", href: "/dashboard/medien" },
  { key: "CLAIM", name: "Profilbeanspruchung", description: "Anfrage prüfen, Berechtigung bestätigen, Profilzugriff freigeben.", href: "/dashboard/kontaktanfragen" },
  { key: "SELF", name: "Selbstregistrierung", description: "Bestehendes Profil prüfen, Dubletten vermeiden, Account und Organisation zuordnen.", href: "/dashboard/accounts" },
  { key: "CONTACT", name: "Direkter Kontakt", description: "Anliegen klären, Kontaktperson festhalten, passenden Einstieg auswählen.", href: "/dashboard/kontaktanfragen" },
  { key: "BOARDING", name: "Boarding-Mail", description: "Organisation auswählen, Einladung versenden, Registrierung kontrollieren.", href: "/dashboard/medien" },
] as const;
const manual = [
  { key: "contact", title: "Kontakt und Interesse bestätigt", href: "/dashboard/medien" },
  { key: "identity", title: "Zuständigkeit / Identität geprüft", href: "/dashboard/kontaktanfragen" },
  { key: "invitation", title: "Boarding-Mail / Einladung versendet", href: "/dashboard/medien" },
  { key: "quality", title: "Profil und Inhalte geprüft", href: "/dashboard/organisationen" },
  { key: "handoff", title: "Kundenübergabe und Betreuung geklärt", href: "/dashboard/tickets" },
] as const;
type State = { source?: string; checked?: string[]; note?: string; due?: string; status?: string; updatedAt?: string; updatedBy?: string };
const keyFor = (id: string) => `admin-roadmap:${id}`;
function parse(value: unknown): State {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const v = value as Record<string, unknown>;
  return {
    source: typeof v.source === "string" ? v.source : undefined,
    checked: Array.isArray(v.checked) ? v.checked.filter((x): x is string => typeof x === "string") : [],
    note: typeof v.note === "string" ? v.note : "",
    due: typeof v.due === "string" ? v.due : "",
    status: typeof v.status === "string" ? v.status : "ACTIVE",
    updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : undefined,
    updatedBy: typeof v.updatedBy === "string" ? v.updatedBy : undefined,
  };
}
async function save(form: FormData) {
  "use server";
  const user = await requireStaffPage();
  const id = String(form.get("organizationId") ?? "");
  if (!id || id.length > 100) throw new Error("Ungültige Organisation");
  const exists = await prisma.organization.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new Error("Organisation nicht gefunden");
  const source = String(form.get("source") ?? "CONTACT");
  const status = String(form.get("status") ?? "ACTIVE");
  if (!sources.some(s => s.key === source) || !["ACTIVE", "WAITING", "PAUSED", "DONE", "CANCELLED"].includes(status)) throw new Error("Ungültiger Status");
  const note = String(form.get("note") ?? "").slice(0, 2000);
  const due = String(form.get("due") ?? "");
  if (due && !/^\\d{4}-\\d{2}-\\d{2}$/.test(due)) throw new Error("Ungültiges Datum");
  const checked = manual.filter(s => form.get(s.key) === "on").map(s => s.key);
  await prisma.siteSetting.upsert({
    where: { key: keyFor(id) },
    create: { key: keyFor(id), group: "admin-roadmap", label: "Interner Kundenprozess", value: { source, status, note, due, checked, updatedAt: new Date().toISOString(), updatedBy: user.user.id } },
    update: { value: { source, status, note, due, checked, updatedAt: new Date().toISOString(), updatedBy: user.user.id } },
  });
  revalidatePath("/dashboard/admin-roadmap");
}
export default async function AdminRoadmapPage({ searchParams }: { searchParams: Promise<{ org?: string; q?: string }> }) {
  await requireStaffPage();
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 100);
  const [organizations, saved] = await Promise.all([
    prisma.organization.findMany({
      where: q ? { name: { contains: q, mode: "insensitive" } } : {},
      orderBy: { name: "asc" }, take: 100,
      select: { id: true, name: true, type: true, status: true, claimStatus: true, onboardingCompleted: true, contactEmail: true, logoId: true, description: true, memberships: { select: { id: true }, take: 1 }, claimRequests: { select: { status: true }, orderBy: { createdAt: "desc" }, take: 1 }, subscription: { select: { status: true } }, _count: { select: { events: true } } },
    }),
    prisma.siteSetting.findMany({ where: { group: "admin-roadmap" }, select: { key: true, value: true } }),
  ]);
  const stateById = new Map(saved.map(s => [s.key.replace("admin-roadmap:", ""), parse(s.value)]));
  const selected = organizations.find(o => o.id === params.org) ?? null;
  const state = selected ? stateById.get(selected.id) ?? {} : {};
  const automatic = selected ? [
    { title: "Kontakt-E-Mail hinterlegt", done: Boolean(selected.contactEmail) },
    { title: "Profilbeanspruchung abgeschlossen", done: selected.claimStatus === "CLAIMED" },
    { title: "Organisationsaccount verknüpft", done: selected.memberships.length > 0 },
    { title: "Profilbeschreibung und Logo vorhanden", done: Boolean(selected.description && selected.logoId) },
    { title: "Onboarding abgeschlossen", done: selected.onboardingCompleted },
    { title: "Tarif vorhanden", done: Boolean(selected.subscription) },
    { title: "Profil veröffentlicht", done: selected.status === "PUBLISHED" },
  ] : [];
  const tracked = organizations.filter(o => stateById.has(o.id));
  const waiting = tracked.filter(o => stateById.get(o.id)?.status === "WAITING").length;
  const due = tracked.filter(o => { const d = stateById.get(o.id)?.due; return d && d <= new Date().toISOString().slice(0,10) && !["DONE","CANCELLED"].includes(stateById.get(o.id)?.status ?? ""); }).length;
  return <div className="space-y-6">
    <PageHeader title="Admin Roadmap" description="Interne Kundenprozesse, Live-Fortschritt und Wiedervorlagen für Admin und Team." />
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {[["Erfasste Prozesse",tracked.length],["Warten auf Kunden",waiting],["Wiedervorlagen fällig",due],["Abgeschlossen",tracked.filter(o=>stateById.get(o.id)?.status==="DONE").length]].map(([label,value])=><div key={label} className="rounded-xl border p-4"><div className="text-2xl font-bold">{value}</div><div className="text-sm text-muted-foreground">{label}</div></div>)}
    </div>
    <section className="rounded-xl border p-4 space-y-3">
      <h2 className="text-lg font-semibold">Kundenprozesse</h2>
      <form action="/dashboard/admin-roadmap" className="flex gap-2"><input name="q" defaultValue={q} placeholder="Organisation suchen" className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm"/><button className="rounded-lg border px-4 py-2">Suchen</button></form>
      <p className="text-xs text-muted-foreground">Maximal 100 Treffer. Nur bewusst aktivierte Prozesse werden als laufende Kundenfälle gezählt.</p>
      <div className="grid gap-2 md:grid-cols-2">
        {organizations.map(o=>{const s=stateById.get(o.id);return <Link key={o.id} href={`/dashboard/admin-roadmap?org=${encodeURIComponent(o.id)}${q?`&q=${encodeURIComponent(q)}`:""}`} className={`rounded-lg border p-3 hover:bg-muted/40 ${selected?.id===o.id?"border-primary":""}`}><div className="font-medium">{o.name}</div><div className="text-xs text-muted-foreground">{s ? `${sources.find(x=>x.key===s.source)?.name??"Kundenprozess"} · ${s.status??"ACTIVE"}` : "Noch kein aktiver Prozess"}{s?.due ? ` · Wiedervorlage: ${s.due}` : ""}</div></Link>})}
      </div>
    </section>
    {selected && <section className="rounded-xl border p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">{selected.name}</h2><Link className="text-sm underline" href={`/dashboard/organisationen/${selected.id}`}>Organisation öffnen</Link></div>
      <h3 className="font-semibold">Automatisch erkannte Schritte</h3>
      <p className="text-xs text-muted-foreground">Live aus den bestehenden Organisationsdaten. Versand- und Zahlungseingänge werden hier nicht ohne verlässliche Datenquelle als erledigt markiert.</p>
      <div className="grid gap-2 sm:grid-cols-2">{automatic.map(a=><div key={a.title} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">{a.done?"✓":"○"} {a.title}</div>)}</div>
      <form action={save} className="space-y-4 border-t pt-4">
        <input type="hidden" name="organizationId" value={selected.id}/>
        <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Einstiegsweg<select name="source" defaultValue={state.source??(selected.claimRequests[0]?.status==="PENDING"?"CLAIM":"CONTACT")} className="mt-1 w-full rounded-lg border bg-background p-2">{sources.map(s=><option key={s.key} value={s.key}>{s.name}</option>)}</select></label>
        <label className="text-sm">Status<select name="status" defaultValue={state.status??"ACTIVE"} className="mt-1 w-full rounded-lg border bg-background p-2"><option value="ACTIVE">Aktiv</option><option value="WAITING">Warten auf Kunde</option><option value="PAUSED">Pausiert</option><option value="DONE">Abgeschlossen</option><option value="CANCELLED">Abgebrochen</option></select></label></div>
        <h3 className="font-semibold">Manuelle Prüfschritte</h3>
        {manual.map(m=><label key={m.key} className="flex items-center gap-2 text-sm"><input type="checkbox" name={m.key} defaultChecked={state.checked?.includes(m.key)??false}/><span>{m.title} <Link href={m.href} className="text-xs underline text-muted-foreground">Öffnen</Link></span></label>)}
        <label className="block text-sm">Wiedervorlage<input type="date" name="due" defaultValue={state.due??""} className="mt-1 block rounded-lg border bg-background p-2"/></label>
        <label className="block text-sm">Interne Notiz<textarea name="note" maxLength={2000} rows={3} defaultValue={state.note??""} className="mt-1 w-full rounded-lg border bg-background p-2"/></label>
        {state.updatedAt&&<p className="text-xs text-muted-foreground">Zuletzt gespeichert: {new Date(state.updatedAt).toLocaleString("de-CH")}</p>}
        <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Prozess speichern</button>
      </form>
    </section>}
    <section className="rounded-xl border p-4 space-y-3"><h2 className="text-lg font-semibold">Prozesshandbuch</h2><p className="text-sm text-muted-foreground">Je nach Einstieg die zuständigen Module öffnen. Erst nach Identitätsprüfung Zugriffsrechte vergeben. Tarife buchen Organisationen selbstständig.</p>{sources.map(s=><div key={s.key} className="rounded-lg border p-3"><div className="font-medium">{s.name}</div><p className="my-1 text-sm text-muted-foreground">{s.description}</p><Link href={s.href} className="text-sm underline">Zum Modul</Link></div>)}<div className="rounded-lg bg-muted/40 p-3 text-sm"><strong>Gemeinsamer Abschluss:</strong> Organisation zuordnen → Berechtigung prüfen → Account verbinden → Profil vervollständigen → Tarif selbstständig buchen → Veröffentlichung kontrollieren → Saisonbetreuung.</div></section>
  </div>;
}
