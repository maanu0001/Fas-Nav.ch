import { revalidatePath } from "next/cache";
import { handleApiError,jsonError,jsonOk } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireOrgAccess } from "@/lib/rbac";
import { getStorage } from "@/lib/storage";
import { audioLimits } from "@/lib/audio-limits";
export const dynamic="force-dynamic";
type Params={params:Promise<{id:string;sampleId:string}>};
export async function PATCH(request:Request,{params}:Params){
 try {const {id,sampleId}=await params;await requireOrgAccess(id,{write:true});
 const old=await prisma.audioSample.findFirst({where:{id:sampleId,organizationId:id}});if(!old)return jsonError("Nicht gefunden.",404);
 const body=await request.json();const title=String(body.title??old.title).trim();const sortOrder=Number(body.sortOrder??old.sortOrder);
 if(!title||title.length>120||!Number.isSafeInteger(sortOrder)||sortOrder<0||sortOrder>999)return jsonError("Ungültige Angaben.",400);
 const updated=await prisma.audioSample.update({where:{id:sampleId},data:{title,sortOrder}});
 const org=await prisma.organization.findUnique({where:{id},select:{slug:true}});if(org)revalidatePath("/gugge/"+org.slug);
 return jsonOk(updated);
 }catch(e){return handleApiError(e);}
}
export async function DELETE(_request:Request,{params}:Params){
 try {const {id,sampleId}=await params;await requireOrgAccess(id,{write:true});
 const sample=await prisma.audioSample.findFirst({where:{id:sampleId,organizationId:id}});if(!sample)return jsonError("Nicht gefunden.",404);
 await prisma.audioSample.delete({where:{id:sampleId}});
 await getStorage().delete(sample.key);
 const org=await prisma.organization.findUnique({where:{id},select:{slug:true}});if(org)revalidatePath("/gugge/"+org.slug);
 return jsonOk({ok:true});
 }catch(e){return handleApiError(e);}
}
