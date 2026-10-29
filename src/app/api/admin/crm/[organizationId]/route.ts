import { z } from "zod";
import { handleApiError, jsonOk, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
const schema=z.object({status:z.enum(["IMPORTED","CONTACTED","REPLIED","CLAIMED","CUSTOMER"]),nextFollowUp:z.string().max(30).nullable(),notes:z.string().max(4000),contactPerson:z.string().max(200)});
export async function PATCH(request:Request,{params}:{params:Promise<{organizationId:string}>}){try{await requirePermission("manageOrganizations");const {organizationId}=await params;const body=await parseBody(request,schema);await prisma.organization.findUniqueOrThrow({where:{id:organizationId},select:{id:true}});await prisma.siteSetting.upsert({where:{key:`crm.organization.${organizationId}`},create:{key:`crm.organization.${organizationId}`,value:body,group:"crm",label:"CRM"},update:{value:body,group:"crm"}});return jsonOk(body);}catch(error){return handleApiError(error)}}
