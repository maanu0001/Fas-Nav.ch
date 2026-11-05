import { marketplaceLimits } from "@/lib/marketplace-limits";
import { getDashboardContext } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";
import { MarketplaceManager } from "@/components/marketplace/manager";

export const dynamic = "force-dynamic";

export default async function Page() {
  const ctx = await getDashboardContext();
  const orgs = ctx.user.role === "ADMIN"
    ? await prisma.organization.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : ctx.organizations.map((o) => ({ id: o.id, name: o.name }));

  const listings = await prisma.marketplaceListing.findMany({
    where: ctx.staff ? {} : { organizationId: { in: orgs.map((o) => o.id) } },
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
      <h1 className="text-3xl font-bold">{ctx.staff ? "Inserate – Administration" : "Meine Inserate"}</h1>
      <p className="text-muted-foreground">Inserate verwalten, Anfragen beantworten und Angebote verlängern.</p>
      <MarketplaceManager organizations={orgs} initial={JSON.parse(JSON.stringify(listings))} staff={ctx.staff} limitsByOrg={limitsByOrg} />
    </main>
  );
}
