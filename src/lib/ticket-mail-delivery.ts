import { getMailSettings } from "@/lib/mail-settings";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/rbac";
import { absoluteUrl } from "@/lib/utils";
import {
  fillTicketPlaceholders,
  messagePreview,
  ticketMailHtml,
  type TicketMailPlaceholders,
} from "@/lib/ticket-mail";
import type { MailMessage } from "@/lib/mail";
import type { NotifyRecipient } from "@/lib/notifications";

/**
 * Wer bei einer Ticketantwort eine E-Mail bekommt – und wer nicht.
 *
 * Die Regeln stehen bewusst an einer Stelle, weil sie leicht auseinander
 * laufen: Es sind Ausnahmen, und Ausnahmen wiederholt man nicht gern in zwei
 * Endpunkten.
 *
 * Keine Mail bekommt:
 * - wer die Nachricht selbst geschrieben hat,
 * - wer Ticketmeldungen abbestellt hat,
 * - wer bei einer internen Notiz auf der Kundenseite steht,
 * - jeder, wenn sich nur der Zustand geändert hat: Der Zustand folgt der
 *   Antwort, eine eigene Meldung darüber wäre dasselbe Ereignis zweimal.
 */

export type TicketMailContext = {
  ticketId: string;
  ticketNumber: number;
  ticketSubject: string;
  organizationName: string | null;
  senderName: string;
  messageBody: string;
};

/** Baut die Platzhalterwerte für einen bestimmten Empfänger. */
function platzhalter(
  context: TicketMailContext,
  empfaengerName: string,
): TicketMailPlaceholders {
  return {
    recipientName: empfaengerName,
    ticketNumber: String(context.ticketNumber),
    ticketTitle: context.ticketSubject,
    senderName: context.senderName,
    ticketUrl: absoluteUrl(`/dashboard/tickets/${context.ticketId}`),
    organizationName: context.organizationName ?? "",
    messagePreview: messagePreview(context.messageBody),
    siteName: "Fas-Nav.ch",
    siteUrl: absoluteUrl("/"),
  };
}

/**
 * Erzeugt Betreff, Text und HTML aus der administrierten Vorlage.
 *
 * Gibt null zurück, wenn gar nicht versendet werden soll – der Aufrufer muss
 * diesen Fall nicht kennen, er reicht die Funktion einfach an `notify`
 * weiter.
 */
export async function ticketReplyMailFor(
  context: TicketMailContext,
): Promise<(empfaenger: { name: string; ticketEmails: boolean }) => Omit<MailMessage, "to"> | null> {
  const settings = await getMailSettings();

  return (empfaenger) => {
    // Abbestellt ist abbestellt – die interne Meldung im Dashboard bleibt
    // davon unberührt.
    if (!empfaenger.ticketEmails) return null;

    const werte = platzhalter(context, empfaenger.name);
    const text = fillTicketPlaceholders(settings.ticketBody, werte);

    return {
      subject: fillTicketPlaceholders(settings.ticketSubject, werte),
      text,
      html: ticketMailHtml({ body: text, ticketUrl: werte.ticketUrl }),
    };
  };
}

/** Wie `ticketReplyMailFor`, aber passend zur Empfängerform von `notify`. */
export async function ticketReplyNotifyMail(
  context: TicketMailContext,
): Promise<(empfaenger: NotifyRecipient) => Omit<MailMessage, "to"> | null> {
  return ticketReplyMailFor(context);
}

/**
 * Adresse und Name der Teamseite für eine Kundenantwort.
 *
 * Nicht jedes Admin- und Teamkonto bekommt eine E-Mail. Die Reihenfolge:
 *
 * 1. Ist das Ticket jemandem zugewiesen, geht die Mail an diese Person – sie
 *    bearbeitet es.
 * 2. Sonst an die in den Einstellungen hinterlegte Sammeladresse. Das ist der
 *    Fall, für den es diese Einstellung gibt: Tickets ohne Zuweisung.
 * 3. Ist auch die nicht gesetzt, wird keine Mail versendet. Die interne
 *    Meldung erreicht das Team trotzdem, wie bisher.
 *
 * Bewusst kein Rundmail an alle: Bei jeder Kundenantwort sämtliche Konten
 * anzuschreiben, führt dazu, dass niemand mehr hinsieht.
 */
export async function staffMailTarget(ticket: {
  assigneeId: string | null;
}): Promise<{ to: string; name: string } | null> {
  if (ticket.assigneeId) {
    const assignee = await prisma.user.findFirst({
      where: {
        id: ticket.assigneeId,
        isActive: true,
        role: { in: STAFF_ROLES },
        ticketEmails: true,
      },
      select: { email: true, name: true },
    });
    if (assignee?.email) return { to: assignee.email, name: assignee.name };
  }

  const settings = await getMailSettings();
  const sammeladresse = settings.ticketRecipient.trim();
  if (!sammeladresse) return null;

  return { to: sammeladresse, name: "Fas-Nav.ch Team" };
}

/**
 * Baut die Mail an die Teamseite.
 *
 * Anders als bei der Kundenseite hängt sie nicht an einer einzelnen internen
 * Meldung – das Ziel kann eine Sammeladresse ohne Konto sein. Versendet wird
 * genau einmal je Antwort, weil dieser Weg genau einmal durchlaufen wird.
 */
export async function staffTicketMail(
  context: TicketMailContext,
  ziel: { to: string; name: string },
): Promise<MailMessage> {
  const settings = await getMailSettings();
  const werte = platzhalter(context, ziel.name);
  const text = fillTicketPlaceholders(settings.ticketBody, werte);

  return {
    to: ziel.to,
    subject: fillTicketPlaceholders(settings.ticketSubject, werte),
    text,
    html: ticketMailHtml({ body: text, ticketUrl: werte.ticketUrl }),
  };
}
