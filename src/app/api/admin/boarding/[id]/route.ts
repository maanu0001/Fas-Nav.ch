import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin,roleForOrganizationType } from "@/lib/rbac";
import { handleApiError,jsonOk,jsonError } from "@/lib/api";
import { getEmailTemplate,renderEmailTemplate } from "@/lib/email-templates";
import { sendMailboxMail } from "@/lib/mail-center-imap";
import { logAudit } from "@/lib/audit";
import { syncClaimStatus } from "@/lib/claim-status";
import { notify } from "@/lib/notifications";
export const dynamic="force-dynamic";
type Params={params:Promise<{id:string}>};
export async function PATCH(request:Request,{params}:Params){
 try{
  const actor=await requireAdmin(),{id}=await params;
  const {action}=z.object({action:z.enum(["approve","reject","revoke"])}).parse(await request.json());
  const invitation=await prisma.boardingInvitation.findUnique({where:{id},include:{organization:{select:{id:true,name:true,type:true,claimStatus:true}}}});
  if(!invitation)return jsonError("Einladung nicht gefunden.",404);
  if(action==="revoke"){
   if(invitation.status!=="SENT")return jsonError("Nur offene Einladungen können widerrufen werden.",409);
   await prisma.boardingInvitation.update({where:{id},data:{status:"REVOKED",reviewedAt:new Date(),reviewedById:actor.id}});
  }else{
   if(invitation.status!=="PENDING"||!invitation.userId)return jsonError("Keine offene Übernahmeanfrage vorhanden.",409);
   if(action==="approve"){
    await prisma.$transaction(async tx=>{
     const current=await tx.boardingInvitation.updateMany({where:{id,status:"PENDING"},data:{status:"APPROVED",reviewedAt:new Date(),reviewedById:actor.id}});
     if(current.count!==1)throw new Error("Diese Einladung wurde bereits bearbeitet.");
     const existing=await tx.membership.findUnique({where:{userId_organizationId:{userId:invitation.userId!,organizationId:invitation.organizationId}}});
     if(!existing)await tx.membership.create({data:{userId:invitation.userId!,organizationId:invitation.organizationId,role:"OWNER"}});
     await tx.user.update({where:{id:invitation.userId!},data:{role:roleForOrganizationType(invitation.organization.type)}});
     await syncClaimStatus(tx,invitation.organizationId);
    });
    await notify({userId:invitation.userId,organizationId:invitation.organizationId,type:"SYSTEM",title:"Deine Organisation wurde freigegeben",body:"Du kannst "+invitation.organization.name+" ab sofort verwalten.",link:"/dashboard/onboarding"});
   }else{
    await prisma.boardingInvitation.update({where:{id},data:{status:"REJECTED",reviewedAt:new Date(),reviewedById:actor.id}});
   }
   const template=await getEmailTemplate(action==="approve"?"boarding_approved":"boarding_rejected");
   if(template.enabled){
    const message=renderEmailTemplate(template,{contactName:invitation.contactName||"zusammen",organizationName:invitation.organization.name,dashboardUrl:(process.env.NEXT_PUBLIC_APP_URL||"https://fas-nav.ch")+"/dashboard/onboarding"});
    try{await sendMailboxMail({to:invitation.email,subject:message.subject,text:message.text});}catch(error){console.error("[boarding] Status geändert, Benachrichtigungsmail fehlgeschlagen",error);}
   }
  }
  await logAudit({userId:actor.id,userLabel:actor.email,action:"boarding."+action,entity:"BoardingInvitation",entityId:id,after:{organizationId:invitation.organizationId,email:invitation.email}});
  return jsonOk({ok:true});
 }catch(e){return handleApiError(e);}
}
