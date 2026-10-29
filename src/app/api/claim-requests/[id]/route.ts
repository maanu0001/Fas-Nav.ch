import { handleApiError,jsonError,jsonOk,parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { syncClaimStatus } from "@/lib/claim-status";
import { OPEN_CLAIM_REQUEST_STATUSES } from "@/lib/constants";
import { sendTemplate } from "@/lib/email-templates";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { claimRequestUpdateSchema } from "@/lib/validation/schemas";
export const dynamic="force-dynamic";type Params={params:Promise<{id:string}>};
export async function PATCH(request:Request,{params}:Params){try{const {id}=await params;const actor=await requirePermission("handleContactRequests");const {status}=await parseBody(request,claimRequestUpdateSchema);const vorher=await prisma.claimRequest.findUnique({where:{id},select:{id:true,status:true,organizationId:true,contactName:true,contactEmail:true,organization:{select:{name:true}}}});if(!vorher)return jsonError("Anfrage nicht gefunden.",404);const erledigt=status==="APPROVED"||status==="REJECTED";const anfrage=await prisma.$transaction(async tx=>{const updated=await tx.claimRequest.update({where:{id},data:{status,handledAt:erledigt?new Date():null},select:{id:true,status:true,handledAt:true}});if(status==="REJECTED"){const open=await tx.claimRequest.count({where:{organizationId:vorher.organizationId,id:{not:id},status:{in:OPEN_CLAIM_REQUEST_STATUSES}}});if(open===0)await syncClaimStatus(tx,vorher.organizationId);}return updated;});await logAudit({userId:actor.id,userLabel:actor.email,action:"claimRequest.status",entity:"ClaimRequest",entityId:id,entityLabel:vorher.organization.name,before:{status:vorher.status},after:{status:anfrage.status}});if(status!==vorher.status&&(status==="APPROVED"||status==="REJECTED")){await sendTemplate(status==="APPROVED"?"claim_approved":"claim_rejected",vorher.contactEmail,{contactName:vorher.contactName,organizationName:vorher.organization.name});}return jsonOk(anfrage);}catch(e){return handleApiError(e);}}
