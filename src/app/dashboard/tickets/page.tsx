import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Ticket as TicketIcon } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { Table, TableWrapper, Td, Th, Thead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { DashboardFilters } from "@/components/dashboard/filter-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { PriorityBadge, TicketBadge } from "@/components/dashboard/status-badge";
import { TICKET_CATEGORY_LABELS, TICKET_STATUS_LABELS } from "@/lib/constants";
import { getDashboardContext } from "@/lib/dashboard-context";
import { relativeTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { ticketScope } from "@/lib/queries/tickets";
import type { Prisma, Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Tickets" };

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function TicketsPage({ searchParams }: { searchParams: SearchParams }) {
  const context = await getDashboardContext();
  const params = await searchParams;

  // Sichtbarkeit: Kontaktformular-Einsendungen sind keine Support-Tickets und
  // werden bereits durch ticketScope ausgeschlossen. Organisationen sehen
  // darüber hinaus ausschliesslich ihre eigenen Tickets.
  const scope = await ticketScope({
    id: context.user.id,
    role: context.user.role as Role,
    isActive: true,
    name: context.user.name,
    email: context.user.email,
  });

  const where: Prisma.TicketWhereInput = {
    AND: [
      scope,
      ...(params.status ? [{ status: params.status as never }] : []),
      ...(params.kategorie ? [{ category: params.kategorie as never }] : []),
      ...(params.q
        ? [{ subject: { contains: params.q, mode: "insensitive" as const } }]
        : []),
    ],
  };

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: [{ status: "asc" }, { lastReplyAt: "desc" }],
    take: 100,
    select: {
      id: true,
      number: true,
      subject: true,
      status: true,
      priority: true,
      category: true,
      lastReplyAt: true,
      organization: { select: { name: true } },
      author: { select: { name: true } },
      _count: { select: { messages: true } },
    },
  });

  const supportCategories = Object.entries(TICKET_CATEGORY_LABELS).filter(
    ([value]) => value !== "CONTACT",
  );

  return (
    <>
      <PageHeader
        title="Tickets"
        description={
          context.staff
            ? "Support-Tickets von angemeldeten Fas-Nav-Konten. Externe Zuschriften findest du separat unter Kontaktanfragen."
            : "Deine Support-Anfragen an das Fas-Nav-Team."
        }
        actions={
          <ButtonLink href="/dashboard/tickets/neu">
            <Plus />
            Ticket erstellen
          </ButtonLink>
        }
      />

      <DashboardFilters
        searchPlaceholder="Betreff suchen …"
        filters={[
          {
            name: "status",
            label: "Status",
            options: Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          },
          {
            name: "kategorie",
            label: "Kategorie",
            options: supportCategories.map(([value, label]) => ({ value, label })),
          },
        ]}
      />

      {tickets.length ? (
        <TableWrapper>
          <Table>
            <Thead>
              <Tr>
                <Th>Nr.</Th>
                <Th>Betreff</Th>
                {context.staff ? <Th>Organisation</Th> : null}
                <Th>Kategorie</Th>
                <Th>Priorität</Th>
                <Th>Status</Th>
                <Th>Letzte Antwort</Th>
              </Tr>
            </Thead>
            <tbody>
              {tickets.map((ticket) => (
                <Tr key={ticket.id}>
                  <Td className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                    #{ticket.number}
                  </Td>
                  <Td>
                    <Link
                      href={`/dashboard/tickets/${ticket.id}`}
                      className="font-medium text-primary-800 hover:underline"
                    >
                      {ticket.subject}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {ticket._count.messages}{" "}
                      {ticket._count.messages === 1 ? "Nachricht" : "Nachrichten"}
                    </p>
                  </Td>
                  {context.staff ? (
                    <Td className="text-muted-foreground">
                      {ticket.organization?.name ?? ticket.author?.name ?? "–"}
                    </Td>
                  ) : null}
                  <Td className="text-muted-foreground">
                    {TICKET_CATEGORY_LABELS[ticket.category]}
                  </Td>
                  <Td>
                    <PriorityBadge priority={ticket.priority} />
                  </Td>
                  <Td>
                    <TicketBadge status={ticket.status} />
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {relativeTime(ticket.lastReplyAt)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrapper>
      ) : (
        <EmptyState
          icon={TicketIcon}
          title="Keine Tickets vorhanden"
          description={
            context.staff
              ? "Aktuell liegen keine Support-Tickets von angemeldeten Konten vor."
              : "Du hast noch keine Anfrage gestellt. Bei Fragen sind wir gerne für dich da."
          }
          action={
            <ButtonLink href="/dashboard/tickets/neu">
              <Plus />
              Ticket erstellen
            </ButtonLink>
          }
        />
      )}
    </>
  );
}
