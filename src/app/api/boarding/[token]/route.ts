import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { roleForOrganizationType } from "@/lib/rbac";
import { jsonOk,jsonError,handleApiError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { notifyStaff } from "@/lib/notifications";
export const dynamic="force-dynamic";
type Params={params:Promise<{token:string}>};
const hash=(token:string)=>createHash("sha256").update(token).digest("hex");
const schema=z.object({name:z.string().trim().min(2).max(120).optional(),password:z.string().min(12).max(200).optional()});
export async function GET(_request:Request,{params}:Params){
 try{
  const {token}=await params;
  if(!/^[a-f0-9]{64}$/.test(token))return jsonError("Ungültige Einladung.",404);
  const invite=await prisma.boardingInvitation.findUnique({where:{tokenHash:hash(token)},include:{organization:{select:{name:true,type:true}},user:{select:{email:true}}}});
  if(!invite)return jsonError("Einladung nicht gefunden.",404);
  return jsonOk({organizationName:invite.organization.name,organizationType:invite.organization.type,email:invite.email,contactName:invite.contactName,status:invite.status,expired:invite.expiresAt<=new Date()});
 }catch(e){return handleApiError(e);}
}
export async function POST(request:Request,{params}:Params){
 try{
  const {token}=await params;
  if(!/^[a-f0-9]{64}$/.test(token))return jsonError("Ungültige Einladung.",404);
  if(!checkRateLimit("boarding-accept:"+hash(token),6,3600000).ok)return jsonError("Zu viele Versuche.",429);
  const body=schema.parse(await request.json());
  const invite=await prisma.boardingInvitation.findUnique({where:{tokenHash:hash(token)},include:{organization:{select:{type:true,name:true}}}});
  if(!invite||invite.status!=="SENT"||invite.expiresAt<=new Date())return jsonError("Diese Einladung ist nicht mehr gültig.",409);
  const session=await auth();
  if(session?.user?.email&&session.user.email.toLowerCase()!==invite.email.toLowerCase())return jsonError("Bitte mit der eingeladenen E-Mail-Adresse anmelden.",403);
  const user=await prisma.user.findUnique({where:{email:invite.email.toLowerCase()}});
  if(user&&session?.user?.id!==user.id)return jsonError("Für diese Adresse besteht bereits ein Konto. Bitte melde dich zuerst an.",409);
  if(!user&&(!body.name||!body.password))return jsonError("Für die Registrierung benötigen wir einen Namen und ein Passwort mit mindestens 12 Zeichen.",422);
  const updated=await prisma.$transaction(async tx=>{
   const account=user??await tx.user.create({data:{name:body.name!,email:invite.email.toLowerCase(),passwordHash:await hashPassword(body.password!),role:roleForOrganizationType(invite.organization.type),emailVerified:new Date()}});
   const accepted=await tx.boardingInvitation.updateMany({where:{id:invite.id,status:"SENT",expiresAt:{gt:new Date()}},data:{status:"PENDING",acceptedAt:new Date(),userId:account.id}});
   if(accepted.count!==1)throw new Error("Einladung bereits verwendet.");
   return account;
  });
  await notifyStaff({type:"SYSTEM",title:"Boarding-Freigabe erforderlich",body:updated.name+" möchte "+invite.organization.name+" übernehmen.",link:"/dashboard/boarding"});
  return jsonOk({status:"PENDING",accountCreated:!user});
 }catch(e){return handleApiError(e);}
}
