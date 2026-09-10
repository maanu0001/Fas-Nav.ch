import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Globe2,
  MapPin,
  Music2,
  PartyPopper,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { CantonCrest } from "@/components/public/canton-crest";
import { LOGO_SRC } from "@/components/ui/logo";
import { Card } from "@/components/ui/card";
import { EventCard, type EventCardData } from "@/components/public/event-card";
import {
  OrganizationCard,
  type OrganizationCardData,
} from "@/components/public/organization-card";
import { SectionHeading } from "@/components/public/section";
import { EmptyState } from "@/components/ui/states";
import type { HomepageSection, SectionButton } from "@/lib/queries/homepage";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ElementType> = {
  calendar: CalendarDays,
  map: MapPin,
  music: Music2,
  search: Search,
  globe: Globe2,
  check: CheckCircle2,
  star: Sparkles,
  trend: TrendingUp,
  party: PartyPopper,
};

function ctaVariant(variant: SectionButton["variant"], inverse: boolean) {
  if (inverse) return variant === "primary" ? "inverse" : "inverseOutline";
  return variant === "primary" ? "primary" : variant === "secondary" ? "secondary" : "ghost";
}

/**
 * Symbol zur Handlungsaufforderung.
 *
 * Abgeleitet aus dem Ziel, nicht aus der Beschriftung: Die Beschriftungen
 * kommen aus den Einstellungen und können sich ändern, die Adressen sind
 * fest. Ohne Treffer bleibt der Knopf ohne Symbol – besser als ein falsches.
 */
function ctaIcon(href: string): React.ElementType | null {
  if (href.startsWith("/agenda")) return CalendarDays;
  if (href.startsWith("/guggen")) return Music2;
  if (href.startsWith("/fasnachten")) return Search;
  if (href.startsWith("/organisation")) return PartyPopper;
  return null;
}

function Buttons({ buttons, inverse = false }: { buttons?: SectionButton[]; inverse?: boolean }) {
  if (!buttons?.length) return null;
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      {buttons.map((button) => {
        const Icon = ctaIcon(button.href);
        return (
          <ButtonLink
            key={`${button.href}-${button.label}`}
            href={button.href}
            size="lg"
            variant={ctaVariant(button.variant, inverse)}
            // Eine Andeutung von Bewegung, kein Effekt: Der Knopf hebt sich um
            // einen Punkt. Bei abbestellter Bewegung entfällt der Weg dorthin,
            // der Zustand bleibt.
            className="hover:-translate-y-0.5"
          >
            {Icon ? <Icon aria-hidden /> : null}
            {button.label}
          </ButtonLink>
        );
      })}
    </div>
  );
}

/**
 * Das Logo als grosses Schlüsselbild der Heldenfläche.
 *
 * Rein dekorativ – der Markenname steht als Text in der Kopfzeile und in der
 * Überschrift, hier trägt das Bild keine zusätzliche Bedeutung. Deshalb ohne
 * Alternativtext und für Hilfsmittel ausgeblendet.
 *
 * Es steht in einem Lichthof statt auf einer Kachel: Das Logo ist für hellen
 * Grund gezeichnet, seine Buchstaben sind dunkles Navy. Eine harte weisse
 * Fläche würde es tragen, aber wie eingeklebt aussehen; der weiche Kreis
 * trägt es ebenso und läuft nach aussen in die Heldenfläche aus.
 *
 * Feste Grössenangaben und `sizes` halten den Platz von Anfang an frei, damit
 * beim Laden nichts springt.
 */
function HeroBrandVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[440px]" aria-hidden>
      {/* Farbschein, weit gestreut und schwach – gibt Tiefe. */}
      <div className="hero-glow absolute -inset-[12%] rounded-full opacity-70 blur-2xl" />
      {/* Lichthof, auf dem die dunklen Buchstaben des Logos lesbar werden. */}
      <div className="hero-halo absolute inset-0 rounded-full" />
      <Image
        src={LOGO_SRC}
        alt=""
        width={840}
        height={840}
        sizes="(min-width: 1024px) 420px, (min-width: 640px) 320px, 240px"
        className="relative h-full w-full object-contain p-[9%] drop-shadow-[0_18px_40px_hsl(var(--brand-surface-strong)/0.55)]"
        // Bewusst ohne priority: Das Bild ist Schmuck, nicht der Inhalt, mit
        // dem die Seite bewertet wird – das ist die Überschrift. Zudem lädt
        // der Browser ein ausgeblendetes Bild beim faulen Laden gar nicht
        // erst, und unterhalb der grossen Breite ist es ausgeblendet. Auf dem
        // Telefon entsteht dadurch keine Anfrage.
      />
    </div>
  );
}

