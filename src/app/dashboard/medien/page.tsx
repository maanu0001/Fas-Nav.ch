import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ImageIcon } from "lucide-react";

import { MediaAdminDelete } from "@/components/dashboard/media-admin-actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { DashboardFilters } from "@/components/dashboard/filter-form";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard, StatGrid } from "@/components/dashboard/stat-card";
import { MEDIA_TYPE_LABELS } from "@/lib/constants";
import { formatDateShort } from "@/lib/dates";
import { requireStaffPage } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";

import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Medien" };

type SearchParams = Promise<Record<string, string | undefined>>;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function MediaLibraryPage({ searchParams }: { searchParams: SearchParams }) {
  await requireStaffPage();
  const params = await searchParams;

  const where: Prisma.MediaWhereInput = {
    ...(params.typ ? { type: params.typ as never } : {}),
    ...(params.q
      ? {
          OR: [
            { filename: { contains: params.q, mode: "insensitive" } },
            { organization: { name: { contains: params.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [media, totals, audio] = await Promise.all([
    prisma.media.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 120,
      select: {
        id: true,
        url: true,
        thumbnailUrl: true,
        filename: true,
        alt: true,
        caption: true,
        type: true,
        size: true,
        width: true,
        height: true,
        createdAt: true,
        organization: { select: { id: true, name: true } },
      },
    }),
    prisma.media.aggregate({ _count: true, _sum: { size: true } }),
    prisma.audioSample.findMany({orderBy:{createdAt:"desc"},take:120,select:{id:true,title:true,url:true,durationSeconds:true,createdAt:true,organizationId:true,organization:{select:{name:true}}}}),
  ]);

  return (
    <>
      <PageHeader
        title="Medien"
        description="Alle Plattform-Uploads nach Kategorie: Bilder, Dokumente und Hörproben. Mit Verwaltungs- und Löschfunktionen."
      />

      <StatGrid>
        <StatCard label="Dateien" value={totals._count+audio.length} icon="image" />
        <StatCard
          label="Speicherverbrauch"
          value={formatBytes(Number(totals._sum.size ?? 0))}
          icon="image"
        />
      </StatGrid>

      <div className="mt-6">
        <DashboardFilters
          searchPlaceholder="Dateiname oder Organisation …"
          filters={[
            {
              name: "typ",
              label: "Art",
              options: Object.entries(MEDIA_TYPE_LABELS).map(([value, label]) => ({
                value,
                label,
              })),
            },
          ]}
        />
      </div>

      {media.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {media.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="relative aspect-[4/3] bg-muted">
                <Image
                  src={item.thumbnailUrl ?? item.url}
                  alt={item.filename}
                  fill
                  sizes="(max-width: 640px) 100vw, 25vw"
                  className="object-cover"
                />
                <Badge variant="secondary" className="absolute left-2 top-2">
                  {MEDIA_TYPE_LABELS[item.type]}
                </Badge>
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium" title={item.filename}>
                  {item.filename}
                </p>
                {item.organization ? (
                  <Link
                    href={`/dashboard/organisationen/${item.organization.id}`}
                    className="mt-0.5 block truncate text-xs text-primary-700 hover:underline"
                  >
                    {item.organization.name}
                  </Link>
                ) : (
                  <p className="mt-0.5 text-xs text-muted-foreground">Plattform</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.width}×{item.height} · {formatBytes(item.size)} ·{" "}
                  {formatDateShort(item.createdAt)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ImageIcon}
          title="Keine Medien gefunden"
          description="Bilder werden von Organisationen über den Editor und die Galerie hochgeladen."
        />
      )}
    </>
  );
}
