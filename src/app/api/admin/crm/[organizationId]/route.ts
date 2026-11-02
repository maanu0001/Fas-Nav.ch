import { z } from "zod";
import { handleApiError, jsonOk, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

const status=z.enum(["IMPORTED","CONTACTED","REPLIED","CLAIMED","CUSTOMER","NOT_INTERESTED","UNREACHABLE"]);
const schema=z.object({status,nextFollowUp:z.string().max(30).nullable(),notes:z.string().max(4000),contactPerson:z.string().max(200)});

export async function PATCH(request:Request,{params}:{params:Promise<{organizationId:string}>}){
 try{
  const user=await requirePermission("manageOrganizations");const {organizationId}=await params;const body=await parseBody(request,schema);
  const organization=await prisma.organization.findUniqueOrThrow({where:{id:organizationId},select:{id:true,name:true}});
  const key=`crm.organization.${organizationId}`;const existing=await prisma.siteSetting.findUnique({where:{key},select:{value:true}});const previous=existing?.value&&typeof existing.value==="object"&&!Array.isArray(existing.value)?existing.value as Record<string,unknown>:{};
  const history=Array.isArray(previous.history)?previous.history.filter((entry):entry is Record<string,unknown>=>Boolean(entry&&typeof entry==="object"&&!Array.isArray(entry))).slice(-49):[];
  const changes:string[]=[];if(previous.status!==body.status)changes.push(`Status: ${String(previous.status??"IMPORTED")} → ${body.status}`);if((previous.nextFollowUp??null)!==body.nextFollowUp)changes.push(body.nextFollowUp?`Follow-up: ${body.nextFollowUp}`:"Follow-up erledigt");if(previous.notes!==undefined&&previous.notes!==body.notes)changes.push("Notiz aktualisiert");
  const value={...body,history:changes.length?[...history,{at:new Date().toISOString(),by:user.name??user.email??"Admin",changes}]:history};
  await prisma.siteSetting.upsert({where:{key},create:{key,value,group:"crm",label:"CRM"},update:{value,group:"crm"}});
  await prisma.auditLog.create({data:{action:"CRM_UPDATED",entityType:"Organization",entityId:organization.id,entityLabel:organization.name,userId:user.id,userLabel:user.name??user.email??null,metadata:{changes}}});
  return jsonOk(value);
 }catch(error){return handleApiError(error)}
}
