import type { Metadata } from "next";

import { DashboardShell } from "@/components/dashboard/sidebar";
import { MaintenanceScreen } from "@/components/maintenance/maintenance-screen";
import { getDashboardContext } from "@/lib/dashboard-context";
import { PUBLICATION_STATUS_LABELS, ROLE_LABELS } from "@/lib/constants";
import { maintenanceScreenFor } from "@/lib/maintenance";
import { dashboardNavigation } from "@/lib/navigation";
import { prisma } from "@/lib/prisma";
import { openContactRequestCounts } from "@/lib/queries/contact-requests";
import { ticketScope } from "@/lib/queries/tickets";
import { ticketBadgeStatuses } from "@/lib/ticket-status";
import { can } from "@/lib/rbac";
import type { Role } from "@prisma/client";

// Das Dashboard ist immer benutzerbezogen und liest zudem den Wartungsmodus
// aus der Datenbank. Es darf deshalb nicht vorab gerendert werden.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s | Fas-Nav Dashboard" },
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Während der Wartung arbeitet nur die Administration weiter. Ein Login
  // allein hebt den Wartungsmodus also nicht auf.
  const maintenance = await maintenanceScreenFor();
  if (maintenance) return <MaintenanceScreen message={maintenance.message} />;

  const context = await getDashboardContext();
  const role = context.user.role as Role;

  // Zuschriften zählt nur, wer sie auch bearbeiten darf – sonst entstünde
  // eine Zahl zu Datensätzen, die der Rolle verborgen bleiben.
  const darfKontaktanfragen = can(role, "handleContactRequests");

  const [unreadNotifications, openTickets, kontaktanfragen] = await Promise.all([
    prisma.notification.count({ where: { userId: context.user.id, readAt: null } }),
    prisma.ticket.count({
      where: {
        AND: [
          await ticketScope({
            id: context.user.id,
            role,
            isActive: true,
            name: context.user.name,
            email: context.user.email,
          }),
          // Der Zähler zeigt, worauf die eigene Seite reagieren muss: Admin
          // und Team sehen die Tickets, die auf sie warten, Organisationen
          // die, in denen wir auf ihre Rückmeldung warten. Abgeschlossene
          // zählen in keinem Fall mit. Zusammen mit ticketScope oben kann so
          // nichts gezählt werden, was die Rolle nicht sehen darf.
          { status: { in: ticketBadgeStatuses(role) } },
        ],
      },
    }),
    darfKontaktanfragen ? openContactRequestCounts() : Promise.resolve(null),
  ]);

  return (
    <DashboardShell
      navigation={dashboardNavigation(role, context.organization?.id ?? null)}
      user={{
        name: context.user.name,
        email: context.user.email,
        roleLabel: ROLE_LABELS[role],
      }}
      organizations={
        context.organization
          ? {
              activeId: context.organization.id,
              items: context.organizations.map((org) => ({
                id: org.id,
                name: org.name,
                slug: org.slug,
                type: org.type,
                membershipRole: org.membershipRole,
                statusLabel:
                  PUBLICATION_STATUS_LABELS[
                    org.status as keyof typeof PUBLICATION_STATUS_LABELS
                  ] ?? org.status,
                published: org.status === "PUBLISHED",
              })),
            }
          : null
      }
      unreadNotifications={unreadNotifications}
      badges={{
        "/dashboard/tickets": openTickets,
        ...(kontaktanfragen ? { "/dashboard/kontaktanfragen": kontaktanfragen.total } : {}),
      }}
    >
      {children}
    </DashboardShell>
  );
}
