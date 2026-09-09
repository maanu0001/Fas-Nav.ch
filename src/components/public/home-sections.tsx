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

function Buttons({ buttons, inverse = false }: { buttons?: SectionButton[]; inverse?: boolean }) {
  if (!buttons?.length) return null;
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      {buttons.map((button) => (
        <ButtonLink
          key={`${button.href}-${button.label}`}
          href={button.href}
          size="lg"
          variant={ctaVariant(button.variant, inverse)}
        >
          {button.label}
        </ButtonLink>
      ))}
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
  return (
    <section className="relative overflow-hidden bg-hero text-white">
      <div className="absolute inset-0 bg-grid opacity-40" aria-hidden />
      <div className="absolute inset-0 bg-confetti opacity-70" aria-hidden />

      <div className="container relative py-20 sm:py-28">
        <div className="max-w-3xl">
          {section.eyebrow ? (
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {section.eyebrow}
            </p>
          ) : null}

          <h1 className="font-display text-4xl font-extrabold leading-[1.08] text-white sm:text-5xl lg:text-6xl">
            {section.title ?? "Die Schweizer Fasnacht auf einen Blick."}
          </h1>

          {section.subtitle ? (
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85">
              {section.subtitle}
            </p>
          ) : null}

          <Buttons buttons={section.data.buttons} inverse />
        </div>

        <dl className="mt-16 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-6 border-t border-white/15 pt-8 sm:grid-cols-4">
          {[
            { label: "Fasnachten", value: counts.carnivals },
            { label: "Guggenmusiken", value: counts.guggen },
            { label: "Kommende Termine", value: counts.events },
            { label: "Kantone", value: counts.cantons },
          ].map((stat) => (
            <div key={stat.label}>
              <dt className="text-xs font-medium uppercase tracking-wider text-white/60">
                {stat.label}
              </dt>
              <dd className="mt-1 font-display text-3xl font-bold text-white">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
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
