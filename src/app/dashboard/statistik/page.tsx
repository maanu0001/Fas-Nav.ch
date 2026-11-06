import type { Metadata } from "next";
import { PlatformAnalytics } from "@/components/dashboard/platform-analytics";
import Link from "next/link";
import { Lock } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableWrapper, Td, Th, Thead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard, StatGrid } from "@/components/dashboard/stat-card";
import { organizationStats } from "@/lib/analytics";
import { FEATURE_KEYS } from "@/lib/constants";
import { getDashboardContext } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { hasFeature } from "@/lib/subscription";
import type { Role } from "@prisma/client";
import { formatChf } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Statistik" };

export default async function StatisticsPage({searchParams}:{searchParams:Promise<{tage?:string;von?:string;bis?:string}>}) {
  const context = await getDashboardContext();

  if (context.staff) { const {tage,von,bis}=await searchParams; const days=[7,30,90].includes(Number(tage))?Number(tage):30;
  const valid=/^\\d{4}-\\d{2}-\\d{2}$/;
  const custom=Boolean(von&&bis&&valid.test(von)&&valid.test(bis)&&von<=bis&&bis<=new Date().toISOString().slice(0,10));
  return <PlatformAnalytics role={context.user.role as Role} days={days} lifetime={tage==="all"} from={custom?von:undefined} to={custom?bis:undefined}/>; }
  return <OrganizationStatistics context={context} />;
}

