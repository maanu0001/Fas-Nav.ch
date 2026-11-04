import { cache } from "react";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { startOfToday } from "@/lib/dates";
import { PUBLIC_EVENT_SELECT } from "@/lib/queries/public";
import type { OrganizationType } from "@prisma/client";

const MEDIA_SELECT = { url: true, alt: true, width: true, height: true } as const;

/**
 * Vollständiges öffentliches Profil einer Organisation.
 * Liefert null, wenn die Seite nicht veröffentlicht ist – Draft-Inhalte
 * bleiben damit auch bei bekanntem Slug unsichtbar.
 */
/**
 * Profil für die öffentliche Seite.
 *
 * In `cache()` verpackt: generateMetadata und die Seite selbst rufen dieselbe
 * Funktion mit denselben Argumenten auf. Ohne die Bündelung entstünden je
 * Seitenaufruf zwei identische Datenbankabfragen.
 */
export const getPublicOrganization = cache(async function getPublicOrganization(
  slug: string,
  type: OrganizationType,
) {
  const org = await prisma.organization.findFirst({
    where: { slug, type, status: "PUBLISHED" },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      tagline: true,
      shortDescription: true,
      description: true,
      history: true,
      importantInfo: true,
      arrivalByCar: true,
      arrivalByPublicTransport: true,
      arrivalNotes: true,
      arrivalMapUrl: true,
      arrivalTransportUrl: true,
      city: true,
      street: true,
      zip: true,
      latitude: true,
      longitude: true,
      startDate: true,
      endDate: true,
      foundedYear: true,
      memberCount: true,
      repertoire: true,
      musicStyle: true,
      website: true,
      contactName: true,
      contactEmail: true,
      contactPhone: true,
      bookingEmail: true,
      verification: true,
      claimStatus: true,
      isFeatured: true,
      // Wird für die Entscheidung über die Indexierbarkeit gebraucht.
      status: true,
      logoId: true,
      headerId: true,
      _count: { select: { events: true, socialLinks: true, media: true } },
      metaTitle: true,
      metaDesc: true,
      updatedAt: true,
      canton: { select: { code: true, name: true, slug: true, region: true } },
      municipality: { select: { name: true } },
      logo: { select: MEDIA_SELECT },
      header: { select: MEDIA_SELECT },
      ogImage: { select: MEDIA_SELECT },
      socialLinks: {
        select: { id: true, platform: true, url: true, label: true },
        orderBy: { sortOrder: "asc" },
      },
      sponsors: {
        select: {
          id: true,
          name: true,
          url: true,
          tier: true,
          logo: { select: MEDIA_SELECT },
        },
        orderBy: { sortOrder: "asc" },
      },
      programItems: {
        select: {
          id: true,
          title: true,
          description: true,
          day: true,
          timeLabel: true,
          place: true,
        },
        orderBy: [{ day: "asc" }, { sortOrder: "asc" }],
      },
      faqs: {
        select: { id: true, question: true, answer: true },
        orderBy: { sortOrder: "asc" },
      },
      downloads: {
        select: {
          id: true,
          title: true,
          externalUrl: true,
          media: { select: { url: true, filename: true, size: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
      media: {
        where: { type: "GALLERY" },
        select: { id: true, url: true, alt: true, caption: true, width: true, height: true },
        orderBy: { sortOrder: "asc" },
        take: 48,
      },
      subscription: {
        select: {
          status: true,
          endDate: true,
          plan: {
            select: {
              key: true,
              features: { select: { enabled: true, feature: { select: { key: true } } } },
            },
          },
        },
      },
    },
  });

  return org;
});

export type PublicOrganization = NonNullable<Awaited<ReturnType<typeof getPublicOrganization>>>;

/** Prüft anhand des Abos, ob ein Bereich der öffentlichen Seite angezeigt wird. */
export function orgHasFeature(org: PublicOrganization, key: string): boolean {
  const sub = org.subscription;
  if (!sub) return false;
  if (["EXPIRED", "CANCELLED", "SUSPENDED"].includes(sub.status)) return false;
  if (sub.endDate && sub.endDate.getTime() < Date.now()) return false;
  return sub.plan.features.some((f) => f.feature.key === key && f.enabled);
}

export async function organizationEvents(organizationId: string) {
  const today = startOfToday();

  const [upcoming, past] = await Promise.all([
    prisma.event.findMany({
      where: {
        organizationId,
        status: "PUBLISHED",
        OR: [{ endDate: { gte: today } }, { endDate: null, startDate: { gte: today } }],
      },
      select: PUBLIC_EVENT_SELECT,
      orderBy: { startDate: "asc" },
      take: 30,
    }),
    prisma.event.findMany({
      where: {
        organizationId,
        status: "PUBLISHED",
        AND: [
          { OR: [{ endDate: { lt: today } }, { endDate: null, startDate: { lt: today } }] },
        ],
      },
      select: PUBLIC_EVENT_SELECT,
      orderBy: { startDate: "desc" },
      take: 6,
    }),
  ]);

  return { upcoming, past };
}

/** Verwandte Organisationen aus derselben Region – gut für Navigation und SEO. */
export async function relatedOrganizations(
  organizationId: string,
  cantonSlug: string,
  type: OrganizationType,
  limit = 4,
) {
  return prisma.organization.findMany({
    where: {
      status: "PUBLISHED",
      type,
      id: { not: organizationId },
      canton: { slug: cantonSlug },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      tagline: true,
      shortDescription: true,
      city: true,
      startDate: true,
      endDate: true,
      foundedYear: true,
      verification: true,
      claimStatus: true,
      isFeatured: true,
      canton: { select: { code: true, name: true, slug: true } },
      logo: { select: MEDIA_SELECT },
      header: { select: MEDIA_SELECT },
    },
    orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
    take: limit,
  });
}

export async function getOrganizationOr404(slug: string, type: OrganizationType) {
  const org = await getPublicOrganization(slug, type);
  if (!org) notFound();
  return org;
}
