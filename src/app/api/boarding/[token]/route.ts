import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { roleForOrganizationType } from "@/lib/rbac";
import { jsonOk,jsonError,handleApiError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { notifyStaff } from "@/lib/notifications";
export const dynamic="force-dynamic";
type Params={params:Promise<{token:string}>};
const hash=(token:string)=>createHash("sha256").update(token).digest("hex");
const schema=z.object({name:z.string().trim().min(2).max(120),email:z.string().trim().email().max(254).transform(v=>v.toLowerCase()),password:z.string().min(12).max(200)});
export async function GET(_request:Request,{params}:Params){
 try{
  const {token}=await params;
  if(!/^[a-f0-9]{64}$/.test(token))return jsonError("Ungültige Einladung.",404);
  const invite=await prisma.boardingInvitation.findUnique({where:{tokenHash:hash(token)},include:{organization:{select:{name:true,type:true}},user:{select:{email:true}}}});
  if(!invite)return jsonError("Einladung nicht gefunden.",404);
  if(invite.status==="SENT"&&invite.expiresAt>new Date())await prisma.boardingInvitation.update({where:{id:invite.id},data:{openCount:{increment:1},openedAt:new Date()}});
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
  const user=await prisma.user.findUnique({where:{email:body.email}});
  if(user)return jsonError("Diese E-Mail-Adresse wird bereits verwendet. Bitte verwende für die Registrierung eine andere E-Mail-Adresse.",409);
  const updated=await prisma.$transaction(async tx=>{
   const account=await tx.user.create({data:{name:body.name,email:body.email,passwordHash:await hashPassword(body.password),role:roleForOrganizationType(invite.organization.type)}});
   const accepted=await tx.boardingInvitation.updateMany({where:{id:invite.id,status:"SENT",expiresAt:{gt:new Date()}},data:{status:"PENDING",acceptedAt:new Date(),userId:account.id}});
   if(accepted.count!==1)throw new Error("Einladung bereits verwendet.");
   return account;
  });
  await notifyStaff({type:"SYSTEM",title:"Boarding-Freigabe erforderlich",body:updated.name+" möchte "+invite.organization.name+" übernehmen.",link:"/dashboard/boarding"});
  return jsonOk({status:"PENDING",accountCreated:true});
 }catch(e){return handleApiError(e);}
}
