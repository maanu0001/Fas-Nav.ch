import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { notifyStaff } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { isStaff, requireOrgAccess, requireUser } from "@/lib/rbac";
import { ticketCreateSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/** Erstellt ein Support-Ticket für einen eingeloggten Benutzer. */
export async function POST(request: Request) {
  try {
    const user = await requireUser();

    const limit = checkRateLimit(`ticket:${user.id}`, 10, 60 * 60_000);
    if (!limit.ok) {
      return jsonError("Zu viele Tickets in kurzer Zeit. Bitte warte einen Moment.", 429);
    }

    const body = await parseBody(request, ticketCreateSchema);

    // Kontaktanfragen der öffentlichen Website sind ausdrücklich keine
    // Support-Tickets. CONTACT bleibt vorerst als Legacy-Wert im Enum, damit
    // bestehende Anfragen migrationssicher weiter angezeigt werden können.
    if (body.category === "CONTACT") {
      return jsonError("Kontaktanfragen können nicht als Support-Ticket erstellt werden.", 422, {
        category: "Bitte wähle eine Support-Kategorie aus.",
      });
    }

    // Ein Ticket darf nur einer Organisation zugeordnet werden,
    // auf die der Benutzer tatsächlich Zugriff hat.
    if (body.organizationId) {
      await requireOrgAccess(body.organizationId);
    } else if (!isStaff(user.role)) {
      return jsonError("Bitte wähle die betroffene Organisation aus.", 422, {
        organizationId: "Bitte wähle die betroffene Organisation aus.",
      });
    }

    const ticket = await prisma.ticket.create({
      data: {
        subject: body.subject,
        category: body.category,
        priority: body.priority,
        organizationId: body.organizationId,
        authorId: user.id,
        messages: { create: { body: body.message, authorId: user.id } },
      },
      select: { id: true, number: true, subject: true, status: true },
    });

    await notifyStaff({
      type: "SYSTEM",
      title: `Neues Ticket #${ticket.number}`,
      body: `${user.name ?? user.email}: ${ticket.subject}`,
      link: `/dashboard/tickets/${ticket.id}`,
    });

    return jsonOk(ticket, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
