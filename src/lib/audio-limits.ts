import { organizationPlanFeatures } from "@/lib/marketplace-limits";
export async function audioLimits(organizationId:string){
 const {features}=await organizationPlanFeatures(organizationId);
 const count=features.get("audio_samples"),seconds=features.get("audio_seconds");
 return {count:count?(count.enabled?Math.max(0,count.limit??0):0):0,seconds:seconds?(seconds.enabled?Math.max(0,seconds.limit??0):0):0};
}
