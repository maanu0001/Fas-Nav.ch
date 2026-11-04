import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Clock, ExternalLink, MapPin, Ticket, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EventCard } from "@/components/public/event-card";
import { AddToCalendar } from "@/components/public/add-to-calendar";
import { MediaImage } from "@/components/public/media-image";
import { TrackedLink } from "@/components/public/tracked-link";
import { ViewTracker } from "@/components/public/view-tracker";
import { EVENT_TYPE_LABELS } from "@/lib/constants";
import { formatDate, formatEventTime, startOfToday } from "@/lib/dates";
import { organizationHref } from "@/components/public/organization-card";
import { prisma } from "@/lib/prisma";
import { PUBLIC_EVENT_SELECT, publishedEventWhere } from "@/lib/queries/public";
import { breadcrumbJsonLd, buildMetadata, eventJsonLd, jsonLdScript } from "@/lib/seo";
import { formatChf } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

async function getEvent(slug: string) {
  return prisma.event.findFirst({
    where: { slug, ...publishedEventWhere },
    select: {
      id: true,
      title: true,
      slug: true,
      type: true,
      description: true,
      shortDescription: true,
      startDate: true,
      endDate: true,
      allDay: true,
      venueName: true,
      street: true,
      zip: true,
      city: true,
      organizerName: true,
      externalUrl: true,
      ticketUrl: true,
      price: true,
      priceInfo: true,
      metaTitle: true,
      metaDesc: true,
      canton: { select: { code: true, name: true, slug: true } },
      image: { select: { url: true, alt: true, width: true, height: true } },
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          city: true,
          logo: { select: { url: true, alt: true, width: true, height: true } },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) {
    return buildMetadata({ title: "Veranstaltung nicht gefunden", path: `/event/${slug}`, noIndex: true });
  }

  const dateLabel = formatDate(event.startDate);
  return buildMetadata({
    title: event.metaTitle || `${event.title} – ${dateLabel}, ${event.city}`,
    description:
      event.metaDesc ||
      event.shortDescription ||
      `${event.title} am ${dateLabel} in ${event.city} (${event.canton.name}). Veranstaltet von ${event.organization.name}.`,
    path: `/event/${event.slug}`,
    image: event.image?.url,
    type: "article",
    keywords: [
      event.title,
      EVENT_TYPE_LABELS[event.type],
      `Fasnacht ${event.city}`,
      `Fasnacht ${event.canton.name}`,
    ],
  });
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();

  const isPast = (event.endDate ?? event.startDate) < startOfToday();

  const relatedEvents = await prisma.event.findMany({
    where: {
      ...publishedEventWhere,
      id: { not: event.id },
      // Zuerst Termine derselben Organisation, ergänzt um Termine am selben Ort.
      OR: [{ organizationId: event.organization.id }, { city: event.city }],
      startDate: { gte: startOfToday() },
    },
    select: PUBLIC_EVENT_SELECT,
    orderBy: { startDate: "asc" },
    take: 3,
  });

  const address = [event.street, [event.zip, event.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  const mapQuery = encodeURIComponent(
    `${event.venueName ? `${event.venueName}, ` : ""}${address}, ${event.canton.name}, Schweiz`,
  );

  const jsonLd = [
    eventJsonLd({
      title: event.title,
      slug: event.slug,
      description: event.shortDescription ?? event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      venueName: event.venueName,
      street: event.street,
      zip: event.zip,
      city: event.city,
      cantonName: event.canton.name,
      image: event.image?.url,
      organizerName: event.organization.name,
      organizerUrl: organizationHref(event.organization),
      price: event.price !== null ? Number(event.price) : null,
      ticketUrl: event.ticketUrl,
      isPast,
    }),
    breadcrumbJsonLd([
      { name: "Startseite", path: "/" },
      { name: "Agenda", path: "/agenda" },
      { name: event.title, path: `/event/${event.slug}` },
    ]),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(jsonLd)} />
      <ViewTracker
        target="EVENT"
        eventId={event.id}
        organizationId={event.organization.id}
        path={`/event/${event.slug}`}
      />

      <div className="relative h-48 w-full overflow-hidden bg-brand sm:h-64">
        <MediaImage media={event.image} alt={event.title} sizes="100vw" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-strong/85 via-brand-strong/35 to-transparent" />
      </div>

      <div className="container">
        <nav aria-label="Brotkrumen" className="py-4 text-sm text-muted-foreground">
          <Link href="/agenda" className="hover:text-foreground">
            Agenda
          </Link>
          <span className="mx-2" aria-hidden>
            /
          </span>
          <span className="text-foreground">{event.title}</span>
        </nav>

        <div className="grid gap-10 pb-16 lg:grid-cols-3 lg:gap-12">
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{EVENT_TYPE_LABELS[event.type]}</Badge>
              {isPast ? <Badge variant="muted">Vergangene Veranstaltung</Badge> : null}
            </div>

            <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">{event.title}</h1>

            {event.shortDescription ? (
              <p className="mt-4 text-lg leading-relaxed text-slate-600">
                {event.shortDescription}
              </p>
            ) : null}

            {event.description ? (
              <div className="prose-fasnav mt-8">
                {event.description
                  .split(/\n{2,}/)
                  .filter(Boolean)
                  .map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
              </div>
            ) : null}

            {relatedEvents.length ? (
              <section className="mt-14 border-t border-border pt-10">
                <h2 className="mb-6 font-display text-xl font-bold">Weitere Veranstaltungen</h2>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {relatedEvents.map((item) => (
                    <EventCard key={item.id} event={item} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-5">
            <Card className="p-5">
              <ul className="space-y-4 text-sm">
                <li className="flex gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div>
                    <p className="font-semibold text-primary-900">
                      {formatDate(event.startDate, "EEEE, d. MMMM yyyy")}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" aria-hidden />
                      {formatEventTime(event.startDate, event.endDate, event.allDay)}
                    </p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div>
                    {event.venueName ? (
                      <p className="font-semibold text-primary-900">{event.venueName}</p>
                    ) : null}
                    <p className="text-slate-700">{address || event.city}</p>
                    <Link
                      href={`/kanton/${event.canton.slug}`}
                      className="mt-0.5 inline-block text-primary-700 hover:underline"
                    >
                      {event.canton.name}
                    </Link>
                  </div>
                </li>

                {event.price !== null ? (
                  <li className="flex gap-3">
                    <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <div>
                      <p className="font-semibold text-primary-900">
                        {Number(event.price) === 0 ? "Eintritt frei" : formatChf(Number(event.price))}
                      </p>
                      {event.priceInfo ? (
                        <p className="text-muted-foreground">{event.priceInfo}</p>
                      ) : null}
                    </div>
                  </li>
                ) : null}

                <li className="flex gap-3">
                  <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Veranstalter
                    </p>
                    <Link
                      href={organizationHref(event.organization)}
                      className="font-semibold text-primary-700 hover:underline"
                    >
                      {event.organization.name}
                    </Link>
                    {event.organizerName && event.organizerName !== event.organization.name ? (
                      <p className="text-muted-foreground">{event.organizerName}</p>
                    ) : null}
                  </div>
                </li>
              </ul>

              <div className="mt-5 space-y-2">
                {!isPast ? (
                  <AddToCalendar
                    title={event.title}
                    slug={event.slug}
                    startDate={event.startDate.toISOString()}
                    endDate={event.endDate?.toISOString() ?? null}
                    allDay={event.allDay}
                    location={[event.venueName, address, "Schweiz"].filter(Boolean).join(", ")}
                    description={event.shortDescription ?? event.description ?? ""}
                  />
                ) : null}
                {event.ticketUrl && !isPast ? (
                  <TrackedLink
                    href={event.ticketUrl}
                    eventId={event.id}
                    organizationId={event.organization.id}
                    interaction="TICKET_CLICK"
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground shadow-subtle transition-colors hover:bg-accent-600"
                  >
                    <Ticket className="h-4 w-4" aria-hidden />
                    Tickets kaufen
                  </TrackedLink>
                ) : null}

                {event.externalUrl ? (
                  <TrackedLink
                    href={event.externalUrl}
                    eventId={event.id}
                    organizationId={event.organization.id}
                    interaction="WEBSITE_CLICK"
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-input px-4 text-sm font-medium transition-colors hover:bg-secondary"
                  >
                    Zur Veranstaltungswebsite
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </TrackedLink>
                ) : null}

                <ButtonLink
                  href={`https://www.openstreetmap.org/search?query=${mapQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outline"
                  block
                >
                  <MapPin />
                  Auf Karte anzeigen
                </ButtonLink>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </>
  );
}