async function PlatformStatistics({ role }: { role: Role }) {
  // Umsatzzahlen sind der Administration vorbehalten und werden für andere
  // Rollen weder abgefragt noch an den Client gegeben.
  const showRevenue = can(role, "viewFinancialFigures");
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [views, visitors, topOrgs, topEvents, searches, orgCount, newOrgs, activeSubs, revenue] =
    await Promise.all([
      prisma.pageView.count({ where: { interaction: "VIEW", createdAt: { gte: since } } }),
      prisma.pageView.findMany({
        where: { createdAt: { gte: since }, visitorHash: { not: null } },
        distinct: ["visitorHash"],
        select: { visitorHash: true },
      }),
      prisma.pageView.groupBy({
        by: ["organizationId"],
        where: {
          interaction: "VIEW",
          organizationId: { not: null },
          createdAt: { gte: since },
        },
        _count: { organizationId: true },
        orderBy: { _count: { organizationId: "desc" } },
        take: 10,
      }),
      prisma.pageView.groupBy({
        by: ["eventId"],
        where: { interaction: "VIEW", eventId: { not: null }, createdAt: { gte: since } },
        _count: { eventId: true },
        orderBy: { _count: { eventId: "desc" } },
        take: 10,
      }),
      prisma.searchQuery.groupBy({
        by: ["term"],
        where: { createdAt: { gte: since } },
        _count: { term: true },
        orderBy: { _count: { term: "desc" } },
        take: 12,
      }),
      prisma.organization.count(),
      prisma.organization.count({ where: { createdAt: { gte: since } } }),
      showRevenue ? prisma.subscription.count({ where: { status: "ACTIVE" } }) : 0,
      showRevenue
        ? prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amountChf: true } })
        : null,
    ]);

  // Namen der meistgesehenen Einträge nachladen.
  const orgIds = topOrgs.map((o) => o.organizationId).filter((id): id is string => Boolean(id));
  const eventIds = topEvents.map((e) => e.eventId).filter((id): id is string => Boolean(id));

  const [orgNames, eventNames] = await Promise.all([
    prisma.organization.findMany({
      where: { id: { in: orgIds } },
      select: { id: true, name: true, slug: true, type: true },
    }),
    prisma.event.findMany({
      where: { id: { in: eventIds } },
      select: { id: true, title: true, slug: true },
    }),
  ]);

  const orgMap = new Map(orgNames.map((o) => [o.id, o]));
  const eventMap = new Map(eventNames.map((e) => [e.id, e]));

  return (
    <>
      <PageHeader
        title="Statistik"
        description="Plattformweite Kennzahlen der letzten 30 Tage."
      />

      <StatGrid>
        <StatCard label="Seitenaufrufe" value={views} icon="chart" hint="letzte 30 Tage" />
        <StatCard label="Besucher" value={visitors.length} icon="users" hint="pseudonym gezählt" />
        <StatCard label="Organisationen" value={orgCount} icon="building" hint={`${newOrgs} neu`} />
        {showRevenue && revenue ? (
          <StatCard
            label="Umsatz (bezahlt)"
            value={formatChf(Number(revenue._sum.amountChf ?? 0))}
            icon="wallet"
            hint={`${activeSubs} aktive Abos`}
          />
        ) : null}
      </StatGrid>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-display text-base font-semibold">Beliebteste Organisationen</h2>
          {topOrgs.length ? (
            <ol className="space-y-2">
              {topOrgs.map((row) => {
                const org = row.organizationId ? orgMap.get(row.organizationId) : null;
                if (!org) return null;
                return (
                  <li key={row.organizationId} className="flex items-center justify-between gap-3">
                    <Link
                      href={`/dashboard/organisationen/${org.id}`}
                      className="min-w-0 truncate text-sm text-primary-800 hover:underline"
                    >
                      {org.name}
                    </Link>
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      {row._count.organizationId}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <EmptyState title="Noch keine Daten" description="Aufrufe erscheinen hier." />
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-display text-base font-semibold">
            Meistgesehene Veranstaltungen
          </h2>
          {topEvents.length ? (
            <ol className="space-y-2">
              {topEvents.map((row) => {
                const event = row.eventId ? eventMap.get(row.eventId) : null;
                if (!event) return null;
                return (
                  <li key={row.eventId} className="flex items-center justify-between gap-3">
                    <Link
                      href={`/event/${event.slug}`}
                      className="min-w-0 truncate text-sm text-primary-800 hover:underline"
                    >
                      {event.title}
                    </Link>
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      {row._count.eventId}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <EmptyState title="Noch keine Daten" description="Aufrufe erscheinen hier." />
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 font-display text-base font-semibold">Häufigste Suchanfragen</h2>
          {searches.length ? (
            <TableWrapper>
              <Table>
                <Thead>
                  <Tr>
                    <Th>Suchbegriff</Th>
                    <Th>Anzahl</Th>
                  </Tr>
                </Thead>
                <tbody>
                  {searches.map((row) => (
                    <Tr key={row.term}>
                      <Td>{row.term}</Td>
                      <Td className="tabular-nums">{row._count.term}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableWrapper>
          ) : (
            <EmptyState
              title="Noch keine Suchanfragen"
              description="Sobald Besucher die Suche nutzen, erscheinen die Begriffe hier."
            />
          )}
        </Card>
      </div>
    </>
  );
}

async function OrganizationStatistics({
  context,
}: {
  context: Awaited<ReturnType<typeof getDashboardContext>>;
}) {
  const org = context.organization;

  if (!org) {
    return (
      <>
        <PageHeader title="Statistik" />
        <EmptyState
          title="Keine Organisation zugewiesen"
          description="Deinem Konto ist noch keine Organisation zugeordnet."
        />
      </>
    );
  }

  // Statistikzugriff ist tarifabhängig.
  if (!hasFeature(context.subscription, FEATURE_KEYS.STATISTICS)) {
    return (
      <>
        <PageHeader title="Statistik" />
        <Alert variant="info" title="Statistik ist in deinem Tarif nicht enthalten">
          <p className="mt-1">
            Mit dem Premium-Abo siehst du, wie oft deine Seite und deine Veranstaltungen aufgerufen
            werden und wie häufig auf deine Links geklickt wird.
          </p>
          <ButtonLink href="/preise" variant="outline" className="mt-3">
            <Lock />
            Tarife vergleichen
          </ButtonLink>
        </Alert>
      </>
    );
  }

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [stats, eventViews] = await Promise.all([
    organizationStats(org.id),
    prisma.pageView.groupBy({
      by: ["eventId"],
      where: {
        organizationId: org.id,
        eventId: { not: null },
        interaction: "VIEW",
        createdAt: { gte: since },
      },
      _count: { eventId: true },
      orderBy: { _count: { eventId: "desc" } },
      take: 10,
    }),
  ]);

  const events = await prisma.event.findMany({
    where: { id: { in: eventViews.map((e) => e.eventId).filter((id): id is string => Boolean(id)) } },
    select: { id: true, title: true, slug: true },
  });
  const eventMap = new Map(events.map((e) => [e.id, e]));

  return (
    <>
      <PageHeader
        title="Statistik"
        description={`Aufrufe und Klicks für ${org.name}. Zeitraum: letzte 30 Tage.`}
      />

      <StatGrid>
        <StatCard label="Seitenaufrufe (30 Tage)" value={stats.last30Days} icon="chart" />
        <StatCard label="Seitenaufrufe gesamt" value={stats.total} icon="chart" />
        <StatCard label="Klicks auf Website" value={stats.websiteClicks} icon="layout" />
        <StatCard label="Klicks auf Social Media" value={stats.socialClicks} icon="users" />
      </StatGrid>

      <Card className="mt-8 p-5">
        <h2 className="mb-4 font-display text-base font-semibold">
          Meistgesehene Veranstaltungen
        </h2>
        {eventViews.length ? (
          <ol className="space-y-2">
            {eventViews.map((row) => {
              const event = row.eventId ? eventMap.get(row.eventId) : null;
              if (!event) return null;
              return (
                <li key={row.eventId} className="flex items-center justify-between gap-3">
                  <Link
                    href={`/event/${event.slug}`}
                    className="min-w-0 truncate text-sm text-primary-800 hover:underline"
                  >
                    {event.title}
                  </Link>
                  <span className="shrink-0 text-sm font-medium tabular-nums">
                    {row._count.eventId}
                  </span>
                </li>
              );
            })}
          </ol>
        ) : (
          <EmptyState
            title="Noch keine Aufrufe erfasst"
            description="Sobald Besucher deine Veranstaltungen ansehen, erscheinen sie hier."
          />
        )}
      </Card>
    </>
  );
}
