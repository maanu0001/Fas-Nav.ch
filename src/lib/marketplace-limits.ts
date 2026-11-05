import { prisma } from "@/lib/prisma";
import { isSubscriptionUsable } from "@/lib/subscription";
import type { PlanTier } from "@prisma/client";

export type MarketplaceTier = "FREE" | "BASIC" | "PREMIUM";
export const MARKETPLACE_LIMITS = {
 FREE: { active: 1, images: 3, days: 30, externalContact: false, featured: false },
 BASIC: { active: 5, images: 8, days: 60, externalContact: true, featured: false },
 PREMIUM: { active: 15, images: 12, days: 90, externalContact: true, featured: true },
} as const;
type FeatureSetting = {enabled:boolean;limit:number|null};
export async function organizationPlanFeatures(organizationId:string):Promise<{tier:MarketplaceTier;features:Map<string,FeatureSetting>}>{
 const sub=await prisma.subscription.findUnique({where:{organizationId},select:{status:true,endDate:true,plan:{select:{tier:true,features:{select:{enabled:true,limit:true,feature:{select:{key:true}}}}}}}}});
 const usable=sub&&isSubscriptionUsable(sub);
 const tier:MarketplaceTier=usable&&(sub.plan.tier==="PREMIUM"||sub.plan.tier==="BASIC")?sub.plan.tier:"FREE";
 const plan=usable?sub.plan:await prisma.plan.findFirst({where:{tier:"FREE" as PlanTier,isActive:true},select:{tier:true,features:{select:{enabled:true,limit:true,feature:{select:{key:true}}}}}});
 return {tier,features:new Map((plan?.features??[]).map(f=>[f.feature.key,{enabled:f.enabled,limit:f.limit}]))};
}
export async function marketplaceTier(organizationId:string):Promise<MarketplaceTier>{
 return (await organizationPlanFeatures(organizationId)).tier;
}
export async function marketplaceLimits(organizationId:string){
 const {tier,features}=await organizationPlanFeatures(organizationId);
 const fallback=MARKETPLACE_LIMITS[tier];
 const number=(key:string,def:number)=>{const f=features.get(key);return f?f.enabled?Math.max(0,f.limit??def):0:def;};
 const enabled=(key:string,def:boolean)=>features.get(key)?.enabled??def;
 return {tier,active:number("marketplace_active",fallback.active),images:number("marketplace_images",fallback.images),days:number("marketplace_days",fallback.days),externalContact:enabled("marketplace_external_contact",fallback.externalContact),featured:enabled("marketplace_featured",fallback.featured)};
}
export function listingContactMode(details:unknown):string{
 if(!details||typeof details!=="object"||Array.isArray(details))return "INTERNAL";
 const contact=(details as Record<string,unknown>).contact;
 if(!contact||typeof contact!=="object"||Array.isArray(contact))return "INTERNAL";
 return String((contact as Record<string,unknown>).mode??"INTERNAL");
}
