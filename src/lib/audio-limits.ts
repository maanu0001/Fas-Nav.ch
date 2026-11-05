import { organizationPlanFeatures } from "@/lib/marketplace-limits";
export async function audioLimits(organizationId:string){
 const {tier,features}=await organizationPlanFeatures(organizationId);
 const defaults=tier==="PREMIUM"?{count:5,seconds:180}:tier==="BASIC"?{count:3,seconds:60}:{count:1,seconds:30};
 const count=features.get("audio_samples"),seconds=features.get("audio_seconds");
 return {count:count?(count.enabled?Math.max(0,count.limit??defaults.count):0):defaults.count,seconds:seconds?(seconds.enabled?Math.max(0,seconds.limit??defaults.seconds):0):defaults.seconds};
}
