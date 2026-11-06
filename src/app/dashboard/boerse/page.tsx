import { marketplaceLimits } from "@/lib/marketplace-limits";
import { getDashboardContext } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";
import { MarketplaceManager } from "@/components/marketplace/manager";
import { AdminMarketplaceBrowser } from "@/components/marketplace/admin-browser";
import { PageHeader } from "@/components/dashboard/page-header";

export const dynamic = "force-dynamic";

export default async function Page() {
  const ctx = await getDashboardContext();
  const orgs = ctx.user.role === "ADMIN"
    ? await prisma.organization.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : ctx.organizations.map((o) => ({ id: o.id, name: o.name }));

  const ownMemberships = ctx.user.role === "ADMIN" ? await prisma.membership.findMany({where:{userId:ctx.user.id},select:{organizationId:true}}) : [];
  const ownIds = ownMemberships.map(m=>m.organizationId);
  const listings = await prisma.marketplaceListing.findMany({
    where: ctx.user.role === "ADMIN" ? { organizationId: { in: ownIds } } : ctx.staff ? {} : { organizationId: { in: orgs.map((o) => o.id) } },
    include: {
      organization: { select: { name: true } },
      inquiries: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const limitsByOrg = Object.fromEntries(await Promise.all(orgs.map(async o => [o.id,await marketplaceLimits(o.id)] as const)));
  return (
    <main className="space-y-6">
      <PageHeader title={ctx.staff ? "Inserate – Administration" : "Meine Inserate"} description="Inserate verwalten, Anfragen beantworten und Angebote verlängern." />
      <MarketplaceManager organizations={orgs} initial={JSON.parse(JSON.stringify(listings))} staff={ctx.staff} limitsByOrg={limitsByOrg} ownOnly={ctx.user.role === "ADMIN"} />
      {ctx.user.role === "ADMIN" ? <AdminMarketplaceBrowser organizations={orgs} limitsByOrg={limitsByOrg} /> : null}
    </main>
  );
}
