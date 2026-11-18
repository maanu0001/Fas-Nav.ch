import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireStaffPage } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";
import { parseRoadmap, roadmapDue, roadmapSources, ROADMAP_GROUP } from "@/lib/admin-roadmap";

export const dynamic = "force-dynamic";

export default async function AdminRoadmapPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string }> }) {
  await requireStaffPage();
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 100);
  const saved = await prisma.siteSetting.findMany({ where: { group: ROADMAP_GROUP }, select: { key: true, value: true } });
  const states = new Map(saved.filter(s => s.key.startsWith("admin-roadmap:")).map(s => [s.key.slice("admin-roadmap:".length), parseRoadmap(s.value)]));
  const trackedIds = [...states.keys()];
  const [organizations, trackedOrgs, recentInvitations] = await Promise.all([
    prisma.organization.findMany({ where: q ? { name: { contains: q, mode: "insensitive" } } : {}, orderBy: { name: "asc" }, take: 4000, select: { id: true, name: true } }),
    trackedIds.length ? prisma.organization.findMany({ where: { id: { in: trackedIds } }, select: { id: true, name: true } }) : Promise.resolve([] as { id: string; name: string }[]),
    prisma.boardingInvitation.findMany({ orderBy: { sentAt: "desc" }, take: 2000, select: { organizationId: true, status: true, openCount: true, acceptedAt: true, sentAt: true } }),
  ]);
  const invitationByOrg = new Map<string, (typeof recentInvitations)[number]>();
  for (const invite of recentInvitations) if (!invitationByOrg.has(invite.organizationId)) invitationByOrg.set(invite.organizationId, invite);
  const sortedOrganizations = [...organizations].sort((a,b) => {
    const priority = (id: string) => {
      const state = states.get(id);
      const invite = invitationByOrg.get(id);
      if (state && roadmapDue(state)) return 0;
      if (invite?.acceptedAt) return 1;
      if (invite?.openCount) return 2;
      if (state && !["DONE","CANCELLED"].includes(state.status)) return 3;
      if (invite) return 4;
      if (state) return 5;
      return 6;
    };
    return priority(a.id)-priority(b.id) || a.name.localeCompare(b.name,"de-CH");
  });
  const visibleOrganizations = q ? sortedOrganizations.slice(0, 100) : sortedOrganizations.slice(0, 100);
  const dueItems = trackedOrgs.filter(o => { const s = states.get(o.id); return s && roadmapDue(s); });
  const active = trackedOrgs.filter(o => !["DONE","CANCELLED"].includes(states.get(o.id)?.status ?? ""));
  const statusLabels: Record<string,string> = { ACTIVE: "Aktiv", WAITING: "Warten auf Kunde", PAUSED: "Pausiert", DONE: "Abgeschlossen", CANCELLED: "Abgebrochen" };
  return <div className="space-y-6">
    <PageHeader title="CRM" description="Zentrale Übersicht über Kontakte, Akquise, Onboarding und Kundenbetreuung." />
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[
      ["Aktive Prozesse", active.length],
      ["Warten auf Kunde", trackedOrgs.filter(o => states.get(o.id)?.status === "WAITING").length],
      ["Wiedervorlagen fällig", dueItems.length],
      ["Abgeschlossen", trackedOrgs.filter(o => states.get(o.id)?.status === "DONE").length],
    ].map(([label,value]) => <div key={label} className="rounded-xl border border-primary-200 bg-primary-50 p-4 dark:bg-card"><div className="text-2xl font-bold">{value}</div><div className="text-sm text-muted-foreground">{label}</div></div>)}</div>
    {dueItems.length > 0 && <section className="rounded-xl border border-amber-400 bg-amber-50 p-4 dark:bg-amber-950/20"><h2 className="mb-2 font-semibold">Fällige Wiedervorlagen</h2><div className="grid gap-2">{dueItems.slice(0, 30).map(o => <Link key={o.id} href={`/dashboard/admin-roadmap/${encodeURIComponent(o.id)}`} className="rounded-lg bg-muted/40 p-3 text-sm hover:underline">{o.name} · {states.get(o.id)?.due}</Link>)}</div></section>}
    <section className="space-y-3 rounded-xl border p-4">
      <h2 className="text-lg font-semibold">Organisationen & Kundenprozesse</h2>
      <form action="/dashboard/admin-roadmap" className="flex gap-2"><input name="q" defaultValue={q} placeholder="Organisation suchen …" className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm"/><button className="rounded-lg border px-4 py-2 text-sm">Suchen</button></form>
      <p className="text-xs text-muted-foreground">Aktive Vorgänge und Boarding-Aktivitäten stehen oben. Die ersten 100 Einträge werden angezeigt; suche nach weiteren Organisationen.</p>
      <div className="grid gap-3 sm:grid-cols-2">{visibleOrganizations.map(o => {
        const state = states.get(o.id);
        const invite = invitationByOrg.get(o.id);
        const due = Boolean(state && roadmapDue(state));
        const accepted = Boolean(invite?.acceptedAt);
        const opened = Boolean(invite?.openCount);
        const tone = due ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20" : accepted ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20" : opened ? "border-sky-300 bg-sky-50 dark:bg-sky-950/20" : state ? "border-primary-200 bg-primary-50/40 dark:bg-card" : "border-border bg-card";
        return <Link key={o.id} href={"/dashboard/admin-roadmap/" + encodeURIComponent(o.id)} className={"rounded-xl border p-4 transition hover:shadow-md " + tone}>
          <div className="flex items-start justify-between gap-2"><div className="font-semibold">{o.name}</div>{due ? <span className="shrink-0 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold text-amber-950">Fällig</span> : null}</div>
          <div className="mt-1 text-xs text-muted-foreground">{state ? statusLabels[state.status] : "Noch kein Prozess"}</div>
          {invite ? <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            <span className="rounded-full bg-white/80 px-2 py-1 text-slate-800 dark:bg-slate-800 dark:text-white">{accepted ? "✓ Account erstellt" : "Account ausstehend"}</span>
            <span className="rounded-full bg-white/80 px-2 py-1 text-slate-800 dark:bg-slate-800 dark:text-white">{opened ? "✓ Link geöffnet (" + invite.openCount + "×)" : "Link ungeöffnet"}</span>
          </div> : null}
        </Link>;
      })}</div>
    </section>
    <section className="space-y-3 rounded-xl border p-4"><h2 className="text-lg font-semibold">Prozesshandbuch</h2><p className="text-sm text-muted-foreground">Jeder Einstieg führt über Identitätsprüfung und Accountzuordnung zum Profil, selbstständig gebuchten Tarif und zur Veröffentlichung. Danach beginnt die laufende Betreuung.</p>{roadmapSources.map(s => <div key={s.key} className="rounded-lg border p-3"><div className="font-medium">{s.label}</div><p className="my-1 text-sm text-muted-foreground">{s.guide}</p><Link href={s.href} className="text-sm underline">Zum zuständigen Modul</Link></div>)}</section>
  </div>;
}
