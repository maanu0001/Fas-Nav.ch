import { NextRequest, NextResponse } from "next/server";
import { globalSearch } from "@/lib/queries/public";

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 120);
  if (q.length < 2) return NextResponse.json({ items: [] });

  const results = await globalSearch(q);
  const items = [
    ...results.carnivals.slice(0, 3).map((org) => ({ id: `org-${org.id}`, kind: "Fasnacht", title: org.name, subtitle: `${org.city} · ${org.canton.code}`, href: `/fasnacht/${org.slug}` })),
    ...results.guggen.slice(0, 3).map((org) => ({ id: `org-${org.id}`, kind: "Gugge", title: org.name, subtitle: `${org.city} · ${org.canton.code}`, href: `/gugge/${org.slug}` })),
    ...results.events.slice(0, 4).map((event) => ({ id: `event-${event.id}`, kind: "Veranstaltung", title: event.title, subtitle: `${event.city} · ${event.canton.code}`, href: `/event/${event.slug}` })),
    ...results.cantons.slice(0, 2).map((canton) => ({ id: `canton-${canton.code}`, kind: "Kanton", title: canton.name, subtitle: canton.region, href: `/kanton/${canton.slug}` })),
  ].slice(0, 8);

  return NextResponse.json({ items });
}
