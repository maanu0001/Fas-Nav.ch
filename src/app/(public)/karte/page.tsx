import type { Metadata } from "next";
import { SwitzerlandMap } from "@/components/public/switzerland-map";
import { cantonOverview } from "@/lib/queries/public";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Fasnacht-Karte Schweiz",
  description: "Entdecke Fasnachten, Guggen und Veranstaltungen in allen Schweizer Kantonen auf der interaktiven Fas-Nav-Karte.",
  path: "/karte",
  keywords: ["Fasnacht Karte Schweiz", "Fasnacht Kantone", "Guggen Schweiz", "Fasnacht Veranstaltungen"],
});

export default async function KartePage() {
  const cantons = await cantonOverview();
  return (
    <div className="container py-10 sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-700">Fasnacht Schweiz</p>
      <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Die Fasnacht auf der Karte</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">Wähle einen Kanton und entdecke die dort erfassten Fasnachten, Guggenmusiken und kommenden Veranstaltungen.</p>
      <div className="mt-8"><SwitzerlandMap cantons={cantons} /></div>
    </div>
  );
}
