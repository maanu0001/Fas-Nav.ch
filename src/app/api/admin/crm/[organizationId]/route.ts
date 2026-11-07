import { Prisma } from "@prisma/client";
import { z } from "zod";
import { handleApiError, jsonOk, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { roadmapKey, ROADMAP_GROUP } from "@/lib/admin-roadmap";
import { requirePermission } from "@/lib/rbac";

const status=z.enum(["IMPORTED","CONTACTED","REPLIED","CLAIMED","CUSTOMER","NOT_INTERESTED","UNREACHABLE"]);
const schema=z.object({status,nextFollowUp:z.string().max(30).nullable(),notes:z.string().max(4000),contactPerson:z.string().max(200)});
type HistoryEntry={at:string;by:string;changes:string[]};

function isHistoryEntry(entry:unknown):entry is HistoryEntry{
 if(!entry||typeof entry!=="object"||Array.isArray(entry))return false;
 const value=entry as Record<string,unknown>;
 return typeof value.at==="string"&&typeof value.by==="string"&&Array.isArray(value.changes)&&value.changes.every(change=>typeof change==="string");
}

export async function PATCH(request:Request,{params}:{params:Promise<{organizationId:string}>}){
 try{
  const user=await requirePermission("manageOrganizations");const {organizationId}=await params;const body=await parseBody(request,schema);
  const organization=await prisma.organization.findUniqueOrThrow({where:{id:organizationId},select:{id:true,name:true}});
  const key=`crm.organization.${organizationId}`;const existing=await prisma.siteSetting.findUnique({where:{key},select:{value:true}});const previous=existing?.value&&typeof existing.value==="object"&&!Array.isArray(existing.value)?existing.value as Record<string,unknown>:{};
  const history:HistoryEntry[]=Array.isArray(previous.history)?previous.history.filter(isHistoryEntry).slice(-49):[];
  const changes:string[]=[];if(previous.status!==body.status)changes.push(`Status: ${String(previous.status??"IMPORTED")} → ${body.status}`);if((previous.nextFollowUp??null)!==body.nextFollowUp)changes.push(body.nextFollowUp?`Follow-up: ${body.nextFollowUp}`:"Follow-up erledigt");if(previous.notes!==undefined&&previous.notes!==body.notes)changes.push("Notiz aktualisiert");
  const nextHistory:HistoryEntry[]=changes.length?[...history,{at:new Date().toISOString(),by:user.name??user.email??"Admin",changes}]:history;
  const value:Prisma.InputJsonObject={status:body.status,nextFollowUp:body.nextFollowUp,notes:body.notes,contactPerson:body.contactPerson,history:nextHistory};
  await prisma.siteSetting.upsert({where:{key},create:{key,value,group:"crm",label:"CRM"},update:{value,group:"crm"}});
  // A meaningful CRM contact activates the roadmap once; never overwrite staff edits.
  if (["CONTACTED","REPLIED","CLAIMED","CUSTOMER"].includes(body.status)) {
    const roadmapKeyValue = roadmapKey(organizationId);
    await prisma.siteSetting.upsert({
      where: { key: roadmapKeyValue },
      create: { key: roadmapKeyValue, group: ROADMAP_GROUP, label: "Interner Kundenprozess", value: { source: "ACQUISITION", status: body.status === "CUSTOMER" ? "DONE" : body.status === "CONTACTED" ? "WAITING" : "ACTIVE", checked: [], note: "", due: body.nextFollowUp ?? "", updatedAt: new Date().toISOString(), updatedBy: user.id } },
      update: {},
    });
  }
  await prisma.auditLog.create({data:{action:"CRM_UPDATED",entity:"Organization",entityId:organization.id,entityLabel:organization.name,userId:user.id,userLabel:user.name??user.email??null,after:{changes}}});
  return jsonOk(value);
 }catch(error){return handleApiError(error)}
}
