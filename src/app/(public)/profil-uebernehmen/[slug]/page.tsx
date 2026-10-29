import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock3, ShieldCheck } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { ClaimForm } from "@/components/public/claim-form";
import { organizationHref } from "@/components/public/organization-card";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return buildMetadata({ title: "Profil übernehmen", description: "Übernimm das Profil deiner Organisation auf Fas-Nav.ch.", path: `/profil-uebernehmen/${slug}`, noIndex: true, noFollow: true });
}

export default async function ClaimPage({ params }: Props) {
  const { slug } = await params;
  const org = await prisma.organization.findUnique({ where: { slug }, select: { id: true, name: true, slug: true, type: true, city: true, claimStatus: true } });
  if (!org) notFound();

  return (
    <div className="container py-12 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-700">Offizieller Auftritt</p>
        <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{org.name} auf Fas-Nav übernehmen</h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">Du vertrittst <Link href={organizationHref(org)} className="font-semibold text-primary-700 hover:underline">{org.name}</Link> aus {org.city}? Mit der Übernahme wird aus dem bestehenden Verzeichniseintrag ein von euch verwalteter Auftritt.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[{ icon: ShieldCheck, title: "Kurz verifizieren", text: "Wir prüfen, ob du zur Organisation gehörst." }, { icon: CheckCircle2, title: "Bestehendes Profil behalten", text: "Inhalte und bestehende Sichtbarkeit bleiben erhalten." }, { icon: Clock3, title: "Danach selbst verwalten", text: "Profil, Veranstaltungen, Bilder und weitere Inhalte pflegen." }].map(({ icon: Icon, title, text }) => <Card key={title} className="p-5"><Icon className="h-5 w-5 text-primary-600" aria-hidden /><h2 className="mt-3 font-display text-sm font-semibold">{title}</h2><p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p></Card>)}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_280px]">
          <Card className="p-6 sm:p-8">
            {org.claimStatus === "CLAIMED" ? <Alert variant="info" title="Dieses Profil wird bereits verwaltet">Die Organisation betreut ihre Seite bereits selbst. Falls du dennoch Zugriff benötigst, melde dich über unser <Link href="/kontakt" className="underline">Kontaktformular</Link>.</Alert> : org.claimStatus === "CLAIM_REQUESTED" ? <Alert variant="warning" title="Übernahme bereits angefragt">Für dieses Profil liegt bereits eine Anfrage vor. Wir prüfen sie und melden uns bei der angegebenen Kontaktperson.</Alert> : <><h2 className="mb-1 font-display text-xl font-bold">Übernahme anfragen</h2><p className="mb-6 text-sm text-muted-foreground">Keine Neuanlage nötig – du übernimmst genau dieses bestehende Profil.</p><ClaimForm organizationId={org.id} organizationName={org.name} /></>}
          </Card>
          <aside className="space-y-4"><div className="rounded-xl border border-border bg-secondary/60 p-5"><h2 className="font-display text-sm font-semibold">Was passiert danach?</h2><ol className="mt-3 space-y-3 text-sm text-muted-foreground"><li><strong className="text-foreground">1.</strong> Anfrage absenden</li><li><strong className="text-foreground">2.</strong> Fas-Nav prüft die Zuordnung</li><li><strong className="text-foreground">3.</strong> Zugang wird eingerichtet</li><li><strong className="text-foreground">4.</strong> Profil selbst verwalten</li></ol></div><p className="text-xs leading-relaxed text-muted-foreground">Die Übernahme ist nur für berechtigte Vertreterinnen und Vertreter der Organisation vorgesehen. Bei Unklarheiten nehmen wir Kontakt auf.</p></aside>
        </div>
      </div>
    </div>
  );
}
