import Link from "next/link";
import { Clock, MapPin, Ticket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { FavoriteButton } from "@/components/public/favorite-button";
import { MediaImage, type MediaLike } from "@/components/public/media-image";
import { EVENT_TYPE_LABELS } from "@/lib/constants";
import { formatDate, formatEventTime } from "@/lib/dates";
import { cn, formatChf } from "@/lib/utils";
import type { EventType, OrganizationType, Prisma } from "@prisma/client";

export type EventCardData = { id: string; title: string; slug: string; type: EventType; shortDescription: string | null; startDate: Date; endDate: Date | null; allDay: boolean; venueName: string | null; city: string; price: Prisma.Decimal | string | number | null; ticketUrl: string | null; isFeatured: boolean; canton: { code: string; name: string; slug: string }; organization: { name: string; slug: string; type: OrganizationType }; image: MediaLike };

export function DateTile({ date, className }: { date: Date; className?: string }) {
  return <div className={cn("flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-card text-center leading-none shadow-subtle", className)} aria-hidden><span className="text-[0.62rem] font-semibold uppercase tracking-wide text-accent-700">{formatDate(date, "MMM")}</span><span className="mt-0.5 font-display text-lg font-bold text-primary-900">{formatDate(date, "d")}</span></div>;
}

function favoriteFor(event: EventCardData) { return { id: event.id, kind: "event" as const, title: event.title, href: `/event/${event.slug}`, meta: `${event.venueName ? `${event.venueName}, ` : ""}${event.city} · ${event.canton.code}`, date: event.startDate.toISOString() }; }

export function EventListItem({ event }: { event: EventCardData }) {
  return (
    <article className="group relative flex gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary-200 hover:shadow-card">
      <DateTile date={event.startDate} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><Badge variant="secondary">{EVENT_TYPE_LABELS[event.type]}</Badge>{event.isFeatured ? <Badge variant="accent">Empfohlen</Badge> : null}</div>
        <h3 className="mt-2 font-display text-base font-semibold text-primary-900"><Link href={`/event/${event.slug}`} className="after:absolute after:inset-0 after:content-['']">{event.title}</Link></h3>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground"><span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />{formatEventTime(event.startDate, event.endDate, event.allDay)}</span><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />{event.venueName ? `${event.venueName}, ` : ""}{event.city} · {event.canton.code}</span></p>
        {event.shortDescription ? <p className="mt-2 line-clamp-2 text-sm text-slate-600">{event.shortDescription}</p> : null}
        <p className="mt-2.5 text-xs text-muted-foreground">Veranstalter: <span className="font-medium text-slate-700">{event.organization.name}</span>{event.price !== null && event.price !== undefined ? <> · <span className="font-medium text-slate-700">{Number(event.price) === 0 ? "Eintritt frei" : formatChf(Number(event.price))}</span></> : null}</p>
      </div>
      <div className="relative z-20 flex shrink-0 flex-col items-end gap-2"><FavoriteButton item={favoriteFor(event)} />{event.ticketUrl ? <span className="hidden items-center gap-1 rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-semibold text-primary-800 sm:inline-flex"><Ticket className="h-3.5 w-3.5" aria-hidden />Tickets</span> : null}</div>
    </article>
  );
}

export function EventCard({ event, className }: { event: EventCardData; className?: string }) {
  return (
    <article className={cn("group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-subtle transition-all hover:-translate-y-0.5 hover:shadow-card", className)}>
      <div className="relative aspect-[16/10] overflow-hidden bg-muted"><MediaImage media={event.image} alt={event.title} className="transition-transform duration-500 group-hover:scale-[1.03]" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" /><div className="absolute left-3 top-3"><DateTile date={event.startDate} className="h-12 w-12" /></div><FavoriteButton item={favoriteFor(event)} className="absolute right-3 top-3" /></div>
      <div className="flex flex-1 flex-col p-4"><Badge variant="secondary" className="w-fit">{EVENT_TYPE_LABELS[event.type]}</Badge><h3 className="mt-2.5 line-clamp-2 font-display text-base font-semibold text-primary-900"><Link href={`/event/${event.slug}`} className="after:absolute after:inset-0 after:content-['']">{event.title}</Link></h3><p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden /><span className="truncate">{event.city} · {event.canton.code}</span></p><p className="mt-auto pt-3 text-xs text-muted-foreground">{formatEventTime(event.startDate, event.endDate, event.allDay)}</p></div>
    </article>
  );
}
