import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { ticketUpdateSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Status, Priorität und Zuweisung eines Support-Tickets ändern.
 * Nur Admin und Team dürfen den Bearbeitungszustand steuern.
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const user = await requirePermission("viewAllTickets");
    const body = await parseBody(request, ticketUpdateSchema);

    const before = await prisma.ticket.findFirst({
      where: { id, category: { not: "CONTACT" } },
      select: { id: true, number: true, subject: true, status: true, organizationId: true },
    });
    if (!before) return jsonError("Ticket nicht gefunden.", 404);

    if (body.category === "CONTACT") {
      return jsonError("Ein Support-Ticket kann nicht in eine Kontaktanfrage umgewandelt werden.", 422);
    }

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

    return jsonOk(ticket);
  } catch (error) {
    return handleApiError(error);
  }
}
