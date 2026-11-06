import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isStaff } from "@/lib/rbac";
import { ticketScope } from "@/lib/queries/tickets";
import { ticketBadgeStatuses } from "@/lib/ticket-status";
import type { SessionUser } from "@/lib/rbac";

/** Number of pending, actionable items shown alongside Dashboard in the sidebar. */
export async function dashboardTodoCount(user: SessionUser, testMode = false): Promise<number> {
  if (!isStaff(user.role) || testMode) {
    const scope = await ticketScope(user);
    return prisma.ticket.count({
      where: { AND: [scope, { status: { in: ticketBadgeStatuses(user.role as Role) } }] },
    });
  }

  const admin = user.role === "ADMIN";
  const today = new Date().toISOString().slice(0, 10);
  const [contacts, tickets, claims, reviews, boarding, unreadMails, followups] = await Promise.all([
    prisma.ticket.count({ where: { category: "CONTACT", status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.ticket.count({ where: { category: { not: "CONTACT" }, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.claimRequest.count({ where: { status: { in: ["PENDING", "IN_REVIEW"] } } }),
    prisma.organization.count({ where: { OR: [{ status: "PENDING_REVIEW" }, { needsManualReview: true }] } }),
    admin ? prisma.boardingInvitation.count({ where: { status: "PENDING" } }) : Promise.resolve(0),
    admin ? prisma.mailConversation.count({ where: { unread: true } }) : Promise.resolve(0),
    prisma.siteSetting.findMany({ where: { group: "crm" }, select: { value: true } }),
  ]);
  const due = followups.filter(row => {
    const v = row.value;
    return v && typeof v === "object" && !Array.isArray(v)
      && typeof (v as Record<string, unknown>).nextFollowUp === "string"
      && (v as Record<string, string>).nextFollowUp <= today;
  }).length;
  return contacts + tickets + claims + reviews + boarding + unreadMails + due;
}
