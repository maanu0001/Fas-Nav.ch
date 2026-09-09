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
 * Das Wappen steht ohne eigene Fläche: Die Dateien sind freigestellt und
 * bringen ihre Schildform samt Umriss mit. Ein Rahmen darum würde sie nur
 * verkleinern und wie aufgeklebt wirken lassen. Für den Dunkelmodus braucht
 * es ihn auch nicht – die hellen Anteile der Wappen sind gefüllt, nicht
 * durchsichtig, und heben sich vom dunklen Grund ab.
 *
 * Das Kürzel dagegen behält seine Fläche: Reiner Text ohne Grund sähe an
 * dieser Stelle wie ein Fehler aus.
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

  const kuerzelPlatte = cn(
    "flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary",
    "font-display text-sm font-bold text-primary-700",
    className,
  );

  if (!pfad || fehlgeschlagen) {
    return <span className={kuerzelPlatte}>{kuerzel}</span>;
  }

  return (
    <span className={cn("flex shrink-0 items-center justify-center", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={pfad}
        alt={cantonCrestAlt(code, name)}
        // Volle Höhe, Breite nach Seitenverhältnis: Wappen sind hochkant,
        // in einem quadratischen Rahmen blieben sie sonst deutlich kleiner
        // als der Platz, den sie bekommen.
        className="h-full w-auto max-w-full object-contain"
        loading="lazy"
        decoding="async"
        onError={() => setFehlgeschlagen(true)}
      />
    </span>
  );
}
