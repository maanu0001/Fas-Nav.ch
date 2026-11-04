import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { publishedEventWhere } from "@/lib/queries/public";

type Props = { params: Promise<{ slug: string }> };

function escapeIcs(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function swissDay(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return get("year") + get("month") + get("day");
}

function nextDay(day: string): string {
  const date = new Date(Date.UTC(Number(day.slice(0, 4)), Number(day.slice(4, 6)) - 1, Number(day.slice(6, 8)) + 1));
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

export async function GET(_request: Request, { params }: Props) {
  const { slug } = await params;
  const event = await prisma.event.findFirst({
    where: { slug, ...publishedEventWhere },
    select: {
      id: true, slug: true, title: true, description: true, shortDescription: true,
      startDate: true, endDate: true, allDay: true, venueName: true,
      street: true, zip: true, city: true, updatedAt: true,
    },
  });
  if (!event) return new NextResponse("Veranstaltung nicht gefunden", { status: 404 });

  const start = event.startDate;
  const end = event.endDate && event.endDate > start ? event.endDate : null;
  const dates = event.allDay
    ? ["DTSTART;VALUE=DATE:" + swissDay(start), "DTEND;VALUE=DATE:" + nextDay(swissDay(end ?? start))]
    : ["DTSTART:" + utcStamp(start), "DTEND:" + utcStamp(end ?? new Date(start.getTime() + 2 * 3600000))];
  const location = [event.venueName, event.street, [event.zip, event.city].filter(Boolean).join(" "), "Schweiz"].filter(Boolean).join(", ");
  const url = "https://fas-nav.ch/event/" + encodeURIComponent(event.slug);
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FAS-NAV//Event Calendar//DE",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    "UID:" + event.id + "@fas-nav.ch",
    "DTSTAMP:" + utcStamp(new Date()),
    "LAST-MODIFIED:" + utcStamp(event.updatedAt),
    ...dates,
    "SUMMARY:" + escapeIcs(event.title),
    "DESCRIPTION:" + escapeIcs([event.shortDescription ?? event.description ?? "", url].filter(Boolean).join("\n\n")),
    "LOCATION:" + escapeIcs(location),
    "URL:" + url,
    "END:VEVENT", "END:VCALENDAR",
  ];
  // RFC 5545: Zeilen auf maximal 75 UTF-8-Oktette umbrechen.
  const folded = lines.map((line) => {
    const chunks: string[] = [];
    let current = "";
    for (const char of line) {
      if (Buffer.byteLength(current + char, "utf8") > (chunks.length ? 74 : 75)) {
        chunks.push(current);
        current = char;
      } else current += char;
    }
    chunks.push(current);
    return chunks.join("\r\n ");
  }).join("\r\n") + "\r\n";
  return new NextResponse(folded, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="fas-nav-event.ics"',
      "Cache-Control": "no-store",
    },
  });
}
