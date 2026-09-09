import type { TicketStatus } from "@prisma/client";

import { TICKET_STATUSES_FINAL } from "@/lib/constants";
import { truncate } from "@/lib/utils";

/**
 * Wer als Nächstes am Zug ist, ergibt sich aus der letzten sichtbaren Antwort.
 *
 * Antwortet das Team, wartet das Ticket auf die Organisation. Antwortet die
 * Organisation, wartet es auf uns. Damit stimmt der Zustand immer mit dem
 * Gesprächsverlauf überein, ohne dass jemand ihn von Hand nachführen muss.
 *
 * Zwei Fälle bleiben ausgenommen:
 *
 * - Eine interne Notiz ist keine Antwort an die Organisation. Sie darf den
 *   Zustand deshalb nicht verschieben – sonst wartete das Ticket sichtbar auf
 *   eine Rückmeldung, die niemand angefragt hat.
 * - Ein gelöstes oder geschlossenes Ticket bleibt geschlossen. Eine
 *   nachträgliche Bemerkung soll es nicht unbemerkt wieder aufreissen; wer es
 *   wieder öffnen will, setzt den Zustand ausdrücklich.
 */
export function nextTicketStatus(input: {
  current: TicketStatus;
  fromStaff: boolean;
  isInternal: boolean;
}): TicketStatus {
  if (input.isInternal) return input.current;
  if (TICKET_STATUSES_FINAL.includes(input.current)) return input.current;
  return input.fromStaff ? "WAITING_FOR_CUSTOMER" : "OPEN";
}

/** Hat die Antwort den Zustand tatsächlich verschoben? */
export function ticketStatusChanged(vorher: TicketStatus, nachher: TicketStatus): boolean {
  return vorher !== nachher;
}

/** Länge, ab der ein Betreff im Meldungstitel gekürzt wird. */
export const TICKET_SUBJECT_MAX = 120;

/**
 * Titel einer Meldung über eine neue Antwort.
 *
 * Die Meldung soll das Ticket benennen, das gemeint ist. Dafür braucht es die
 * fortlaufende Ticketnummer, wie sie auch im Dashboard steht – nicht die
 * technische Kennung aus der Datenbank, mit der niemand etwas anfangen kann –
 * und den Betreff. Lange Betreffzeilen werden hier gekürzt, damit der Titel in
 * Liste und Glocke lesbar bleibt; der vollständige Betreff steht weiterhin im
 * Ticket, auf das die Meldung verweist.
 */
export function ticketReplyNotificationTitle(input: {
  number: number;
  subject: string;
  forStaff?: boolean;
}): string {
  const einleitung = input.forStaff ? "Neue Antwort in Ticket" : "Antwort auf Ticket";
  return `${einleitung} #${input.number}: ${truncate(input.subject, TICKET_SUBJECT_MAX)}`;
}
