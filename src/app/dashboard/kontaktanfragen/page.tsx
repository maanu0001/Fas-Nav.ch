import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Table, TableWrapper, Td, Th, Thead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { DashboardFilters } from "@/components/dashboard/filter-form";
import { requirePermissionPage } from "@/lib/dashboard-context";
import { formatDateTime, relativeTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { contactTicketWhere } from "@/lib/queries/contact-requests";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Kontaktanfragen" };

type SearchParams = Promise<Record<string, string | undefined>>;

const CONTACT_STATUS = {
  OPEN: { label: "Neu", variant: "warning" as const },
  IN_PROGRESS: { label: "In Bearbeitung", variant: "info" as const },
  WAITING_FOR_CUSTOMER: { label: "In Bearbeitung", variant: "info" as const },
  RESOLVED: { label: "Erledigt", variant: "success" as const },
  CLOSED: { label: "Erledigt", variant: "success" as const },
};

/** Einsendungen des allgemeinen Kontaktformulars der Website. */
export default async function ContactFormPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermissionPage("handleContactRequests");
  const params = await searchParams;

  const anfragen = await prisma.ticket.findMany({
    where: contactTicketWhere({ q: params.q, status: params.status }),
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      number: true,
      subject: true,
      status: true,
      createdAt: true,
      guestName: true,
      guestEmail: true,
      author: { select: { name: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { body: true },
      },
    },
  });

  const gefiltert = Boolean(params.q || params.status);

  return (
    <>
      <DashboardFilters
        searchPlaceholder="Name, E-Mail, Betreff oder Nachricht …"
        filters={[
          {
            name: "status",
            label: "Status",
            options: [
              { value: "OPEN", label: "Neu" },
              { value: "IN_PROGRESS", label: "In Bearbeitung" },
              { value: "RESOLVED", label: "Erledigt" },
            ],
          },
        ]}
      />

      {anfragen.length ? (
        <TableWrapper>
          <Table>
            <Thead>
              <Tr>
                <Th>Eingang</Th>
                <Th>Absender</Th>
                <Th>Betreff und Nachricht</Th>
                <Th>Bearbeitungsstand</Th>
              </Tr>
            </Thead>
            <tbody>
              {anfragen.map((anfrage) => {
                const offen = anfrage.status === "OPEN" || anfrage.status === "IN_PROGRESS" || anfrage.status === "WAITING_FOR_CUSTOMER";
                const name = anfrage.guestName ?? anfrage.author?.name ?? "Unbekannt";
                const email = anfrage.guestEmail ?? anfrage.author?.email ?? null;
                const vorschau = anfrage.messages[0]?.body ?? "";
                const status = CONTACT_STATUS[anfrage.status];

                return (
                  <Tr key={anfrage.id} className={cn(offen && "bg-primary-50/60")}>
                    <Td className="whitespace-nowrap align-top text-muted-foreground">
                      <span className="block">{formatDateTime(anfrage.createdAt)}</span>
                      <span className="text-xs">{relativeTime(anfrage.createdAt)}</span>
                    </Td>
                    <Td className="align-top">
                      <span className="block font-medium">{name}</span>
                      {email ? (
                        <a href={`mailto:${email}`} className="text-xs text-primary-800 hover:underline">
                          {email}
                        </a>
                      ) : null}
                    </Td>
                    <Td className="align-top">
                      <Link href={`/dashboard/kontaktanfragen/${anfrage.id}`} className="font-medium text-primary-800 hover:underline">
                        {anfrage.subject}
                      </Link>
                      {vorschau ? (
                        <p className="mt-0.5 line-clamp-2 max-w-md text-xs text-muted-foreground">
                          {vorschau}
                        </p>
                      ) : null}
                    </Td>
                    <Td className="align-top">
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </TableWrapper>
      ) : (
        <EmptyState
          icon={Mail}
          title={gefiltert ? "Keine Treffer" : "Noch keine Kontaktanfragen vorhanden."}
          description={
            gefiltert
              ? "Für diese Suche und diesen Filter liegt nichts vor. Passe die Auswahl an."
              : "Sobald jemand das Kontaktformular der Website absendet, erscheint die Anfrage hier."
          }
        />
      )}
    </>
  );
}
