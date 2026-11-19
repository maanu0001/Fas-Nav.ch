import { ContentBulkActions } from "@/components/dashboard/content-bulk-actions";
import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays } from "lucide-react";

import { Table, TableWrapper, Td, Th, Thead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { DashboardFilters } from "@/components/dashboard/filter-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { PublicationBadge } from "@/components/dashboard/status-badge";
import { CANTONS, EVENT_TYPE_LABELS } from "@/lib/constants";
import { formatDateTime, startOfToday } from "@/lib/dates";
import { requireStaffPage } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";

import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Agenda" };

const PER_PAGE = 30;

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function AdminAgendaPage({ searchParams }: { searchParams: SearchParams }) {
  await requireStaffPage();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const where: Prisma.EventWhereInput = {
    ...(params.status ? { status: params.status as never } : {}),
    ...(params.typ ? { type: params.typ as never } : {}),
    ...(params.kanton ? { canton: { slug: params.kanton } } : {}),
    ...(params.zeit === "vergangen"
      ? { startDate: { lt: startOfToday() } }
      : params.zeit === "kommend"
        ? { startDate: { gte: startOfToday() } }
        : {}),
    ...(params.q
      ? {
          OR: [
            { title: { contains: params.q, mode: "insensitive" } },
            { city: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [events, total, bulkEvents] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { startDate: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        title: true,
        slug: true,
        type: true,
        startDate: true,
        city: true,
        status: true,
        canton: { select: { code: true } },
        organization: { select: { id: true, name: true } },
      },
    }),
    prisma.event.count({ where }),
    prisma.event.findMany({where,orderBy:{startDate:"desc"},take:100,select:{id:true,title:true,status:true,organizationId:true,organization:{select:{name:true}}}}),
  ]);

  function buildHref(p: number) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== "page") query.set(key, value);
    }
    query.set("page", String(p));
    return `/dashboard/agenda?${query.toString()}`;
  }

  return (
    <>
      <PageHeader
        title="Agenda"
        description={`${total} Veranstaltungen aller Organisationen.`}
      />

      <DashboardFilters
        searchPlaceholder="Titel oder Ort …"
        filters={[
          {
            name: "zeit",
            label: "Zeitraum",
            options: [
              { value: "kommend", label: "Kommend" },
              { value: "vergangen", label: "Vergangen" },
            ],
          },
          {
            name: "status",
            label: "Status",
            options: [
              { value: "DRAFT", label: "Entwurf" },
              { value: "PUBLISHED", label: "Veröffentlicht" },
              { value: "UNPUBLISHED", label: "Nicht veröffentlicht" },
              { value: "SUSPENDED", label: "Gesperrt" },
            ],
          },
          {
            name: "typ",
            label: "Art",
            options: Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
          },
          {
            name: "kanton",
            label: "Kanton",
            options: CANTONS.map((c) => ({ value: c.slug, label: c.name })),
          },
        ]}
      />

      <ContentBulkActions kind="EVENT" items={bulkEvents.map(e=>({id:e.id,name:e.title,organizationId:e.organizationId,organizationName:e.organization.name,status:e.status}))}/>
      {events.length ? (
        <>
          <TableWrapper>
            <Table>
              <Thead>
                <Tr>
                  <Th>Titel</Th>
                  <Th>Organisation</Th>
                  <Th>Art</Th>
                  <Th>Datum</Th>
                  <Th>Ort</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <tbody>
                {events.map((event) => (
                  <Tr key={event.id}>
                    <Td>
                      <Link
                        href={`/dashboard/veranstaltungen/${event.id}`}
                        className="font-medium text-primary-800 hover:underline"
                      >
                        {event.title}
                      </Link>
                    </Td>
                    <Td>
                      <Link
                        href={`/dashboard/organisationen/${event.organization.id}`}
                        className="text-sm text-muted-foreground hover:underline"
                      >
                        {event.organization.name}
                      </Link>
                    </Td>
                    <Td className="text-muted-foreground">{EVENT_TYPE_LABELS[event.type]}</Td>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(event.startDate)}
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {event.city} · {event.canton.code}
                    </Td>
                    <Td>
                      <PublicationBadge status={event.status} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>

          <Pagination
            page={page}
            totalPages={Math.max(1, Math.ceil(total / PER_PAGE))}
            buildHref={buildHref}
            className="mt-6"
          />
        </>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="Keine Veranstaltungen gefunden"
          description="Passe die Filter an, um weitere Einträge zu sehen."
        />
      )}
    </>
  );
}