export function HeroSection({
  section,
  counts,
}: {
  section: HomepageSection;
  counts: { carnivals: number; guggen: number; events: number; cantons: number };
}) {
  const stats = [
    { label: "Fasnachten", value: counts.carnivals },
    { label: "Guggenmusiken", value: counts.guggen },
    { label: "Kommende Termine", value: counts.events },
    { label: "Kantone", value: counts.cantons },
  ];

  return (
    <section className="relative overflow-hidden bg-hero text-white">
      <div className="absolute inset-0 bg-grid opacity-40" aria-hidden />
      <div className="absolute inset-0 bg-confetti opacity-70" aria-hidden />

      <div className="container relative py-16 sm:py-24 lg:pb-24 lg:pt-28">
        {/*
          Zwei Spalten ab der grossen Breite: links der Inhalt, rechts das
          Schlüsselbild. Darunter laufen die Kennzahlen über beide Spalten und
          schliessen die Fläche ab – vorher endete sie in einer leeren Hälfte.
        */}
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
          <div>
            {section.eyebrow ? (
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-gold-300" aria-hidden />
                {section.eyebrow}
              </p>
            ) : null}

            {/*
              Die Zeilenlänge ist begrenzt, damit der Umbruch nicht von der
              Fensterbreite abhängt: „Die Schweizer Fasnacht" bleibt zusammen,
              „auf einen Blick." steht darunter.
            */}
            <h1 className="max-w-[18ch] font-display text-[2.5rem] font-extrabold leading-[1.06] tracking-[-0.02em] text-white sm:text-5xl lg:text-[3rem] xl:text-[3.4rem]">
              {section.title ?? "Die Schweizer Fasnacht auf einen Blick."}
            </h1>

            {section.subtitle ? (
              <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-white/80">
                {section.subtitle}
              </p>
            ) : null}

            <Buttons buttons={section.data.buttons} inverse />
          </div>

          {/*
            Auf schmalen Fenstern steht das Schlüsselbild nicht über dem
            Inhalt, sondern entfällt: Es trägt keine Information, und der
            Hero soll auf dem Telefon kurz bleiben.
          */}
          <div className="hidden lg:block">
            <HeroBrandVisual />
          </div>
        </div>

        <dl className="mt-12 grid grid-cols-2 gap-y-8 border-t border-white/15 pt-8 sm:grid-cols-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={cn(
                // Dünne Trennlinien statt vier Kacheln: Die Zahlen bleiben
                // Teil der Fläche, statt darauf zu liegen.
                "sm:px-6 sm:first:pl-0",
                // Zwei Spalten: getrennt wird nur innerhalb der Zeile, also
                // vor der jeweils zweiten Kennzahl. Vier Spalten: vor jeder
                // ausser der ersten.
                i % 2 === 1 && "border-l border-white/10 pl-5",
                i > 0 && "sm:border-l sm:border-white/10 sm:pl-6",
              )}
            >
              <dd className="font-display text-3xl font-bold tabular-nums text-white sm:text-4xl">
                {stat.value}
              </dd>
              <dt className="mt-1.5 text-xs font-medium uppercase tracking-[0.12em] text-white/55">
                {stat.label}
              </dt>
            </div>
          ))}
        </dl>
      </div>

      {/* Weicher Auslauf in den Seitengrund statt harter Kante. */}
      <div className="hero-fade-bottom pointer-events-none absolute inset-x-0 bottom-0 h-16" aria-hidden />
    </section>
  );
}

