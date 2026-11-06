import type { Metadata } from "next";
import { NewTicketForm } from "@/components/dashboard/new-ticket-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { getDashboardContext } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Funktion vorschlagen" };

export default async function FeatureSuggestionPage() {
  const context = await getDashboardContext();
  const organizations = context.staff
    ? await prisma.organization.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" }, take: 500 })
    : context.organizations.map(org => ({ id: org.id, name: org.name }));
  return <>
    <PageHeader title="Funktion vorschlagen" description="Welche Funktion würde dir und deiner Organisation die Arbeit erleichtern? Dein Vorschlag wird als Ticket ans Fas-Nav-Team übermittelt." />
    <NewTicketForm organizations={organizations} defaultOrganizationId={context.organization?.id} suggestion />
  </>;
}
