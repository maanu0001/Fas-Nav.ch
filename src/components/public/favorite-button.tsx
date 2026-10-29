"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export type FasNavFavorite = {
  id: string;
  kind: "event" | "organization";
  title: string;
  href: string;
  meta: string;
  date?: string;
};

const STORAGE_KEY = "fas-nav:meine-fasnacht:v1";

export function readFavorites(): FasNavFavorite[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeFavorites(items: FasNavFavorite[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("fasnav:favorites"));
}

export function FavoriteButton({ item, className }: { item: FasNavFavorite; className?: string }) {
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    const sync = () => setSaved(readFavorites().some((favorite) => favorite.id === item.id && favorite.kind === item.kind));
    sync();
    window.addEventListener("fasnav:favorites", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("fasnav:favorites", sync);
      window.removeEventListener("storage", sync);
    };
  }, [item.id, item.kind]);

  function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const current = readFavorites();
    const exists = current.some((favorite) => favorite.id === item.id && favorite.kind === item.kind);
    writeFavorites(exists ? current.filter((favorite) => !(favorite.id === item.id && favorite.kind === item.kind)) : [...current, item]);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? `${item.title} aus Meine Fasnacht entfernen` : `${item.title} zu Meine Fasnacht hinzufügen`}
      title={saved ? "Aus Meine Fasnacht entfernen" : "Zu Meine Fasnacht hinzufügen"}
      className={cn(
        "relative z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card/95 text-muted-foreground shadow-subtle backdrop-blur transition-all hover:scale-105 hover:text-accent-600",
        saved && "border-accent-200 bg-accent-50 text-accent-600",
        className,
      )}
    >
      <Heart className={cn("h-4 w-4", saved && "fill-current")} aria-hidden />
    </button>
  );
}
