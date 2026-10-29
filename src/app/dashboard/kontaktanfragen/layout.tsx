import { LinkTabs } from "@/components/ui/tabs";
import { PageHeader } from "@/components/dashboard/page-header";
import { requirePermissionPage } from "@/lib/dashboard-context";
import { openContactRequestCounts } from "@/lib/queries/contact-requests";

export const dynamic = "force-dynamic";

/** Rahmen für externe Zuschriften ohne Fas-Nav-Konto. */
export default async function ContactRequestsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermissionPage("handleContactRequests");
  const counts = await openContactRequestCounts();

  return (
    <>
      <PageHeader
        title="Kontaktanfragen"
        description="Externe Zuschriften ohne Benutzerkonto. Diese Anfragen sind vom Support-Ticket-System getrennt und werden per E-Mail beantwortet."
      />

      <LinkTabs
        className="mb-6"
        items={[
          {
            href: "/dashboard/kontaktanfragen",
            label: counts.contact ? `Kontaktformular (${counts.contact})` : "Kontaktformular",
            exact: true,
          },
          {
            href: "/dashboard/kontaktanfragen/profil",
            label: counts.claims ? `Profil beanspruchen (${counts.claims})` : "Profil beanspruchen",
          },
        ]}
      />

      {children}
    </>
  );
}
