import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { notify, notifyOrganization, notifyStaff } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { isStaff, requireUser } from "@/lib/rbac";
import { getVisibleTicket } from "@/lib/queries/tickets";
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

    if (!isInternal) {
      if (staff) {
        // Der Betreff steht im Titel, damit in der Liste der
        // Benachrichtigungen ohne Öffnen erkennbar ist, worum es geht. Sehr
        // lange Betreffzeilen werden gekürzt; der vollständige Text steht
        // weiterhin im Ticket selbst.
        const titel = ticketReplyNotificationTitle({
          number: ticket.number,
          subject: ticket.subject,
        });

        if (ticket.organizationId) {
          await notifyOrganization(ticket.organizationId, {
            type: "TICKET_REPLY",
            title: titel,
            body: ticket.subject,
            link: `/dashboard/tickets/${id}`,
            email: true,
          });
        } else if (ticket.authorId) {
          await notify({
            userId: ticket.authorId,
            type: "TICKET_REPLY",
            title: titel,
            body: ticket.subject,
            link: `/dashboard/tickets/${id}`,
            email: true,
          });
        }
      } else {
        await notifyStaff({
          type: "TICKET_REPLY",
          title: ticketReplyNotificationTitle({
            number: ticket.number,
            subject: ticket.subject,
            forStaff: true,
          }),
          body: ticket.subject,
          link: `/dashboard/tickets/${id}`,
        });
      }
    }

    return jsonOk(message, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
