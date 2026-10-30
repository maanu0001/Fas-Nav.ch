import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/sidebar";
import { MaintenanceScreen } from "@/components/maintenance/maintenance-screen";
import { getDashboardContext } from "@/lib/dashboard-context";
import { PUBLICATION_STATUS_LABELS, ROLE_LABELS } from "@/lib/constants";
import { maintenanceScreenFor } from "@/lib/maintenance";
import { dashboardNavigation } from "@/lib/navigation";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Dashboard", template: "%s | Fas-Nav Dashboard" }, robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const maintenance = await maintenanceScreenFor();
  if (maintenance) return <MaintenanceScreen message={maintenance.message} />;
  const context = await getDashboardContext();
  const role = context.user.role as Role;
  const unreadNotifications = await prisma.notification.count({ where: { userId: context.user.id, readAt: null } });

  return <DashboardShell
    navigation={dashboardNavigation(role, context.organization?.id ?? null)}
    user={{ name: context.user.name, email: context.user.email, roleLabel: ROLE_LABELS[role] }}
    organizations={context.organization ? { activeId: context.organization.id, items: context.organizations.map((org) => ({ id: org.id, name: org.name, slug: org.slug, type: org.type, membershipRole: org.membershipRole, statusLabel: PUBLICATION_STATUS_LABELS[org.status as keyof typeof PUBLICATION_STATUS_LABELS] ?? org.status, published: org.status === "PUBLISHED" })) } : null}
    unreadNotifications={unreadNotifications}
    badges={{}}
  >{children}</DashboardShell>;
}
