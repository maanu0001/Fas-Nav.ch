import type { Metadata } from "next";
import { CalendarPlus, Globe2, Image as ImageIcon, PencilLine, TrendingUp, Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import { ContactForm } from "@/components/public/contact-form";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { formatChf } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Fasnacht oder Gugge eintragen",
  description:
    "Trage deine Fasnacht oder Guggenmusik auf Fas-Nav.ch ein: eigene Profilseite, Veranstaltungen in der schweizweiten Agenda und mehr Reichweite.",
  path: "/organisation-eintragen",
  keywords: ["Fasnacht eintragen", "Gugge eintragen", "Guggenmusik Profil"],
});

const BENEFITS = [
  { icon: Globe2, title: "Eigene öffentliche Profilseite", body: "Unter fas-nav.ch/fasnacht/deine-fasnacht bzw. /gugge/deine-gugge – suchmaschinenfreundlich aufbereitet." },
  { icon: PencilLine, title: "Jederzeit selbst bearbeiten", body: "Der Live-Editor zeigt dir sofort, wie deine Seite aussieht. Ohne technische Kenntnisse." },
  { icon: CalendarPlus, title: "Veranstaltungen veröffentlichen", body: "Umzüge, Konzerte und Bälle erscheinen automatisch in der schweizweiten Agenda." },
  { icon: ImageIcon, title: "Bilder und Galerie", body: "Zeige Impressionen deiner Fasnacht – Logo, Titelbild und eine vollständige Galerie." },
  { icon: Users, title: "Website und Social Media verlinken", body: "Führe Besucherinnen und Besucher direkt zu deinen eigenen Kanälen." },
  { icon: TrendingUp, title: "Mehr Reichweite gewinnen", body: "Profitiere von der zentralen Sichtbarkeit über Kantons- und Agendaseiten." },
];

type SearchParams = Promise<{ plan?: string; typ?: string }>;

export default async function RegisterOrganizationPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const requestedPlanKey = params.plan?.trim().toLowerCase() ?? "";

  const [cheapestPlan, plans] = await Promise.all([
    prisma.plan.findFirst({ where: { isActive: true, isPublic: true, priceChf: { gt: 0 } }, orderBy: { priceChf: "asc" }, select: { priceChf: true } }),
    prisma.plan.findMany({ where: { isActive: true, isPublic: true }, orderBy: [{ sortOrder: "asc" }, { priceChf: "asc" }], select: { name: true, key: true } }),
  ]);
  const selectedPlan = plans.find((plan) => plan.key === requestedPlanKey) ?? null;
  const priceLabel = cheapestPlan ? `ab ${formatChf(Number(cheapestPlan.priceChf))} / Jahr` : "auf Anfrage";

  return (
    <>
      <div className="border-b border-border bg-hero text-white">
        <div className="container py-14 sm:py-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-brand-accent">Für Fasnachten und Guggen</p>
          <h1 className="max-w-3xl font-display text-3xl font-bold text-white sm:text-4xl lg:text-5xl">Deine Fasnacht. Deine Gugge. Deine Seite.</h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-white/75">Präsentiere deine Organisation auf Fas-Nav.ch und erreiche Fasnachtsbegeisterte in der ganzen Schweiz.</p>
          <p className="mt-6 inline-block rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">{priceLabel}</p>
        </div>
      </div>

      <div className="container py-14">
        <div className="grid gap-12 lg:grid-cols-5 lg:gap-16">
          <div className="lg:col-span-3">
            <h2 className="font-display text-2xl font-bold">Was du bekommst</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {BENEFITS.map((benefit) => (
                <li key={benefit.title} className="rounded-xl border border-border bg-card p-5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700"><benefit.icon className="h-5 w-5" aria-hidden /></div>
                  <h3 className="font-display text-sm font-semibold text-primary-900">{benefit.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{benefit.body}</p>
                </li>
              ))}
            </ul>
            <div className="mt-10 rounded-xl border border-border bg-secondary p-6">
              <h3 className="font-display text-base font-semibold">So läuft es ab</h3>
              <ol className="mt-4 space-y-3 text-sm text-slate-700">
                {["Du sendest uns das Formular mit den Angaben zu deiner Organisation.", "Wir erstellen dein Konto und richten die Grunddaten deiner Seite ein.", "Du erhältst deine Zugangsdaten und führst das geführte Onboarding durch.", "Sobald du bereit bist, veröffentlichst du deine Seite mit einem Klick."].map((step, index) => (
                  <li key={step} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{index + 1}</span>{step}</li>
                ))}
              </ol>
            </div>
          </div>

          <div className="lg:col-span-2">
            <Card className="p-6 sm:p-7">
              <h2 className="font-display text-lg font-bold">Jetzt eintragen</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">Sende uns die Angaben zu deiner Organisation – wir melden uns mit den nächsten Schritten.</p>
              <div className="mt-6">
                <ContactForm
                  organizationEntry
                  plans={plans}
                  defaultPlanKey={selectedPlan?.key ?? ""}
                  subjectPlaceholder="Eintrag Verein/Fasnacht"
                  intro="Gib uns kurz die wichtigsten Angaben. Name der Organisation, Telefonnummer und gewünschter Tarif können direkt separat erfasst werden."
                />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
