import { prisma } from "@/lib/prisma";
import { isSubscriptionUsable } from "@/lib/subscription";
export async function audioLimits(organizationId: string) {
 const sub = await prisma.subscription.findUnique({where:{organizationId},select:{status:true,endDate:true,plan:{select:{tier:true}}}});
 const tier = sub && isSubscriptionUsable(sub) ? sub.plan.tier : "FREE";
 return tier === "PREMIUM" ? {count:5,seconds:180} : tier === "BASIC" ? {count:3,seconds:60} : {count:1,seconds:30};
}
