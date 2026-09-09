import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarPlus, Image as ImageIcon } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";

import { OrganizationEditor } from "@/components/dashboard/editor/organization-editor";
import { OrganizationAdminPanel } from "@/components/dashboard/organization-admin-panel";
import { OrganizationMembers } from "@/components/dashboard/access/organization-members";
import { ResearchPanel } from "@/components/dashboard/import/research-panel";
import { PageHeader } from "@/components/dashboard/page-header";
import { editorSelect, publicHrefFor, toEditorState } from "@/lib/editor-state";
import { requireStaffPage } from "@/lib/dashboard-context";
import { can } from "@/lib/rbac";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const org = await prisma.organization.findUnique({
    where: { id },
    select: { name: true },
  });
  return { title: org?.name ?? "Organisation" };
}

export default async function AdminOrganizationPage({ params }: Params) {
  const { id } = await params;
  const { user } = await requireStaffPage();

  const [organization, cantons, plans, members] = await Promise.all([
    prisma.organization.findUnique({
      where: { id },
      select: {
        ...editorSelect,
        verification: true,
        claimStatus: true,
        isFeatured: true,
        createdAt: true,
        externalImportId: true,
        importSource: true,
        importedAt: true,
        confidenceScore: true,
        needsManualReview: true,
        reviewReasons: true,
        activityStatus: true,
        lastActivityEvidence: true,
        lastVerifiedAt: true,
        dataNotes: true,
        logoSourceUrl: true,
        logoAssetUrl: true,
        logoStatus: true,
        headerSourceUrl: true,
        headerAssetUrl: true,
        headerStatus: true,
        lastImportJob: { select: { id: true, reference: true } },
        sources: {
          orderBy: { createdAt: "asc" },
          select: { id: true, url: true, type: true, title: true, accessedAt: true },
        },
        subscription: {
          select: {
            id: true,
            status: true,
            priceChf: true,
            startDate: true,
            endDate: true,
            nextDueAt: true,
            autoRenew: true,
            planId: true,
            plan: { select: { name: true } },
          },
        },
      },
    }),
    prisma.canton.findMany({ select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    prisma.plan.findMany({
      where: { isActive: true },
      select: { id: true, name: true, priceChf: true, key: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.membership.findMany({
      where: { organizationId: id },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        role: true,
        title: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, isActive: true, lastLoginAt: true } },
      },
    }),
  ]);

  if (!organization) notFound();

  return (
    <>
      <PageHeader
        title={organization.name}
        description={`${organization.type === "CARNIVAL" ? "Fasnacht" : "Gugge"} in ${organization.city}`}
        breadcrumbs={[
          { href: "/dashboard/organisationen", label: "Organisationen" },
          { label: organization.name },
        ]}
        actions={
          // Admin und Team dürfen für jede Organisation Termine erfassen und
          // ihre Galerie pflegen.
          <div className="flex flex-wrap gap-2">
            <ButtonLink
              href={`/dashboard/organisationen/${organization.id}/galerie`}
              variant="outline"
            >
              <ImageIcon />
              Galerie
            </ButtonLink>
            <ButtonLink
              href={`/dashboard/veranstaltungen/neu?organisation=${organization.id}`}
              variant="outline"
            >
              <CalendarPlus />
              Veranstaltung erfassen
            </ButtonLink>
          </div>
        }
      />

      <OrganizationAdminPanel
        organizationId={organization.id}
        slug={organization.slug}
        status={organization.status}
        verification={organization.verification}
        claimStatus={organization.claimStatus}
        isFeatured={organization.isFeatured}
        plans={plans.map((p) => ({ ...p, priceChf: Number(p.priceChf) }))}
        subscription={
          organization.subscription
            ? {
                ...organization.subscription,
                priceChf: Number(organization.subscription.priceChf),
                startDate: organization.subscription.startDate.toISOString(),
                endDate: organization.subscription.endDate?.toISOString() ?? null,
                nextDueAt: organization.subscription.nextDueAt?.toISOString() ?? null,
              }
            : null
        }
      />

      <div className="mt-6">
        <ResearchPanel data={organization} canOpenImportJob={can(user.role as Role, "importData")} />
      </div>

      <div className="mt-6">
        <OrganizationMembers
          organizationId={organization.id}
          organizationName={organization.name}
          canManage
          canSearchExisting
          members={members.map((m) => ({
            id: m.id,
            role: m.role,
            title: m.title,
            createdAt: m.createdAt.toISOString(),
            user: {
              ...m.user,
              lastLoginAt: m.user.lastLoginAt?.toISOString() ?? null,
            },
          }))}
        />
      </div>

      <div className="mt-8">
        <h2 className="mb-4 font-display text-lg font-bold">Inhalte bearbeiten</h2>
        <OrganizationEditor
          organizationId={organization.id}
          type={organization.type}
          status={organization.status}
          publicHref={publicHrefFor(organization)}
          cantons={cantons}
          initial={toEditorState(organization)}
          canPublish
        />
      </div>
    </>
  );
}
