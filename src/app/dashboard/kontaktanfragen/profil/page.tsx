import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";

import { Table, TableWrapper, Td, Th, Thead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { DashboardFilters } from "@/components/dashboard/filter-form";
import { ClaimRequestBadge } from "@/components/dashboard/status-badge";
import { CLAIM_REQUEST_STATUS_LABELS, ORGANIZATION_TYPE_LABELS } from "@/lib/constants";
import { requirePermissionPage } from "@/lib/dashboard-context";
import { formatDateTime, relativeTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import {
  CLAIM_REQUEST_LIST_SELECT,
  claimRequestWhere,
  isOpenClaimRequest,
} from "@/lib/queries/contact-requests";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Profilübernahme" };

type SearchParams = Promise<Record<string, string | undefined>>;

/** Anfragen aus dem Formular „Profil beanspruchen“. */
export default async function ClaimRequestsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermissionPage("handleContactRequests");
  const params = await searchParams;

  const anfragen = await prisma.claimRequest.findMany({
    where: claimRequestWhere({ q: params.q, status: params.status }),
    orderBy: { createdAt: "desc" },
    take: 200,
    select: CLAIM_REQUEST_LIST_SELECT,
  });

  const gefiltert = Boolean(params.q || params.status);

  return (
    <>
      <DashboardFilters
        searchPlaceholder="Name, E-Mail oder Organisation …"
        filters={[
          {
            name: "status",
            label: "Status",
            options: Object.entries(CLAIM_REQUEST_STATUS_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          },
        ]}
      />

      {anfragen.length ? (
        <TableWrapper>
          <Table>
            <Thead>
              <Tr>
                <Th>Eingang</Th>
                <Th>Anfragende Person</Th>
                <Th>Profil</Th>
                <Th>Status</Th>
              </Tr>
            </Thead>
            <tbody>
              {anfragen.map((anfrage) => {
                const offen = isOpenClaimRequest(anfrage.status);
                return (
                  <Tr key={anfrage.id} className={cn(offen && "bg-primary-50/60")}>
                    <Td className="whitespace-nowrap align-top text-muted-foreground">
                      <span className="block">{formatDateTime(anfrage.createdAt)}</span>
                      <span className="text-xs">{relativeTime(anfrage.createdAt)}</span>
                    </Td>
                    <Td className="align-top">
                      <Link
                        href={`/dashboard/kontaktanfragen/profil/${anfrage.id}`}
                        className="font-medium text-primary-800 hover:underline"
                      >
                        {anfrage.contactName}
                      </Link>
                      <a
                        href={`mailto:${anfrage.contactEmail}`}
                        className="mt-0.5 block break-all text-xs text-primary-800 hover:underline"
                      >
                        {anfrage.contactEmail}
                      </a>
                    </Td>
                    <Td className="align-top">
                      <span className="block font-medium">{anfrage.organization.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {ORGANIZATION_TYPE_LABELS[anfrage.organization.type]}
                        {anfrage.organization.city ? ` · ${anfrage.organization.city}` : ""}
                      </span>
                    </Td>
                    <Td className="align-top">
                      <ClaimRequestBadge status={anfrage.status} />
                      {offen ? (
                        <span className="mt-1 block text-xs font-medium text-primary-800">
                          Unerledigt
                        </span>
                      ) : null}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </TableWrapper>
      ) : (
        <EmptyState
          icon={BadgeCheck}
          title={gefiltert ? "Keine Treffer" : "Noch keine Profil-Beanspruchungen vorhanden."}
          description={
            gefiltert
              ? "Für diese Suche und diesen Filter liegt nichts vor. Passe die Auswahl an."
              : "Sobald jemand über ein Profil eine Übernahme anfragt, erscheint sie hier."
          }
        />
      )}
    </>
  );
}
