import type { Metadata } from "next";
import { MyFasnacht } from "@/components/public/my-fasnacht";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Meine Fasnacht",
  description: "Stelle dir deine persönliche Fasnachtsagenda aus Veranstaltungen, Fasnachten und Guggen zusammen.",
  path: "/meine-fasnacht",
  noIndex: true,
});

export default function MeineFasnachtPage() {
  return (
    <div className="container py-10 sm:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-700">Persönlich planen</p>
      <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Meine Fasnacht</h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        Deine gespeicherten Fasnachten, Guggen und Veranstaltungen an einem Ort. Die Auswahl wird lokal auf deinem Gerät gespeichert und benötigt keinen Account.
      </p>
      <div className="mt-8"><MyFasnacht /></div>
    </div>
  );
}
