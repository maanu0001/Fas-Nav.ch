import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { handleApiError, jsonOk } from "@/lib/api";
import type { Prisma } from "@prisma/client";
export const dynamic = "force-dynamic";

/** Admin-only, paginated listing management. Own organization memberships are excluded. */
export async function GET(request: Request) {
  try {
    const user = await requireAdmin();
    const url = new URL(request.url);
    const page = Math.max(1, Math.min(10000, Number(url.searchParams.get("page")) || 1));
    const q = (url.searchParams.get("q") || "").trim().slice(0, 100);
    const organizationId = (url.searchParams.get("organizationId") || "").trim();
    const status = url.searchParams.get("status");
    const own = await prisma.membership.findMany({ where: { userId: user.id }, select: { organizationId: true } });
    const ownIds = own.map(m => m.organizationId);
    const where: Prisma.MarketplaceListingWhereInput = {
      status: { in: status === "DRAFT" || status === "ACTIVE" ? [status] : ["DRAFT", "ACTIVE"] },
      ...(ownIds.length ? { organizationId: { notIn: ownIds } } : {}),
      ...(organizationId ? { AND: [{ organizationId }] } : {}),
      ...(q ? { OR: [
        { title: { contains: q, mode: "insensitive" } },
        { organization: { name: { contains: q, mode: "insensitive" } } },
      ] } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.marketplaceListing.findMany({
        where, orderBy: { createdAt: "desc" }, skip: (page - 1) * 30, take: 30,
        include: { organization: { select: { name: true } }, inquiries: { orderBy: { createdAt: "desc" } } },
      }),
      prisma.marketplaceListing.count({ where }),
    ]);
    return jsonOk({ items, total, page, perPage: 30 });
  } catch (error) { return handleApiError(error); }
}
