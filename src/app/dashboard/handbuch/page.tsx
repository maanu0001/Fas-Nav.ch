import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ArrowRight, Search } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireStaffPage } from "@/lib/dashboard-context";
import { staffGuideArticles, staffGuideCategories, staffGuideVisible } from "@/lib/staff-guide";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fas-Nav Handbuch" };

export default async function StaffGuidePage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const { user } = await requireStaffPage();
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLocaleLowerCase("de-CH").slice(0, 100);
  const category = params.category ?? "";
  const all = staffGuideVisible(user.role);
  const articles = all.filter(a => (!category || a.category === category) && (!q || [a.title, a.summary, a.purpose, a.automation, ...a.steps].join(" ").toLocaleLowerCase("de-CH").includes(q)));
  return <div className="space-y-6">
    <PageHeader title="Fas-Nav Handbuch" description="Dein Nachschlagewerk für sämtliche Verwaltungsbereiche: Was gibt es, wie funktioniert es, was läuft automatisch und was muss kontrolliert werden?" />
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border bg-card p-4"><div className="text-2xl font-bold">{all.length}</div><p className="text-sm text-muted-foreground">Dokumentierte Funktionen</p></div>
      <div className="rounded-xl border bg-card p-4"><div className="text-2xl font-bold">{staffGuideCategories.length}</div><p className="text-sm text-muted-foreground">Themenbereiche</p></div>
      <div className="rounded-xl border bg-card p-4"><div className="text-2xl font-bold">{all.filter(a => a.role === "ADMIN").length}</div><p className="text-sm text-muted-foreground">Nur für Admins</p></div>
    </div>
    <form action="/dashboard/handbuch" className="flex flex-col gap-2 sm:flex-row">
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border bg-background px-3"><Search className="h-4 w-4 text-muted-foreground"/><input name="q" defaultValue={params.q ?? ""} placeholder="Funktionen, Abläufe oder Stichworte suchen …" className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"/></div>
      <select name="category" defaultValue={category} className="h-11 rounded-lg border bg-background px-3 text-sm"><option value="">Alle Themen</option>{staffGuideCategories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select>
      <button className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground">Suchen</button>
    </form>
    <section className="rounded-xl border bg-muted/30 p-4"><h2 className="font-semibold">So nutzt du dieses Handbuch</h2><p className="mt-1 text-sm text-muted-foreground">Jeder Artikel erklärt Zweck, Bedienung, Automationen und Kontrollen. Über den Modul-Link gelangst du direkt zur Funktion. Die Anleitung für Organisationskunden bleibt separat unter «Anleitung» in deren Dashboard.</p><p className="mt-2 text-xs text-muted-foreground">Die Rollenangaben beschreiben die Navigation; die tatsächlichen Berechtigungen werden zusätzlich durch die jeweilige Seite oder API geprüft. Geplante Automationen sind keine Garantie für erfolgreiche Ausführung.</p></section>
    {staffGuideCategories.filter(c => !category || c.id === category).map(c => {
      const items = articles.filter(a => a.category === c.id);
      if (!items.length) return null;
      return <section key={c.id} className="space-y-3"><div><h2 className="font-display text-lg font-semibold">{c.title}</h2><p className="text-sm text-muted-foreground">{c.description}</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{items.map(a => <Link key={a.slug} href={`/dashboard/handbuch/${a.slug}`} className="group rounded-xl border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"><div className="mb-3 flex items-center justify-between"><BookOpen className="h-5 w-5 text-primary"/><span className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium">{a.role === "ADMIN" ? "Admin" : "Admin & Team"}</span></div><h3 className="font-semibold">{a.title}</h3><p className="mt-1 text-sm text-muted-foreground">{a.summary}</p><span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">Anleitung öffnen <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5"/></span></Link>)}</div></section>;
    })}
    {!articles.length && <p className="rounded-xl border p-6 text-sm text-muted-foreground">Keine passenden Anleitungen gefunden. Passe die Suche an.</p>}
  </div>;
}
