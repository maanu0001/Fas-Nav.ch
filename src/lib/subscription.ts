import type { Prisma } from "@prisma/client";

import { SUBSCRIPTION_EXPIRY_WARNING_DAYS, type FeatureKey } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export type SubscriptionWithPlan = Prisma.SubscriptionGetPayload<{
  include: { plan: { include: { features: { include: { feature: true } } } } };
}>;

export const subscriptionInclude = {
  plan: { include: { features: { include: { feature: true } } } },
} satisfies Prisma.SubscriptionInclude;

export type FeatureAccess = {
  enabled: boolean;
  limit: number | null;
};

/**
 * Feature-Zugriff wird ausschliesslich aus der Datenbank abgeleitet –
 * Preise und Funktionsumfang sind damit jederzeit vom Admin änderbar.
 */
export function featureAccess(
  subscription: SubscriptionWithPlan | null | undefined,
  key: FeatureKey | string,
): FeatureAccess {
  if (!subscription) return { enabled: false, limit: null };

  // Abgelaufene oder gesperrte Abos verlieren kostenpflichtige Funktionen.
  if (!isSubscriptionUsable(subscription)) return { enabled: false, limit: 0 };

  const entry = subscription.plan.features.find((f) => f.feature.key === key);
  if (!entry) return { enabled: false, limit: null };
  return { enabled: entry.enabled, limit: entry.limit };
}

export function hasFeature(
  subscription: SubscriptionWithPlan | null | undefined,
  key: FeatureKey | string,
): boolean {
  return featureAccess(subscription, key).enabled;
}

/** Prüft, ob ein weiteres Element innerhalb des Tariflimits liegt. */
export function withinLimit(
  subscription: SubscriptionWithPlan | null | undefined,
  key: FeatureKey | string,
  currentCount: number,
): { allowed: boolean; limit: number | null; reason?: string } {
  const access = featureAccess(subscription, key);
  if (!access.enabled) {
    return {
      allowed: false,
      limit: access.limit,
      reason: "Diese Funktion ist in deinem aktuellen Abonnement nicht enthalten.",
    };
  }
  if (access.limit === null) return { allowed: true, limit: null };
  if (currentCount >= access.limit) {
    return {
      allowed: false,
      limit: access.limit,
      reason: `Dein Tarif erlaubt maximal ${access.limit} Einträge. Ein Upgrade schaltet mehr frei.`,
    };
  }
  return { allowed: true, limit: access.limit };
}

/** Aktiv nutzbar – abgelaufene Abos schalten in den eingeschränkten Modus. */
export function isSubscriptionUsable(
  subscription: Pick<SubscriptionWithPlan, "status" | "endDate"> | null | undefined,
): boolean {
  if (!subscription) return false;
  if (["EXPIRED", "CANCELLED", "SUSPENDED"].includes(subscription.status)) return false;
  if (subscription.endDate && subscription.endDate.getTime() < Date.now()) return false;
  return true;
}

export function daysUntilExpiry(endDate: Date | null | undefined): number | null {
  if (!endDate) return null;
  return Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function isExpiringSoon(endDate: Date | null | undefined): boolean {
  const days = daysUntilExpiry(endDate);
  return days !== null && days >= 0 && days <= SUBSCRIPTION_EXPIRY_WARNING_DAYS;
}

/** Lädt das Abonnement einer Organisation inklusive Tarifdetails. */
export async function getSubscription(organizationId: string) {
  const assigned = await prisma.subscription.findUnique({ where: { organizationId }, select: { plan: { select: { id: true, key: true, tier: true } } } });
  if (assigned?.plan.tier === "PREMIUM" && assigned.plan.key !== "premium") {
    const template = await prisma.plan.findUnique({ where: { key: "premium" }, include: { features: { where: { enabled: true } } } });
    if (template) {
      const existing = await prisma.planFeature.findMany({ where: { planId: assigned.plan.id }, select: { featureId: true } });
      const keys = new Set(existing.map(item => item.featureId));
      const missing = template.features.filter(item => !keys.has(item.featureId));
      if (missing.length) await prisma.planFeature.createMany({ data: missing.map(item => ({ planId: assigned.plan.id, featureId: item.featureId, enabled: true, limit: item.limit, value: item.value, note: item.note })), skipDuplicates: true });
    }
  }
  return prisma.subscription.findUnique({
    where: { organizationId },
    include: subscriptionInclude,
  });
}
