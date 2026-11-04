import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays,
  Car,
  Download,
  ExternalLink,
  Globe,
  Info,
  Mail,
  Map,
  MapPin,
  Music2,
  Phone,
  TrainFront,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EventListItem } from "@/components/public/event-card";
import { LogoImage, MediaImage } from "@/components/public/media-image";
import {
  OrganizationCard,
  type OrganizationCardData,
} from "@/components/public/organization-card";
import { VerifiedBadge } from "@/components/public/verified-badge";
import { TrackedLink } from "@/components/public/tracked-link";
import { FEATURE_KEYS, SOCIAL_PLATFORM_LABELS } from "@/lib/constants";
import { formatDate, formatDateRange } from "@/lib/dates";
import { orgHasFeature, type PublicOrganization } from "@/lib/queries/organization";
import type { EventCardData } from "@/components/public/event-card";

function Prose({ text }: { text: string }) {
  // Freitext wird bereits serverseitig von HTML befreit; Absätze bleiben erhalten.
  return (
    <div className="prose-fasnav">
      {text
        .split(/\n{2,}/)
        .filter(Boolean)
        .map((paragraph, i) => (
          <p key={i}>
            {paragraph.split("\n").map((line, j, arr) => (
              <span key={j}>
                {line}
                {j < arr.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        ))}
    </div>
  );
}

function Panel({
  title,
  children,
  id,
}: {
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-4 font-display text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Ein Weg der Anreise.
 *
 * Icon und Beschriftung stehen immer zusammen – das Symbol allein trägt die
 * Bedeutung nicht. Der Text läuft über Prose und behält damit seine Absätze
 * und Zeilenumbrüche, ohne dass HTML gerendert würde.
 */
function ArrivalCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Car;
  title: string;
  text: string;
}) {
  return (
    <Card className="p-5">
      <h3 className="mb-2.5 flex items-center gap-2 font-display text-base font-semibold">
        <Icon className="h-5 w-5 shrink-0 text-accent-700" aria-hidden />
        {title}
      </h3>
      <Prose text={text} />
    </Card>
  );
}

export function OrganizationProfile({
  organization: org,
  events,
  related,
}: {
  organization: PublicOrganization;
  events: { upcoming: EventCardData[]; past: EventCardData[] };
  related: OrganizationCardData[];
}) {
  const isCarnival = org.type === "CARNIVAL";
  const showGallery = orgHasFeature(org, FEATURE_KEYS.GALLERY) && org.media.length > 0;
  const showSponsors = orgHasFeature(org, FEATURE_KEYS.SPONSORS) && org.sponsors.length > 0;
  const showProgram = org.programItems.length > 0;
  const showDownloads = org.downloads.length > 0;
  const showFaq = org.faqs.length > 0;
  // Der ganze Abschnitt entfällt, solange keine einzige Angabe gepflegt ist.
  const hatAnreise = Boolean(
    org.arrivalByCar ||
      org.arrivalByPublicTransport ||
      org.arrivalNotes ||
      org.arrivalMapUrl ||
      org.arrivalTransportUrl,
  );

  const address = [org.street, [org.zip, org.city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  const mapQuery = encodeURIComponent(`${address}, ${org.canton.name}, Schweiz`);

  return (
    <article>
      {/* Titelbild */}
      <div className="relative h-52 w-full overflow-hidden bg-brand sm:h-72 lg:h-80">
        <MediaImage
          media={org.header}
          alt={`${org.name} – Titelbild`}
          sizes="100vw"
          priority
          className="opacity-95"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-strong/80 via-brand-strong/25 to-transparent" />
      </div>

      <div className="container">
        {/* Kopfbereich */}
        <header className="relative -mt-14 mb-10 sm:-mt-16">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <LogoImage media={org.logo} name={org.name} size={92} className="shadow-subtle" />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{isCarnival ? "Fasnacht" : "Guggenmusik"}</Badge>
                  <VerifiedBadge status={org.verification} />
                  {org.claimStatus === "UNCLAIMED" ? (
                    <Badge variant="muted">Nicht beansprucht</Badge>
                  ) : null}
                </div>

                <h1 className="mt-2.5 font-display text-2xl font-bold sm:text-3xl lg:text-4xl">
                  {org.name}
                </h1>

                {org.tagline ? (
                  <p className="mt-1.5 text-[15px] text-muted-foreground">{org.tagline}</p>
                ) : null}

                <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  <div className="inline-flex items-center gap-1.5 text-slate-700">
                    <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <dt className="sr-only">Ort</dt>
                    <dd>
                      {org.city} ·{" "}
                      <Link
                        href={`/kanton/${org.canton.slug}`}
                        className="font-medium text-primary-700 hover:underline"
                      >
                        {org.canton.name}
                      </Link>
                    </dd>
                  </div>

                  {isCarnival && org.startDate ? (
                    <div className="inline-flex items-center gap-1.5 text-slate-700">
                      <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <dt className="sr-only">Zeitraum</dt>
                      <dd>{formatDateRange(org.startDate, org.endDate)}</dd>
                    </div>
                  ) : null}

                  {!isCarnival && org.foundedYear ? (
                    <div className="inline-flex items-center gap-1.5 text-slate-700">
                      <Music2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <dt className="sr-only">Gegründet</dt>
                      <dd>Gegründet {org.foundedYear}</dd>
                    </div>
                  ) : null}

                  {org.memberCount ? (
                    <div className="inline-flex items-center gap-1.5 text-slate-700">
                      <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <dt className="sr-only">Mitglieder</dt>
                      <dd>{org.memberCount} Mitglieder</dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              {org.website ? (
                <div className="shrink-0">
                  <TrackedLink
                    href={org.website}
                    organizationId={org.id}
                    interaction="WEBSITE_CLICK"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-subtle transition-colors hover:bg-primary-800"
                  >
                    <Globe className="h-4 w-4" aria-hidden />
                    Website
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </TrackedLink>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="grid gap-10 pb-16 lg:grid-cols-3 lg:gap-12">
          {/* Hauptspalte */}
          <div className="space-y-12 lg:col-span-2">
            {org.description ? (
              <Panel title={isCarnival ? "Über diese Fasnacht" : "Über diese Gugge"}>
                <Prose text={org.description} />
              </Panel>
            ) : org.shortDescription ? (
              <Panel title="Kurzbeschreibung">
                <Prose text={org.shortDescription} />
              </Panel>
            ) : null}

            {org.importantInfo ? (
              <Panel title="Wichtige Informationen">
                <Card className="border-amber-200 bg-amber-50 p-5">
                  <Prose text={org.importantInfo} />
                </Card>
              </Panel>
            ) : null}

            {showProgram ? (
              <Panel title="Programm" id="programm">
                <ol className="space-y-3">
                  {org.programItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex gap-4 rounded-xl border border-border bg-card p-4"
                    >
                      <div className="w-24 shrink-0 text-sm">
                        {item.day ? (
                          <p className="font-semibold text-primary-900">
                            {formatDate(item.day, "EEE, d. MMM")}
                          </p>
                        ) : null}
                        {item.timeLabel ? (
                          <p className="text-muted-foreground">{item.timeLabel}</p>
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display font-semibold text-primary-900">{item.title}</p>
                        {item.place ? (
                          <p className="mt-0.5 text-sm text-muted-foreground">{item.place}</p>
                        ) : null}
                        {item.description ? (
                          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                            {item.description}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ol>
              </Panel>
            ) : null}

            <Panel title={isCarnival ? "Veranstaltungen" : "Auftrittstermine"} id="agenda">
              {events.upcoming.length ? (
                <div className="space-y-3">
                  {events.upcoming.map((event) => (
                    <EventListItem key={event.id} event={event} />
                  ))}
                </div>
              ) : (
                <Card className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Aktuell sind keine kommenden Termine erfasst.
                  </p>
                </Card>
              )}

              {events.past.length ? (
                <details className="mt-5 rounded-xl border border-border bg-card p-4">
                  <summary className="cursor-pointer text-sm font-medium text-primary-800">
                    Vergangene Veranstaltungen anzeigen ({events.past.length})
                  </summary>
                  <div className="mt-4 space-y-2.5 opacity-75">
                    {events.past.map((event) => (
                      <EventListItem key={event.id} event={event} />
                    ))}
                  </div>
                </details>
              ) : null}
            </Panel>

            {/*
              Anreise erscheint nur, wenn wenigstens eine Angabe gepflegt ist.
              Auch die drei Karten und die beiden Verweise werden je einzeln
              geprüft – eine leere Karte oder ein Knopf ins Leere wäre für
              Besucher schlechter als gar kein Hinweis.
            */}
            {hatAnreise ? (
              <Panel title="Anreise" id="anreise">
                <div className="grid gap-4 md:grid-cols-2">
                  {org.arrivalByCar ? (
                    <ArrivalCard icon={Car} title="Mit dem Auto" text={org.arrivalByCar} />
                  ) : null}
                  {org.arrivalByPublicTransport ? (
                    <ArrivalCard
                      icon={TrainFront}
                      title="Mit dem ÖV"
                      text={org.arrivalByPublicTransport}
                    />
                  ) : null}
                  {org.arrivalNotes ? (
                    <ArrivalCard
                      icon={Info}
                      title="Weitere Hinweise"
                      text={org.arrivalNotes}
                    />
                  ) : null}
                </div>

                {org.arrivalMapUrl || org.arrivalTransportUrl ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {org.arrivalMapUrl ? (
                      <ButtonLink
                        href={org.arrivalMapUrl}
                        variant="outline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Map />
                        Auf der Karte ansehen
                      </ButtonLink>
                    ) : null}
                    {org.arrivalTransportUrl ? (
                      <ButtonLink
                        href={org.arrivalTransportUrl}
                        variant="outline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <TrainFront />
                        Fahrplan aufrufen
                      </ButtonLink>
                    ) : null}
                  </div>
                ) : null}
              </Panel>
            ) : null}

            {showGallery ? (
              <Panel title="Bildergalerie" id="galerie">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {org.media.map((image) => (
                    <figure
                      key={image.id}
                      className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted"
                    >
                      <Image
                        src={image.url}
                        alt={image.alt || `${org.name} – Impression`}
                        fill
                        sizes="(max-width: 640px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      {image.caption ? (
                        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-strong/85 to-transparent p-2.5 text-xs text-white">
                          {image.caption}
                        </figcaption>
                      ) : null}
                    </figure>
                  ))}
                </div>
              </Panel>
            ) : null}

            {org.history ? (
              <Panel title="Geschichte">
                <Prose text={org.history} />
              </Panel>
            ) : null}

            {org.repertoire ? (
              <Panel title="Repertoire">
                <Prose text={org.repertoire} />
              </Panel>
            ) : null}

            {showFaq ? (
              <Panel title="Häufige Fragen" id="faq">
                <div className="divide-y divide-border rounded-xl border border-border bg-card">
                  {org.faqs.map((faq) => (
                    <details key={faq.id} className="group p-4">
                      <summary className="flex cursor-pointer items-center justify-between gap-4 font-medium text-primary-900 marker:content-['']">
                        {faq.question}
                        <span
                          className="shrink-0 text-muted-foreground transition-transform group-open:rotate-45"
                          aria-hidden
                        >
                          +
                        </span>
                      </summary>
                      <div className="mt-2.5">
                        <Prose text={faq.answer} />
                      </div>
                    </details>
                  ))}
                </div>
              </Panel>
            ) : null}

            {showSponsors ? (
              <Panel title="Sponsoren" id="sponsoren">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {org.sponsors.map((sponsor) => {
                    const content = (
                      <>
                        {sponsor.logo?.url ? (
                          <div className="relative h-12 w-full">
                            <Image
                              src={sponsor.logo.url}
                              alt={sponsor.logo.alt || sponsor.name}
                              fill
                              sizes="200px"
                              className="object-contain"
                            />
                          </div>
                        ) : (
                          <p className="font-display text-sm font-semibold text-primary-800">
                            {sponsor.name}
                          </p>
                        )}
                        {sponsor.tier ? (
                          <p className="mt-2 text-xs text-muted-foreground">{sponsor.tier}</p>
                        ) : null}
                      </>
                    );
                    return sponsor.url ? (
                      <a
                        key={sponsor.id}
                        href={sponsor.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        title={sponsor.name}
                        className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-4 text-center transition-colors hover:bg-secondary"
                      >
                        {content}
                      </a>
                    ) : (
                      <div
                        key={sponsor.id}
                        className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-4 text-center"
                      >
                        {content}
                      </div>
                    );
                  })}
                </div>
              </Panel>
            ) : null}
          </div>

          {/* Seitenspalte */}
          <aside className="space-y-6">
            <Card className="p-5">
              <h2 className="mb-4 font-display text-base font-semibold">Kontakt</h2>
              <ul className="space-y-3 text-sm">
                <li className="flex gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="text-slate-700">
                    {address || org.city}
                    <br />
                    {org.canton.name}
                  </span>
                </li>
                {org.contactName ? (
                  <li className="flex gap-2.5">
                    <Users className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="text-slate-700">{org.contactName}</span>
                  </li>
                ) : null}
                {org.contactEmail ? (
                  <li className="flex gap-2.5">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <a
                      href={`mailto:${org.contactEmail}`}
                      className="break-all text-primary-700 hover:underline"
                    >
                      {org.contactEmail}
                    </a>
                  </li>
                ) : null}
                {org.contactPhone ? (
                  <li className="flex gap-2.5">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <a href={`tel:${org.contactPhone}`} className="text-primary-700 hover:underline">
                      {org.contactPhone}
                    </a>
                  </li>
                ) : null}
              </ul>

              {org.bookingEmail ? (
                <div className="mt-4 rounded-lg bg-secondary p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                    Buchungsanfragen
                  </p>
                  <a
                    href={`mailto:${org.bookingEmail}`}
                    className="mt-1 block break-all text-sm text-primary-800 hover:underline"
                  >
                    {org.bookingEmail}
                  </a>
                </div>
              ) : null}

              <ButtonLink
                href={`https://www.openstreetmap.org/search?query=${mapQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                block
                className="mt-4"
              >
                <MapPin />
                Auf Karte anzeigen
              </ButtonLink>
            </Card>

            {org.socialLinks.length ? (
              <Card className="p-5">
                <h2 className="mb-3.5 font-display text-base font-semibold">Social Media</h2>
                <ul className="space-y-2">
                  {org.socialLinks.map((link) => (
                    <li key={link.id}>
                      <TrackedLink
                        href={link.url}
                        organizationId={org.id}
                        interaction="SOCIAL_CLICK"
                        meta={link.platform}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-secondary"
                      >
                        <span className="font-medium text-slate-700">
                          {link.label || SOCIAL_PLATFORM_LABELS[link.platform]}
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                      </TrackedLink>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            {showDownloads ? (
              <Card className="p-5">
                <h2 className="mb-3.5 font-display text-base font-semibold">Downloads</h2>
                <ul className="space-y-2">
                  {org.downloads.map((item) => {
                    const href = item.media?.url ?? item.externalUrl;
                    if (!href) return null;
                    return (
                      <li key={item.id}>
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-secondary"
                        >
                          <Download className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                          <span className="min-w-0 flex-1 truncate text-slate-700">{item.title}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ) : null}

            {org.claimStatus === "UNCLAIMED" ? (
              <Card className="border-dashed p-5">
                <h2 className="font-display text-base font-semibold">Gehört dir diese Seite?</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Dieses Profil wurde von Fas-Nav.ch erstellt. Übernimm es, um Inhalte selbst zu
                  pflegen und Veranstaltungen zu veröffentlichen.
                </p>
                <ButtonLink
                  href={`/profil-uebernehmen/${org.slug}`}
                  variant="outline"
                  block
                  className="mt-4"
                >
                  Profil übernehmen
                </ButtonLink>
              </Card>
            ) : null}

            <p className="text-xs text-muted-foreground">
              Zuletzt aktualisiert: {formatDate(org.updatedAt)}
            </p>
          </aside>
        </div>

        {related.length ? (
          <section className="border-t border-border py-12">
            <h2 className="mb-6 font-display text-xl font-bold">
              Weitere {isCarnival ? "Fasnachten" : "Guggen"} im Kanton {org.canton.name}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item) => (
                <OrganizationCard key={item.id} organization={item} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </article>
  );
}
