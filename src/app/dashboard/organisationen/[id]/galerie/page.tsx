import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { GalleryManager } from "@/components/dashboard/gallery-manager";
import { PageHeader } from "@/components/dashboard/page-header";
import { FEATURE_KEYS } from "@/lib/constants";
import { requireOrganizationAccessPage } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";
import { featureAccess, subscriptionInclude } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Galerie" };

type Params = { params: Promise<{ id: string }> };

/**
 * Galerie einer beliebigen Organisation.
 *
 * Dieselbe Oberfläche, die Organisationen unter „Galerie“ für sich selbst
 * verwenden – nur mit der Organisation aus der Adresse statt aus dem
 * angemeldeten Konto. Admin und Team erreichen darüber jede Organisation.
 *
 * Der Zugriff wird über requireOrganizationAccessPage aufgelöst, also über
 * dieselbe Prüfung wie überall sonst: Admin und Team dürfen jede Organisation
 * bearbeiten, ein Organisationskonto ausschliesslich die eigene. Ein Konto
 * ohne Berechtigung landet auf der Hinweisseite, auch bei untergeschobener
 * Kennung. Die Endpunkte hinter dem Hochladen und Löschen prüfen dasselbe
 * noch einmal.
 */
export default async function OrganizationGalleryPage({ params }: Params) {
  const { id } = await params;
  const zugriff = await requireOrganizationAccessPage(id, "edit");

  const organization = await prisma.organization.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!organization) notFound();

  const [media, subscription] = await Promise.all([
    prisma.media.findMany({
      where: { organizationId: id, type: "GALLERY" },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, url: true, thumbnailUrl: true, alt: true, caption: true },
    }),
    prisma.subscription.findUnique({ where: { organizationId: id }, include: subscriptionInclude }),
  ]);

  const access = featureAccess(subscription, FEATURE_KEYS.GALLERY);

  return (
    <>
      <PageHeader
        title="Galerie"
        description={`Bilder für die öffentliche Seite von ${organization.name}. Erlaubt sind PNG, JPG und WebP.`}
        // Die Brotkrumen führen dorthin zurück, wo die Rolle auch hinkommt:
        // Admin und Team über die Organisationsliste, ein Organisationskonto
        // auf sein Dashboard. Die Seite selbst ist für beide dieselbe.
        breadcrumbs={
          zugriff.viaStaff
            ? [
                { href: "/dashboard/organisationen", label: "Organisationen" },
                { href: `/dashboard/organisationen/${id}`, label: organization.name },
                { label: "Galerie" },
              ]
            : [{ href: "/dashboard", label: "Dashboard" }, { label: "Galerie" }]
        }
      />

      <GalleryManager
        organizationId={id}
        initial={media}
        limit={access.limit}
        enabled={access.enabled}
      />
    </>
  );
}
