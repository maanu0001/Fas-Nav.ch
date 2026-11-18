import { handleApiError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { planSchema, sortOrderSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/** Neuen Tarif anlegen. Preise und Funktionen sind vollständig konfigurierbar. */
export async function POST(request: Request) {
  try {
    const actor = await requirePermission("managePlans");
    const body = await parseBody(request, planSchema);
    const { features, ...planData } = body;
    let resolvedFeatures = features ?? [];
    if (planData.tier === "PREMIUM" && planData.key !== "premium") {
      const template = await prisma.plan.findUnique({ where: { key: "premium" }, include: { features: { where: { enabled: true } } } });
      if (template) {
        const selected = new Set(resolvedFeatures.map(item => item.featureId));
        resolvedFeatures = [...resolvedFeatures, ...template.features.filter(item => !selected.has(item.featureId)).map(item => ({ featureId: item.featureId, enabled: true, limit: item.limit, value: item.value, note: item.note }))];
      }
    }

    const plan = await prisma.plan.create({
      data: {
        ...planData,
        ...(resolvedFeatures.length
          ? {
              features: {
                create: resolvedFeatures.map((f) => ({
                  featureId: f.featureId,
                  enabled: f.enabled,
                  limit: f.limit,
                  note: f.note,
                  value: f.value,
                })),
              },
            }
          : {}),
      },
      select: { id: true, key: true, name: true, priceChf: true, tier: true },
    });

    await logAudit({
      userId: actor.id,
      userLabel: actor.email,
      action: "plan.create",
      entity: "Plan",
      entityId: plan.id,
      entityLabel: plan.name,
      after: { key: plan.key, priceChf: plan.priceChf },
    });

    return jsonOk(plan, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

/** Reihenfolge mehrerer Tarife in einem Zug setzen. */
export async function PATCH(request: Request) {
  try {
    const actor = await requirePermission("managePlans");
    const { order } = await parseBody(request, sortOrderSchema);

    await prisma.$transaction(
      order.map((eintrag) =>
        prisma.plan.update({ where: { id: eintrag.id }, data: { sortOrder: eintrag.sortOrder } }),
      ),
    );

    await logAudit({
      userId: actor.id,
      userLabel: actor.email,
      action: "plan.reorder",
      entity: "Plan",
      after: { anzahl: order.length },
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
