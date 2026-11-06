import { randomBytes,createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { jsonOk,jsonError,handleApiError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { getEmailTemplate,renderEmailTemplate } from "@/lib/email-templates";
import { sendMailboxMail } from "@/lib/mail-center-imap";
import { logAudit } from "@/lib/audit";
export const dynamic="force-dynamic";
const hash=(token:string)=>createHash("sha256").update(token).digest("hex");
export async function GET(){
 try{
  await requireAdmin();
  const [organizations,invitations]=await Promise.all([
   prisma.organization.findMany({orderBy:{name:"asc"},select:{id:true,name:true,type:true,slug:true,claimStatus:true},take:4000}),
   prisma.boardingInvitation.findMany({orderBy:{createdAt:"desc"},take:150,include:{organization:{select:{name:true}},user:{select:{name:true,email:true}}}})
  ]);
  return jsonOk({organizations,invitations});
 }catch(e){return handleApiError(e);}
}
export async function POST(request:Request){
 try{
  const actor=await requireAdmin();
  if(!checkRateLimit("boarding-invite:"+actor.id,12,3600000).ok)return jsonError("Zu viele Einladungen. Bitte später erneut versuchen.",429);
  const body=z.object({organizationId:z.string().min(1),email:z.string().email().max(254).transform(v=>v.toLowerCase().trim()),contactName:z.string().trim().max(100).optional()}).parse(await request.json());
  const org=await prisma.organization.findUnique({where:{id:body.organizationId},select:{id:true,name:true,type:true}});
  if(!org)return jsonError("Organisation nicht gefunden.",404);
  const already=await prisma.boardingInvitation.findFirst({where:{organizationId:org.id,email:body.email,status:{in:["SENT","PENDING"]}},orderBy:{createdAt:"desc"}});
  if(already&&already.expiresAt>new Date())return jsonError("Für diesen Kontakt besteht bereits eine offene Einladung.",409);
  const template=await getEmailTemplate("boarding_invite");
  if(!template.enabled)return jsonError("Die Boarding-Vorlage ist deaktiviert.",400);
  const token=randomBytes(32).toString("hex"),expiresAt=new Date(Date.now()+14*86400000);
  const invitationUrl=(process.env.NEXT_PUBLIC_APP_URL||"https://fas-nav.ch").replace(/\/$/,"")+"/boarding/"+token;
  const msg=renderEmailTemplate(template,{contactName:body.contactName||"zusammen",organizationName:org.name,invitationUrl});
  const result=await sendMailboxMail({to:body.email,subject:msg.subject,text:msg.text});
  if(result&&"warning" in result&&result.warning) return jsonError("Die Mail konnte nicht zuverlässig verschickt werden. Bitte den Versand prüfen.",502);
  const invitation=await prisma.boardingInvitation.create({data:{organizationId:org.id,email:body.email,contactName:body.contactName||null,tokenHash:hash(token),expiresAt}});
  await logAudit({userId:actor.id,userLabel:actor.email,action:"boarding.invited",entity:"BoardingInvitation",entityId:invitation.id,after:{organizationId:org.id,email:body.email}});
  return jsonOk({id:invitation.id,status:invitation.status},201);
 }catch(e){return handleApiError(e);}
}
