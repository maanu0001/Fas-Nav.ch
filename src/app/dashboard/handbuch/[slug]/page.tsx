import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Cog, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireStaffPage } from "@/lib/dashboard-context";
import { staffGuideCategories, staffGuideVisible } from "@/lib/staff-guide";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fas-Nav Handbuch" };

export default async function StaffGuideArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { user } = await requireStaffPage();
  const { slug } = await params;
  const articles = staffGuideVisible(user.role);
  const article = articles.find(a => a.slug === slug);
  if (!article) notFound();
  const category = staffGuideCategories.find(c => c.id === article.category);
  const siblings = articles.filter(a => a.category === article.category && a.slug !== article.slug).slice(0, 4);
  return <div className="mx-auto max-w-4xl space-y-5">
    <Link href="/dashboard/handbuch" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4"/>Zum Handbuch</Link>
    <PageHeader title={article.title} description={article.summary} />
    <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-lg bg-muted px-3 py-1.5">{category?.title}</span><span className="rounded-lg bg-muted px-3 py-1.5">{article.role === "ADMIN" ? "Nur Admin" : "Admin & Team"}</span></div>
    <section className="rounded-xl border bg-card p-5 sm:p-6"><h2 className="mb-2 text-lg font-semibold">Was macht diese Funktion?</h2><p className="leading-7">{article.purpose}</p></section>
    <section className="rounded-xl border bg-card p-5 sm:p-6"><h2 className="mb-4 text-lg font-semibold">Schritt für Schritt</h2><ol className="space-y-4">{article.steps.map((step,i) => <li key={i} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{i+1}</span><p className="pt-0.5 text-sm leading-6">{step}</p></li>)}</ol><Link href={article.href} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">Funktion öffnen <ArrowRight className="h-4 w-4"/></Link></section>
    <div className="grid gap-4 md:grid-cols-2"><section className="rounded-xl border bg-card p-5"><h2 className="mb-2 flex items-center gap-2 font-semibold"><Cog className="h-5 w-5 text-primary"/>Was läuft automatisch?</h2><p className="text-sm leading-6 text-muted-foreground">{article.automation}</p></section><section className="rounded-xl border bg-card p-5"><h2 className="mb-2 flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5 text-primary"/>Was muss ich kontrollieren?</h2><p className="text-sm leading-6 text-muted-foreground">{article.check}</p></section></div>
    {article.caution && <section className="rounded-xl border border-amber-500/40 p-5"><h2 className="mb-2 flex items-center gap-2 font-semibold"><ShieldAlert className="h-5 w-5"/>Wichtig</h2><p className="text-sm leading-6">{article.caution}</p></section>}
    {siblings.length > 0 && <section className="space-y-3"><h2 className="font-semibold">Weitere Themen in diesem Bereich</h2><div className="grid gap-2 sm:grid-cols-2">{siblings.map(s => <Link key={s.slug} href={`/dashboard/handbuch/${s.slug}`} className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/40">{s.title}<ArrowRight className="h-4 w-4 shrink-0"/></Link>)}</div></section>}
  </div>;
}
