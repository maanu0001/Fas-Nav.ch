import { cookies } from "next/headers";
import { z } from "zod";
import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const ADMIN_TEST_ORG_COOKIE = "fasnav_admin_test_org";
const schema = z.object({ organizationId: z.string().min(1).max(40) });

export async function POST(request: Request) {
  try {
    const user = await requireAdmin();
    const { organizationId } = await parseBody(request, schema);
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    });
    if (!organization) return jsonError("Organisation nicht gefunden.", 404);

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_TEST_ORG_COOKIE, organization.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 4,
    });
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userLabel: user.name ?? user.email ?? "Admin",
        action: "admin.testMode.start",
        entity: "Organization",
        entityId: organization.id,
        entityLabel: organization.name,
      },
    });
    return jsonOk({ organizationId: organization.id });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE() {
  try {
    const user = await requireAdmin();
    const cookieStore = await cookies();
    const organizationId = cookieStore.get(ADMIN_TEST_ORG_COOKIE)?.value ?? null;
    cookieStore.delete(ADMIN_TEST_ORG_COOKIE);
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        userLabel: user.name ?? user.email ?? "Admin",
        action: "admin.testMode.stop",
        entity: "Organization",
        entityId: organizationId,
      },
    });
    return jsonOk({ stopped: true });
  } catch (error) {
    return handleApiError(error);
  }
}
