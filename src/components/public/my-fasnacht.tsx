"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, Heart, MapPin, PartyPopper } from "lucide-react";
import { FavoriteButton, readFavorites, type FasNavFavorite } from "@/components/public/favorite-button";
import { ButtonLink } from "@/components/ui/button";

export function MyFasnacht() {
  const [items, setItems] = React.useState<FasNavFavorite[]>([]);

  React.useEffect(() => {
    const sync = () => setItems(readFavorites());
    sync();
    window.addEventListener("fasnav:favorites", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("fasnav:favorites", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const events = items
    .filter((item) => item.kind === "event")
    .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const organizations = items.filter((item) => item.kind === "organization").sort((a, b) => a.title.localeCompare(b.title));

  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
        <Heart className="mx-auto h-8 w-8 text-accent-500" aria-hidden />
        <h2 className="mt-4 font-display text-xl font-bold">Deine Fasnacht ist noch leer</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Speichere Veranstaltungen, Fasnachten und Guggen über das Herz. Deine Auswahl bleibt auf diesem Gerät gespeichert – ganz ohne Account.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/agenda">Agenda entdecken</ButtonLink>
          <ButtonLink href="/karte" variant="outline">Karte öffnen</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.35fr_.65fr]">
      <section>
        <div className="mb-4 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-primary-600" aria-hidden />
          <h2 className="font-display text-xl font-bold">Meine Termine</h2>
          <span className="text-sm text-muted-foreground">({events.length})</span>
        </div>
        {events.length ? (
          <div className="space-y-3">
            {events.map((item) => (
              <article key={`${item.kind}-${item.id}`} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-subtle">
                <div className="min-w-0 flex-1">
                  <Link href={item.href} className="font-display font-semibold text-primary-900 hover:text-primary-700">{item.title}</Link>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" aria-hidden />{item.meta}</p>
                  {item.date ? <p className="mt-1 text-xs font-medium text-primary-700">{new Intl.DateTimeFormat("de-CH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.date))}</p> : null}
                </div>
                <FavoriteButton item={item} />
              </article>
            ))}
          </div>
        ) : <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">Noch keine Veranstaltungen gespeichert.</p>}
      </section>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <PartyPopper className="h-5 w-5 text-accent-600" aria-hidden />
          <h2 className="font-display text-xl font-bold">Meine Organisationen</h2>
          <span className="text-sm text-muted-foreground">({organizations.length})</span>
        </div>
        <div className="space-y-3">
          {organizations.map((item) => (
            <article key={`${item.kind}-${item.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-subtle">
              <div className="min-w-0 flex-1">
                <Link href={item.href} className="font-display font-semibold text-primary-900 hover:text-primary-700">{item.title}</Link>
                <p className="mt-1 text-sm text-muted-foreground">{item.meta}</p>
              </div>
              <FavoriteButton item={item} />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
