import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { sendMail } from "@/lib/mail";
import { notify, notifyOrganization, notifyStaff } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { isStaff, requireUser } from "@/lib/rbac";
import { getVisibleTicket } from "@/lib/queries/tickets";
import {
  staffMailTarget,
  staffTicketMail,
  ticketReplyNotifyMail,
} from "@/lib/ticket-mail-delivery";
import { nextTicketStatus, ticketReplyNotificationTitle } from "@/lib/ticket-status";
import { ticketMessageSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Antwort in einem Ticket erfassen. */
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requireUser();

    // Sichtbarkeitsprüfung: fremde Tickets liefern 404 statt 403,
    // damit deren Existenz nicht preisgegeben wird.
    const ticket = await getVisibleTicket(id, user);
    if (!ticket) return jsonError("Ticket nicht gefunden.", 404);

    if (ticket.status === "CLOSED" && !isStaff(user.role)) {
      return jsonError(
        "Dieses Ticket ist geschlossen. Bitte erstelle bei Bedarf ein neues Ticket.",
        409,
      );
    }

    const body = await parseBody(request, ticketMessageSchema);
    const staff = isStaff(user.role);

    // Interne Notizen sind ausschliesslich Admin und Team vorbehalten.
    const isInternal = staff ? body.isInternal : false;

    // Der Zustand richtet sich danach, wer zuletzt sichtbar geschrieben hat –
    // die Regel steht zentral in lib/ticket-status.ts.
    const status = nextTicketStatus({
      current: ticket.status,
      fromStaff: staff,
      isInternal,
    });

    // Nachricht und Zustand in einem Zug: Bricht das Schreiben ab, bleibt auch
    // der Zustand unverändert. Ein Ticket, das auf eine nie gespeicherte
    // Antwort wartet, wäre schlimmer als gar keine Automatik.
    const message = await prisma.$transaction(async (tx) => {
      const erstellt = await tx.ticketMessage.create({
        data: {
          ticketId: id,
          authorId: user.id,
          authorName: user.name ?? null,
          body: body.body,
          isInternal,
        },
        select: { id: true, body: true, isInternal: true, createdAt: true },
      });

      await tx.ticket.update({
        where: { id },
        data: { lastReplyAt: new Date(), status },
      });

      return erstellt;
    });

    // Interne Notizen erreichen die Organisation weder als Meldung noch als
    // E-Mail. Und beides folgt der Nachricht, nie dem Zustand: Der Zustand
    // ist bloss die Folge der Antwort, eine eigene Meldung darüber wäre
    // dasselbe Ereignis ein zweites Mal.
    if (!isInternal) {
      // Alles, was Vorlage und Meldung brauchen, an einer Stelle.
      const kontext = {
        ticketId: id,
        ticketNumber: ticket.number,
        ticketSubject: ticket.subject,
        organizationName: ticket.organization?.name ?? null,
        senderName: user.name ?? user.email ?? "Fas-Nav.ch",
        messageBody: body.body,
      };

      if (staff) {
        // Der Betreff steht im Titel, damit in der Liste der
        // Benachrichtigungen ohne Öffnen erkennbar ist, worum es geht. Sehr
        // lange Betreffzeilen werden gekürzt; der vollständige Text steht
        // weiterhin im Ticket selbst.
        const titel = ticketReplyNotificationTitle({
          number: ticket.number,
          subject: ticket.subject,
        });

        const vorlage = await ticketReplyNotifyMail(kontext);

        if (ticket.organizationId) {
          await notifyOrganization(
            ticket.organizationId,
            {
              type: "TICKET_REPLY",
              title: titel,
              body: ticket.subject,
              link: `/dashboard/tickets/${id}`,
              mail: vorlage,
            },
            // Wer selbst geschrieben hat, wird darüber nicht benachrichtigt.
            // Greift, wenn ein Admin- oder Teamkonto zugleich Mitglied der
            // Organisation ist.
            { skipUserId: user.id },
          );
        } else if (ticket.authorId && ticket.authorId !== user.id) {
          await notify({
            userId: ticket.authorId,
            type: "TICKET_REPLY",
            title: titel,
            body: ticket.subject,
            link: `/dashboard/tickets/${id}`,
            mail: vorlage,
          });
        }
      } else {
        // Die Meldung im Dashboard erreicht wie bisher das ganze Team – dort
        // kostet sie nichts und geht nicht verloren.
        await notifyStaff(
          {
            type: "TICKET_REPLY",
            title: ticketReplyNotificationTitle({
              number: ticket.number,
              subject: ticket.subject,
              forStaff: true,
            }),
            body: ticket.subject,
            link: `/dashboard/tickets/${id}`,
          },
          { skipUserId: user.id },
        );

        // Die E-Mail dagegen geht an genau eine Adresse: an die zuständige
        // Person, sonst an die hinterlegte Sammeladresse.
        try {
          const ziel = await staffMailTarget(ticket);
          if (ziel) await sendMail(await staffTicketMail(kontext, ziel));
        } catch (error) {
          // Die Antwort ist längst gespeichert. Ein Fehler beim Benachrichtigen
          // darf sie nicht nachträglich zum Fehlschlag machen.
          console.error("[tickets] Teammeldung per E-Mail fehlgeschlagen:", error);
        }
      }
    }

    return jsonOk(message, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