export function InfoSection({ section }: { section: HomepageSection }) {
  const items = section.data.items ?? [];
  if (!items.length && !section.title) return null;

  return (
    <div className="container py-16 sm:py-20">
      <SectionHeading
        eyebrow={section.eyebrow}
        title={section.title ?? ""}
        description={section.subtitle}
        align="center"
      />
      {items.length ? (
        <div className="grid gap-5 md:grid-cols-3">
          {items.map((item) => {
            const Icon = ICONS[item.icon ?? "star"] ?? Sparkles;
            return (
              <Card key={item.title} className="p-6 transition-shadow hover:shadow-card">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="font-display text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function OrganizationsSection({
  section,
  organizations,
  href,
  linkLabel,
}: {
  section: HomepageSection;
  organizations: OrganizationCardData[];
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="container py-16 sm:py-20">
      <SectionHeading
        eyebrow={section.eyebrow}
        title={section.title ?? ""}
        description={section.subtitle}
        action={{ href, label: linkLabel }}
      />
      {organizations.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <OrganizationCard key={org.id} organization={org} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Noch keine Einträge veröffentlicht"
          description="Sobald Organisationen ihre Seite veröffentlichen, erscheinen sie hier."
        />
      )}
    </div>
  );
}

export function EventsSection({
  section,
  events,
}: {
  section: HomepageSection;
  events: EventCardData[];
}) {
  return (
    <div className="bg-muted/50 py-16 sm:py-20">
      <div className="container">
        <SectionHeading
          eyebrow={section.eyebrow}
          title={section.title ?? ""}
          description={section.subtitle}
          action={{ href: "/agenda", label: "Ganze Agenda" }}
        />
        {events.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Aktuell sind keine Termine erfasst"
            description="Die Agenda füllt sich, sobald Organisationen ihre Veranstaltungen veröffentlichen."
          />
        )}
      </div>
    </div>
  );
}

export function CantonGridSection({
  section,
  cantons,
}: {
  section: HomepageSection;
  cantons: { code: string; name: string; slug: string; organizationCount: number; eventCount: number }[];
}) {
  return (
    <div className="container py-16 sm:py-20">
      <SectionHeading
        eyebrow={section.eyebrow}
        title={section.title ?? ""}
        description={section.subtitle}
        action={{ href: "/kantone", label: "Alle Kantone" }}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cantons.map((canton) => (
          <Link
            key={canton.code}
            href={`/kanton/${canton.slug}`}
            className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-card"
          >
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold text-primary-900">
                {canton.name}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {canton.organizationCount} Organisationen · {canton.eventCount} Termine
              </p>
            </div>
            <CantonCrest code={canton.code} name={canton.name} className="h-8 w-8" />
          </Link>
        ))}
      </div>
    </div>
  );
}

/** CTA-Bereich für Fasnachtsorganisationen und Guggen. */
export function OrganisationCtaSection({
  section,
  priceLabel,
}: {
  section: HomepageSection;
  priceLabel: string;
}) {
  const items = section.data.items ?? [];

  return (
    <div className="container py-16 sm:py-20">
      <div className="overflow-hidden rounded-2xl border border-border bg-brand-strong text-white shadow-lift">
        <div className="grid gap-10 p-8 sm:p-12 lg:grid-cols-2 lg:gap-16">
          <div>
            {section.eyebrow ? (
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-brand-accent">
                {section.eyebrow}
              </p>
            ) : null}
            <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
              {section.title ?? "Deine Fasnacht. Deine Gugge. Deine Seite."}
            </h2>
            {section.subtitle ? (
              <p className="mt-5 text-[15px] leading-relaxed text-white/75">{section.subtitle}</p>
            ) : null}
            <Buttons buttons={section.data.buttons} inverse />
            <p className="mt-5 text-sm text-white/60">{priceLabel}</p>
          </div>

          {items.length ? (
            <ul className="grid gap-3 self-center">
              {items.map((item) => (
                <li key={item.title} className="flex gap-3 rounded-lg bg-white/5 p-3.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-accent" aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    {item.body ? (
                      <p className="mt-0.5 text-sm text-white/60">{item.body}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function CtaSection({ section }: { section: HomepageSection }) {
  return (
    <div className="container py-16 sm:py-20">
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-secondary px-6 py-12 text-center sm:px-12">
        <div className="max-w-2xl">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">{section.title}</h2>
          {section.subtitle ? (
            <p className="mt-3 text-[15px] leading-relaxed text-slate-600">{section.subtitle}</p>
          ) : null}
        </div>
        {section.data.buttons?.length ? (
          <div className="flex flex-wrap justify-center gap-3">
            {section.data.buttons.map((button) => (
              <ButtonLink
                key={button.href}
                href={button.href}
                size="lg"
                variant={ctaVariant(button.variant, false)}
              >
                {button.label}
                <ArrowRight />
              </ButtonLink>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function FaqSection({ section }: { section: HomepageSection }) {
  const items = section.data.items ?? [];
  if (!items.length) return null;

  return (
    <div className={cn("container py-16 sm:py-20")}>
      <SectionHeading
        eyebrow={section.eyebrow}
        title={section.title ?? "Häufige Fragen"}
        description={section.subtitle}
        align="center"
      />
      <div className="mx-auto max-w-3xl divide-y divide-border rounded-xl border border-border bg-card">
        {items.map((item) => (
          <details key={item.title} className="group p-5">
            <summary className="flex cursor-pointer items-center justify-between gap-4 font-display text-sm font-semibold text-primary-900 marker:content-['']">
              {item.title}
              <span className="shrink-0 text-muted-foreground transition-transform group-open:rotate-45" aria-hidden>
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.body}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
