import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { EventForm } from "@/components/dashboard/event-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { FEATURE_KEYS } from "@/lib/constants";
import { getDashboardContext, requireOrganizationAccessPage } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";
import { getSubscription, withinLimit } from "@/lib/subscription";
import { toDateTimeInputValue } from "@/lib/dates";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Neue Veranstaltung" };

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function NewEventPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const base = await getDashboardContext();

  /*
   * Für welche Organisation wird erfasst?
   *
   * Organisationskonten erfassen immer für ihre aktive Organisation. Admin und
   * Team dürfen für jede Organisation erfassen und geben sie über den
   * Adressparameter an. Massgeblich ist in beiden Fällen
   * requireOrganizationAccess – die Angabe aus der Adresse wird also geprüft
   * und nicht einfach übernommen.
   */
  const gewuenscht = params.organisation ?? base.organization?.id ?? null;
  if (!gewuenscht) {
    redirect(base.staff ? "/dashboard/organisationen" : "/dashboard/keine-organisation");
  }

  const access = await requireOrganizationAccessPage(gewuenscht, "edit");
  const organizationId = access.organizationId;

  const [organization, cantons, count, subscription] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { city: true, cantonId: true, zip: true, street: true },
    }),
    prisma.canton.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.event.count({ where: { organizationId } }),
    getSubscription(organizationId),
  ]);

  // Limitprüfung auch beim Aufruf der Seite – nicht erst beim Speichern.
  const check = withinLimit(subscription, FEATURE_KEYS.EVENTS, count);
  if (!base.staff && !check.allowed) redirect("/dashboard/veranstaltungen");

  // Vorschlag: Beginn morgen um 14 Uhr – spart Tipparbeit.
  const suggested = new Date();
  suggested.setDate(suggested.getDate() + 1);
  suggested.setHours(14, 0, 0, 0);

  return (
    <>
      <PageHeader
        title="Neue Veranstaltung"
        description={base.staff ? "Erfasse eine Veranstaltung für die ausgewählte Organisation. Nach der Veröffentlichung erscheint sie in der schweizweiten Agenda." : "Erfasse deinen Termin. Nach der Veröffentlichung erscheint er in der schweizweiten Agenda."}
        breadcrumbs={[
          { href: "/dashboard/veranstaltungen", label: "Veranstaltungen" },
          { label: "Neu" },
        ]}
      />

      <EventForm
        organizationId={organizationId}
        cantons={cantons}
        canDelete={false}
        initial={{
          title: "",
          type: "SONSTIGE",
          shortDescription: "",
          description: "",
          startDate: toDateTimeInputValue(suggested),
          endDate: "",
          allDay: false,
          venueName: "",
          street: organization?.street ?? "",
          zip: organization?.zip ?? "",
          city: organization?.city ?? "",
          cantonId: organization?.cantonId ?? cantons[0]?.id ?? "",
          organizerName: "",
          externalUrl: "",
          ticketUrl: "",
          price: "",
          priceInfo: "",
          status: "DRAFT",
          image: null,
        }}
      />
    </>
  );
}
