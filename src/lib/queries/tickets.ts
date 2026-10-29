import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { isStaff, type SessionUser } from "@/lib/rbac";

/**
 * Baut den Sichtbarkeitsfilter für Support-Tickets.
 *
 * Website-Kontaktanfragen werden zwar aus Gründen der Rückwärtskompatibilität
 * weiterhin in der bestehenden Tabelle gespeichert, gehören fachlich aber
 * nicht zum Ticket-System und werden deshalb hier immer ausgeschlossen.
 * Admin und Team sehen alle echten Support-Tickets; Organisationen
 * ausschliesslich ihre eigenen.
 */
export async function ticketScope(user: SessionUser): Promise<Prisma.TicketWhereInput> {
  const supportOnly: Prisma.TicketWhereInput = { category: { not: "CONTACT" } };

  if (isStaff(user.role)) return supportOnly;

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    select: { organizationId: true },
  });

  const organizationIds = memberships.map((m) => m.organizationId);

  return {
    AND: [
      supportOnly,
      {
        OR: [
          { authorId: user.id },
          ...(organizationIds.length ? [{ organizationId: { in: organizationIds } }] : []),
        ],
      },
    ],
  };
}

/** Lädt ein Support-Ticket, sofern der Benutzer es sehen darf. */
export async function getVisibleTicket(id: string, user: SessionUser) {
  const scope = await ticketScope(user);
  const staff = isStaff(user.role);

  return prisma.ticket.findFirst({
    where: { AND: [{ id }, scope] },
    include: {
      organization: { select: { id: true, name: true, slug: true, type: true } },
      author: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true } },
      messages: {
        // Interne Notizen bleiben für Organisationen unsichtbar.
        where: staff ? {} : { isInternal: false },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { id: true, name: true, role: true } } },
      },
    },
  });
}
