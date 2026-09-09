import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { ticketUpdateSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Status, Priorität und Zuweisung ändern.
 * Nur Admin und Team dürfen den Bearbeitungszustand steuern.
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requirePermission("viewAllTickets");
    const body = await parseBody(request, ticketUpdateSchema);

    const before = await prisma.ticket.findUnique({
      where: { id },
      select: { id: true, number: true, subject: true, status: true, organizationId: true },
    });
    if (!before) return jsonError("Ticket nicht gefunden.", 404);

    const closing =
      (body.status === "CLOSED" || body.status === "RESOLVED") &&
      before.status !== body.status;

    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        ...body,
        ...(closing ? { closedAt: new Date() } : {}),
      },
      select: { id: true, number: true, status: true, priority: true, assigneeId: true },
    });

    await logAudit({
      userId: user.id,
      userLabel: user.email,
      action: "ticket.update",
      entity: "Ticket",
      entityId: id,
      entityLabel: `#${before.number}`,
      before: { status: before.status },
      after: { status: ticket.status },
    });

    // Bewusst keine Benachrichtigung an die Organisation: Der Zustand folgt
    // seit der Antwortautomatik dem Gesprächsverlauf, eine Meldung darüber
    // käme also fast immer zusätzlich zur Meldung über die Antwort selbst –
    // zweimal dasselbe Ereignis. Die Antwort ist die Nachricht, der Zustand
    // nur ihre Folge. Im Ticket ist er weiterhin sichtbar, und das
    // Änderungsprotokoll hält ihn ohnehin fest.

    return jsonOk(ticket);
  } catch (error) {
    return handleApiError(error);
  }
}
