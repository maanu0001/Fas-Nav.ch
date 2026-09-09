import type { Metadata } from "next";
import Link from "next/link";

import { CantonCrest } from "@/components/public/canton-crest";
import { cantonOverview } from "@/lib/queries/public";
import { buildMetadata } from "@/lib/seo";
import { REGIONS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Fasnacht nach Kanton – alle 26 Kantone",
  description:
    "Fasnachten, Guggenmusiken und Veranstaltungen nach Kanton. Finde die Fasnacht in deiner Region – von Basel-Stadt bis Graubünden.",
  path: "/kantone",
  keywords: ["Fasnacht Kanton", "Fasnacht Schweiz", "Fasnacht Region"],
});

export default async function CantonsPage() {
  const cantons = await cantonOverview();

  const byRegion = REGIONS.map((region) => ({
    region,
    items: cantons.filter((c) => c.region === region),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <div className="border-b border-border bg-muted/40">
        <div className="container py-10 sm:py-14">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent-700">
            Übersicht
          </p>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Fasnacht nach Kanton</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
            Die Schweizer Fasnacht ist regional geprägt. Wähle deinen Kanton und entdecke, was in
            deiner Region läuft.
          </p>
        </div>
      </div>

      <div className="container space-y-12 py-12">
        {byRegion.map((group) => (
          <section key={group.region}>
            <h2 className="mb-5 font-display text-xl font-bold">{group.region}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((canton) => (
                <Link
                  key={canton.code}
                  href={`/kanton/${canton.slug}`}
                  className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-card"
                >
                  <CantonCrest code={canton.code} name={canton.name} className="h-11 w-11" />
                  <div className="min-w-0">
                    <p className="truncate font-display font-semibold text-primary-900">
                      {canton.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {canton.organizationCount}{" "}
                      {canton.organizationCount === 1 ? "Organisation" : "Organisationen"} ·{" "}
                      {canton.eventCount} {canton.eventCount === 1 ? "Termin" : "Termine"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
