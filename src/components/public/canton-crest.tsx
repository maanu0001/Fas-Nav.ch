"use client";

import * as React from "react";

import { cantonCrestAlt, cantonCrestPath } from "@/lib/cantons";
import { cn } from "@/lib/utils";

/**
 * Wappen eines Kantons, mit Rückfall auf das Kürzel.
 *
 * Der Rückfall greift zweistufig. Zuerst entscheidet die Zuordnung: Für einen
 * unbekannten Code und für einen Kanton ohne hinterlegte Datei entsteht gar
 * kein Bildelement, es wird also nichts angefragt, was fehlschlagen könnte.
 * Erst danach dient `onError` als Netz für den seltenen Fall, dass eine
 * eingetragene Datei doch nicht ausgeliefert wird. Ein kaputtes Bildsymbol
 * erscheint dadurch nie, und die Seite bleibt vollständig nutzbar, solange
 * die Wappendateien noch fehlen.
 *
 * Das Wappen behält sein Seitenverhältnis (`object-contain`) und sitzt auf
 * einer neutralen Fläche aus den bestehenden Tokens, damit es in beiden
 * Themen ruhig steht: Kantonswappen sind farbig und brauchen einen eigenen
 * Grund, sonst verschwinden helle Anteile im Dunkelmodus.
 *
 * Bewusst ein einfaches img-Element statt next/image: Die Dateien sind kleine
 * lokale Vektorgrafiken, für die sich weder Grössenvarianten noch eine
 * Optimierung lohnen.
 */
export function CantonCrest({
  code,
  name,
  className,
}: {
  code: string;
  name?: string;
  className?: string;
}) {
  const [fehlgeschlagen, setFehlgeschlagen] = React.useState(false);
  const pfad = cantonCrestPath(code);
  const kuerzel = code.trim().toUpperCase();

  const rahmen = cn(
    "flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary",
    className,
  );

  if (!pfad || fehlgeschlagen) {
    return (
      <span className={cn(rahmen, "font-display text-sm font-bold text-primary-700")}>
        {kuerzel}
      </span>
    );
  }

  return (
    <span className={cn(rahmen, "bg-white p-1 dark:bg-neutral-100")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={pfad}
        alt={cantonCrestAlt(code, name)}
        className="h-full w-full object-contain"
        loading="lazy"
        decoding="async"
        onError={() => setFehlgeschlagen(true)}
      />
    </span>
  );
}
