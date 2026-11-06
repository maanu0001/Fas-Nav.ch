import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOwnedDraftBySlug } from "@/lib/queries/owned-draft";

import { OrganizationProfile } from "@/components/public/organization-profile";
import { ViewTracker } from "@/components/public/view-tracker";
import {
  getPublicOrganization,
  organizationEvents,
  relatedOrganizations,
} from "@/lib/queries/organization";
import { isIndexableOrganization } from "@/lib/indexability";
import { breadcrumbJsonLd, buildMetadata, jsonLdScript, organizationJsonLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };


export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await getPublicOrganization(slug, "GUGGE") ?? await getOwnedDraftBySlug(slug, "GUGGE");
  if (!org) return buildMetadata({ title: "Gugge nicht gefunden", path: `/gugge/${slug}`, noIndex: true });

  return buildMetadata({
    title: org.metaTitle || `${org.name} – Guggenmusik aus ${org.city}`,
    description:
      org.metaDesc ||
      org.shortDescription ||
      `${org.name} aus ${org.city} (${org.canton.name}): Auftritte, Geschichte, Repertoire und Kontakt der Guggenmusik.`,
    path: `/gugge/${org.slug}`,
    // Ein sehr dünnes Profil bleibt öffentlich erreichbar und intern
    // verlinkt, gehört aber nicht in den Suchindex. Dieselbe Funktion
    // entscheidet über die Aufnahme in die Sitemap.
    noIndex: org.status !== "PUBLISHED" || !isIndexableOrganization(org),
    image: org.ogImage?.url ?? org.header?.url ?? org.logo?.url,
    type: "profile",
    keywords: [
      org.name,
      `Guggenmusik ${org.city}`,
      `Gugge ${org.canton.name}`,
      "Guggenmusik Schweiz",
      "Guggenkonzert",
    ],
  });
}

export default async function GuggePage({ params }: Props) {
  const { slug } = await params;
  const org = await getPublicOrganization(slug, "GUGGE");
  if (!org) notFound();

  const [events, related] = await Promise.all([
    organizationEvents(org.id),
    relatedOrganizations(org.id, org.canton.slug, "GUGGE"),
  ]);

  const jsonLd = [
    organizationJsonLd({
      name: org.name,
      slug: org.slug,
      type: "GUGGE",
      description: org.shortDescription ?? org.description,
      logo: org.logo?.url,
      image: org.header?.url,
      city: org.city,
      zip: org.zip,
      street: org.street,
      cantonName: org.canton.name,
      foundedYear: org.foundedYear,
      website: org.website,
      email: org.contactEmail,
      phone: org.contactPhone,
      sameAs: org.socialLinks.map((l) => l.url),
    }),
    breadcrumbJsonLd([
      { name: "Startseite", path: "/" },
      { name: "Guggen", path: "/guggen" },
      { name: org.name, path: `/gugge/${org.slug}` },
    ]),
  ];

  return (
    <>
      {org.status==="PUBLISHED"?<script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(jsonLd)} />:null}
      {org.status!=="PUBLISHED"?<div className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-amber-900">Geschützte Vorschau – diese Organisation ist noch nicht öffentlich.</div>:null}
      {org.status==="PUBLISHED"?<ViewTracker target="ORGANIZATION" organizationId={org.id} path={`/gugge/${org.slug}`} />:null}
      <OrganizationProfile organization={org} events={events} related={related} />
    </>
  );
}
