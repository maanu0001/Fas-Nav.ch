import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { requireStaffPage } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ClaimRequestsPage() {
  await requireStaffPage();
  const requests = await prisma.claimRequest.findMany({
    where: { status: { in: ["PENDING", "IN_REVIEW"] } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, contactName: true, contactEmail: true, contactPhone: true,
      message: true, status: true, createdAt: true,
      organization: { select: { id: true, name: true } },
    },
  });
  return (
    <>
      <PageHeader title="Profilübernahmen" description="Offene Anträge auf Übernahme bestehender Organisationsprofile." />
      <div className="space-y-4">
        {requests.length === 0 ? (
          <Card className="p-5"><p className="text-sm text-muted-foreground">Keine offenen Profilübernahmen vorhanden.</p></Card>
        ) : requests.map(request => (
          <Card key={request.id} className="space-y-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><h2 className="font-semibold">{request.organization.name}</h2>
                <p className="text-sm text-muted-foreground">{request.contactName} · {request.contactEmail}</p>
              </div>
              <span className="text-xs text-muted-foreground">{request.createdAt.toLocaleDateString("de-CH")} · {request.status}</span>
            </div>
            {request.contactPhone && <p className="text-sm">Telefon: {request.contactPhone}</p>}
            <p className="whitespace-pre-wrap text-sm">{request.message}</p>
            <Link href={`/dashboard/organisationen/${request.organization.id}`} className="inline-block text-sm font-medium text-primary-700 underline">Organisationsprofil prüfen</Link>
          </Card>
        ))}
      </div>
    </>
  );
}
