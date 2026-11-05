import { prisma } from "@/lib/prisma";
import { isSubscriptionUsable } from "@/lib/subscription";

export type MarketplaceTier = "FREE" | "BASIC" | "PREMIUM";
export const MARKETPLACE_LIMITS = {
 FREE: { active: 1, images: 3, days: 30, externalContact: false, duplicate: false, featured: false },
 BASIC: { active: 5, images: 8, days: 60, externalContact: true, duplicate: true, featured: false },
 PREMIUM: { active: 15, images: 12, days: 90, externalContact: true, duplicate: true, featured: true },
} as const;
export async function marketplaceTier(organizationId: string): Promise<MarketplaceTier> {
 const sub = await prisma.subscription.findUnique({where:{organizationId},select:{status:true,endDate:true,plan:{select:{tier:true}}}});
 if (!sub || !isSubscriptionUsable(sub)) return "FREE";
 return sub.plan.tier === "PREMIUM" ? "PREMIUM" : sub.plan.tier === "BASIC" ? "BASIC" : "FREE";
}
export async function marketplaceLimits(organizationId:string) {
 const tier=await marketplaceTier(organizationId);
 return {tier,...MARKETPLACE_LIMITS[tier]};
}
export function listingContactMode(details:unknown): string {
 if (!details || typeof details !== "object" || Array.isArray(details)) return "INTERNAL";
 const contact=(details as Record<string,unknown>).contact;
 if (!contact || typeof contact !== "object" || Array.isArray(contact)) return "INTERNAL";
 return String((contact as Record<string,unknown>).mode ?? "INTERNAL");
}
