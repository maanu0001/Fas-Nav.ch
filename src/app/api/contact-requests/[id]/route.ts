import { z } from "zod";

import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const contactRequestUpdateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]),
});

/** Bearbeitungsstand einer externen Kontaktanfrage ändern. */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const actor = await requirePermission("handleContactRequests");
    const body = await parseBody(request, contactRequestUpdateSchema);

    const before = await prisma.ticket.findFirst({
      where: { id, category: "CONTACT" },
      select: { id: true, number: true, subject: true, status: true },
    });
    if (!before) return jsonError("Kontaktanfrage nicht gefunden.", 404);

    const contact = await prisma.ticket.update({
      where: { id },
      data: {
        status: body.status,
        closedAt: body.status === "RESOLVED" ? new Date() : null,
      },
      select: { id: true, status: true },
    });

    await logAudit({
      userId: actor.id,
      userLabel: actor.email,
      action: "contactRequest.status",
      entity: "ContactRequest",
      entityId: id,
      entityLabel: before.subject,
      before: { status: before.status },
      after: { status: contact.status },
    });

    return jsonOk(contact);
  } catch (error) {
    return handleApiError(error);
  }
}
