"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { apiRequest } from "@/lib/client-api";

/**
 * Verweis auf eine Benachrichtigung, der den Zähler sofort nachführt.
 *
 * Ohne JavaScript bleibt es ein gewöhnlicher Verweis auf die Öffnen-Seite, die
 * serverseitig als gelesen markiert und weiterleitet. Diese Seite ist auch der
 * Ort, an dem die Berechtigung geprüft wird.
 *
 * Mit JavaScript wird die Reihenfolge umgedreht, und darauf kommt es an:
 * erst markieren, dann die Umrahmung auffrischen, dann weitergehen. Die
 * frühere Umsetzung hat beim Klick aufgefrischt und danach markiert – der
 * Zähler las also noch den alten Stand und hinkte um einen Schritt hinterher.
 *
 * Gezählt wird immer serverseitig aus `readAt`; es wird nichts im Browser
 * hochgerechnet. Zwei schnell hintereinander geöffnete Benachrichtigungen
 * ergeben deshalb zuverlässig 3, 2, 1. Eine bereits gelesene ändert nichts,
 * weil die Bedingung `readAt: null` im Endpunkt dann keinen Datensatz trifft.
 * Schlägt das Markieren fehl, folgt der Verweis trotzdem – die Serverseite
 * holt das Markieren dann nach.
 */
export function NotificationLink({
  id,
  href,
  unread,
  label,
  children,
}: {
  id: string;
  /** Ziel der Benachrichtigung, bereits serverseitig geprüft. */
  href: string;
  unread: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function oeffnen(event: React.MouseEvent) {
    // Modifiziertes Klicken (neuer Tab) dem Browser überlassen.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    if (!unread || pending) return;

    event.preventDefault();
    setPending(true);
    try {
      await apiRequest("/api/notifications", { method: "POST", body: { ids: [id] } });
    } catch {
      // Kein Hinweis nötig: Die Öffnen-Seite markiert gleich selbst.
    } finally {
      // Erst wechseln, dann auffrischen. Umgekehrt würde die Auffrischung noch
      // die alte Seite betreffen und der Wechsel danach die zwischen-
      // gespeicherte Umrahmung samt altem Zähler wiederverwenden.
      router.push(href);
      router.refresh();
      setPending(false);
    }
  }

  return (
    <Link
      href={`/dashboard/benachrichtigungen/${id}`}
      className="block"
      aria-label={label}
      onClick={oeffnen}
    >
      {children}
    </Link>
  );
}
