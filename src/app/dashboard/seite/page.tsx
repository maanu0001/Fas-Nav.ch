import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OrganizationEditor } from "@/components/dashboard/editor/organization-editor";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireOrganizationContext } from "@/lib/dashboard-context";
import { editorSelect, publicHrefFor, toEditorState } from "@/lib/editor-state";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Meine Seite" };

export default async function MyPageEditor() {
  const context = await requireOrganizationContext();

  const [organization, cantons] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: context.organization.id },
      select: editorSelect,
    }),
    prisma.canton.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!organization) notFound();

  // Bearbeiten und Veröffentlichen richten sich nach der Berechtigung
  // innerhalb dieser Organisation.
  const canEdit = context.can("edit");
  const canPublish = context.can("manage");

  return (
    <>
      <PageHeader
        title="Meine Seite"
        description="Bearbeite die Inhalte deiner öffentlichen Profilseite. Änderungen siehst du sofort in der Vorschau."
      />

      {canEdit && !canPublish ? (
        <p className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Du kannst Inhalte bearbeiten. Das Veröffentlichen übernimmt eine Person mit der
          Berechtigung „Verwaltung“ oder „Vollzugriff“.
        </p>
      ) : null}

      <OrganizationEditor
        organizationId={organization.id}
        type={organization.type}
        status={organization.status}
        publicHref={organization.status==="PUBLISHED"?publicHrefFor(organization):`/dashboard/vorschau/${organization.id}`}
        cantons={cantons}
        initial={toEditorState(organization)}
        canPublish={canPublish}
      />
    </>
  );
}
