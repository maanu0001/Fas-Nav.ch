import type { Metadata } from "next";
import { Activity, CalendarDays, Clock3, ScrollText, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

import { Table, TableWrapper, Td, Th, Thead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { Pagination } from "@/components/ui/pagination";
import { DashboardFilters } from "@/components/dashboard/filter-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { formatDateTime } from "@/lib/dates";
import { requirePermissionPage } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";

import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Logs" };

const PER_PAGE = 50;

type SearchParams = Promise<Record<string, string | undefined>>;

export default async function LogsPage({ searchParams }: { searchParams: SearchParams }) {
  await requirePermissionPage("viewAuditLog");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const days = [7,30,90].includes(Number(params.tage)) ? Number(params.tage) : 30;
  const since = new Date(Date.now() - days*86400000);

  const where: Prisma.AuditLogWhereInput = {
    createdAt: { gte: since },
    ...(params.action ? { action: params.action } : {}),
    ...(params.entity ? { entity: params.entity } : {}),
    ...(params.q
      ? {
          OR: [
            { action: { contains: params.q, mode: "insensitive" } },
            { entityLabel: { contains: params.q, mode: "insensitive" } },
            { userLabel: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [logs, total, entities, actions, totalInPeriod, actors] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        action: true,
        entity: true,
        entityLabel: true,
        userLabel: true,
        ip: true,
        createdAt: true,
        before: true,
        after: true,
      },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({ by: ["entity"], where:{createdAt:{gte:since}}, _count: { entity: true } }),
    prisma.auditLog.groupBy({ by:["action"],where:{createdAt:{gte:since}},_count:{_all:true},orderBy:{_count:{action:"desc"}},take:40}),
    prisma.auditLog.count({where:{createdAt:{gte:since}}}),
    prisma.auditLog.groupBy({by:["userLabel"],where:{createdAt:{gte:since},userLabel:{not:null}},_count:{_all:true},orderBy:{_count:{userLabel:"desc"}},take:1}),
  ]);

  function buildHref(p: number) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== "page") query.set(key, value);
    }
    query.set("page", String(p));
    return `/dashboard/logs?${query.toString()}`;
  }

  return (
    <>
      <PageHeader
        title="Audit-Log"
        description="Administrative Aktivitäten nachvollziehen, nach Zeitraum und Aktion filtern und Änderungen vergleichen."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3"><Card className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Activity className="h-4 w-4"/> Aktionen im Zeitraum</div><p className="mt-2 text-3xl font-bold tabular-nums">{totalInPeriod}</p></Card><Card className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4"/> Objekttypen</div><p className="mt-2 text-3xl font-bold tabular-nums">{entities.length}</p></Card><Card className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><UserRound className="h-4 w-4"/> Häufigster Akteur</div><p className="mt-2 truncate text-lg font-bold">{actors[0]?.userLabel??"–"}</p></Card></div>
      <div className="mb-5 flex flex-wrap items-center gap-2"><CalendarDays className="h-4 w-4 text-muted-foreground"/>{[7,30,90].map(d=><Link key={d} href={`/dashboard/logs?${new URLSearchParams(Object.fromEntries(Object.entries({...params,tage:String(d),page:"1"}).filter((entry):entry is [string,string]=>typeof entry[1]==="string"))).toString()}`} className={`rounded-lg border px-3 py-2 text-sm ${days===d?"bg-primary text-primary-foreground":"bg-card hover:bg-muted"}`}>{d} Tage</Link>)}<span className="ml-auto text-sm text-muted-foreground">{total} Treffer</span></div>
      <DashboardFilters
        searchPlaceholder="Aktion, Objekt oder Benutzer …"
        filters={[
          {name:"action",label:"Aktion",options:actions.map(a=>({value:a.action,label:`${a.action} (${a._count._all})`}))},
          {
            name: "entity",
            label: "Objekttyp",
            options: entities.map((e) => ({
              value: e.entity,
              label: `${e.entity} (${e._count.entity})`,
            })),
          },
        ]}
      />

      {logs.length ? (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-4 w-4"/> Neueste Aktionen zuerst · Änderungen mit Details ausklappbar · Zeitangaben in Schweizer Darstellung</div>
          <TableWrapper>
            <Table>
              <Thead>
                <Tr>
                  <Th>Zeitpunkt</Th>
                  <Th>Aktion</Th>
                  <Th>Objekt</Th>
                  <Th>Benutzer</Th>
                  <Th>Details</Th>
                </Tr>
              </Thead>
              <tbody>
                {logs.map((log) => (
                  <Tr key={log.id}>
                    <Td className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(log.createdAt)}
                    </Td>
                    <Td><span className={`inline-block rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold ${/delete|remove|revoke|ban|suspend/i.test(log.action)?"border-rose-200 bg-rose-50 text-rose-700":/create|approve|publish|activate/i.test(log.action)?"border-emerald-200 bg-emerald-50 text-emerald-700":"border-primary-200 bg-primary-50 text-primary-800"}`}>{log.action}</span></Td>
                    <Td>
                      <span className="text-sm">{log.entityLabel ?? "–"}</span>
                      <p className="text-xs text-muted-foreground">{log.entity}</p>
                    </Td>
                    <Td className="break-all text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{log.userLabel ?? "System"}</span>{log.ip?<p className="mt-1 text-[11px] text-muted-foreground">IP: {log.ip}</p>:null}
                    </Td>
                    <Td>
                      {log.before || log.after ? (
                        <details className="text-xs">
                          <summary className="cursor-pointer font-semibold text-primary-700">Änderungen ansehen</summary>
                          <pre className="mt-2 max-h-96 max-w-xl overflow-auto rounded-xl border bg-muted p-3 text-[0.7rem] leading-relaxed">
                            {JSON.stringify({ vorher: log.before, nachher: log.after }, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-xs text-muted-foreground">–</span>
                      )}
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
          icon={ScrollText}
          title="Keine Einträge"
          description="Administrative Aktionen werden hier protokolliert."
        />
      )}
    </>
  );
}
