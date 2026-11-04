"use client";

import { CalendarPlus, ChevronDown } from "lucide-react";

type Props = {
  title: string;
  slug: string;
  startDate: string;
  endDate: string | null;
  allDay: boolean;
  location: string;
  description: string;
};

function swissDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return get("year") + get("month") + get("day");
}

function googleDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function AddToCalendar({ title, slug, startDate, endDate, allDay, location, description }: Props) {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  const eventUrl = "https://fas-nav.ch/event/" + encodeURIComponent(slug);
  const dates = allDay
    ? swissDate(start) + "/" + swissDate(new Date((end ?? start).getTime() + 86400000))
    : googleDate(start) + "/" + googleDate(end && end > start ? end : new Date(start.getTime() + 2 * 3600000));
  const google = new URL("https://calendar.google.com/calendar/render");
  google.searchParams.set("action", "TEMPLATE");
  google.searchParams.set("text", title);
  google.searchParams.set("dates", dates);
  google.searchParams.set("details", [description, eventUrl].filter(Boolean).join("\n\n"));
  google.searchParams.set("location", location);
  if (allDay) google.searchParams.set("ctz", "Europe/Zurich");
  const ics = "/api/calendar/events/" + encodeURIComponent(slug);

  return (
    <details className="group relative">
      <summary className="flex h-11 w-full cursor-pointer list-none items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 [&::-webkit-details-marker]:hidden">
        <CalendarPlus className="h-4 w-4" aria-hidden />
        Zum Kalender hinzufügen
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="mt-2 overflow-hidden rounded-lg border border-border bg-card shadow-subtle">
        <a href={google.toString()} target="_blank" rel="noopener noreferrer" className="block px-4 py-3 text-sm hover:bg-secondary">
          Google Kalender
        </a>
        <a href={ics} className="block border-t border-border px-4 py-3 text-sm hover:bg-secondary">
          Apple Kalender / iPhone (.ics)
        </a>
        <a href={ics} className="block border-t border-border px-4 py-3 text-sm hover:bg-secondary">
          Outlook / andere Kalender (.ics)
        </a>
      </div>
    </details>
  );
}
