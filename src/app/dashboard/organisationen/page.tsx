import Link from "next/link";
import { Building2, Plus, Layers3 } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { Table, TableWrapper, Td, Th, Thead, Tr } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/states";
import { DashboardFilters } from "@/components/dashboard/filter-form";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  PublicationBadge,
  SubscriptionBadge,
  VerificationBadge,
} from "@/components/dashboard/status-badge";
import { CANTONS, CLAIM_STATUS_LABELS } from "@/lib/constants";
import { formatDateShort } from "@/lib/dates";
import { requireStaffPage } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";

import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | undefined>>;

const PER_PAGE = 20;

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireStaffPage();
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  const where: Prisma.OrganizationWhereInput = {
    ...(params.typ === "CARNIVAL" || params.typ === "GUGGE" ? { type: params.typ } : {}),
    ...(params.status ? { status: params.status as never } : {}),
    ...(params.verifizierung ? { verification: params.verifizierung as never } : {}),
    ...(params.kanton ? { canton: { slug: params.kanton } } : {}),
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: "insensitive" } },
            { city: { contains: params.q, mode: "insensitive" } },
            { slug: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [organizations, total] = await Promise.all([
    prisma.organization.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        city: true,
        status: true,
        verification: true,
        claimStatus: true,
        canton: { select: { code: true } },
        subscription: {
          select: { status: true, endDate: true, plan: { select: { name: true } } },
        },
        _count: { select: { memberships: true, events: true } },
      },
    }),
    prisma.organization.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  function buildHref(p: number) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== "page") query.set(key, value);
    }
    query.set("page", String(p));
    return `/dashboard/organisationen?${query.toString()}`;
  }

  return (
    <>
      <PageHeader
        title="Organisationen"
        description={`${total} Fasnachten und Guggen in der Datenbank.`}
        actions={
          <>
            <ButtonLink href="/dashboard/organisationen/neu?typ=CARNIVAL" variant="primary">
              <Plus />
              Fasnacht
            </ButtonLink>
            <ButtonLink href="/dashboard/organisationen/neu?typ=GUGGE" variant="outline">
              <Plus />
              Gugge
            </ButtonLink>
            <ButtonLink href="/dashboard/organisationen/bulk-actions" variant="outline"><Layers3 /> Bulk-Actions</ButtonLink>
          </>
        }
      />

      <DashboardFilters
        searchPlaceholder="Name, Ort oder Slug …"
        filters={[
          {
            name: "typ",
            label: "Art",
            options: [
              { value: "CARNIVAL", label: "Fasnacht" },
              { value: "GUGGE", label: "Gugge" },
            ],
          },
          {
            name: "status",
            label: "Veröffentlichung",
            options: [
              { value: "DRAFT", label: "Entwurf" },
              { value: "PENDING_REVIEW", label: "In Prüfung" },
              { value: "PUBLISHED", label: "Veröffentlicht" },
              { value: "UNPUBLISHED", label: "Nicht veröffentlicht" },
              { value: "SUSPENDED", label: "Gesperrt" },
            ],
          },
          {
            name: "verifizierung",
            label: "Verifizierung",
            options: [
              { value: "UNVERIFIED", label: "Nicht verifiziert" },
              { value: "VERIFIED", label: "Verifiziert" },
              { value: "OFFICIAL", label: "Offiziell" },
            ],
          },
          {
            name: "kanton",
            label: "Kanton",
            options: CANTONS.map((c) => ({ value: c.slug, label: c.name })),
          },
        ]}
      />

      {organizations.length ? (
        <>
          <TableWrapper>
            <Table>
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Ort</Th>
                  <Th>Status</Th>
                  <Th>Verifizierung</Th>
                  <Th>Tarif</Th>
                  <Th>Ablauf</Th>
                  <Th>Accounts</Th>
                </Tr>
              </Thead>
              <tbody>
                {organizations.map((org) => (
                  <Tr key={org.id}>
                    <Td>
                      <Link
                        href={`/dashboard/organisationen/${org.id}`}
                        className="font-medium text-primary-800 hover:underline"
                      >
                        {org.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {org.type === "CARNIVAL" ? "Fasnacht" : "Gugge"} ·{" "}
                        {CLAIM_STATUS_LABELS[org.claimStatus]}
                      </p>
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {org.city} · {org.canton.code}
                    </Td>
                    <Td>
                      <PublicationBadge status={org.status} />
                    </Td>
                    <Td>
                      <VerificationBadge status={org.verification} />
                    </Td>
                    <Td>
                      {org.subscription ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium">
                            {org.subscription.plan.name}
                          </span>
                          <SubscriptionBadge status={org.subscription.status} />
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Kein Abo</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {org.subscription?.endDate
                        ? formatDateShort(org.subscription.endDate)
                        : "–"}
                    </Td>
                    <Td className="text-muted-foreground">
                      {org._count.memberships} · {org._count.events} Events
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrapper>

          <Pagination
            page={page}
            totalPages={totalPages}
            buildHref={buildHref}
            className="mt-6"
          />
        </>
      ) : (
        <EmptyState
          icon={Building2}
          title="Keine Organisationen gefunden"
          description="Passe die Filter an oder lege eine neue Organisation an."
          action={
            <ButtonLink href="/dashboard/organisationen/neu?typ=CARNIVAL">
              <Plus />
              Organisation erstellen
            </ButtonLink>
          }
        />
      )}
    </>
  );
}
