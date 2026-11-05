import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";
const schema = z.object({
  type: z.enum(["ALL", "CARNIVAL", "GUGGE"]),
  excludedIds: z.array(z.string()).max(20000).default([]),
  logoId: z.string().optional(),
  headerId: z.string().optional(),
  status: z.enum(["DRAFT","PENDING_REVIEW","PUBLISHED","UNPUBLISHED","SUSPENDED"]).optional(),
  verification: z.enum(["UNVERIFIED","VERIFIED","OFFICIAL"]).optional(),
  needsManualReview: z.boolean().optional(),
  preview: z.boolean().default(true),
});
export async function GET() {
  try {
    await requireAdmin();
    const organizations = await prisma.organization.findMany({
      select: { id:true,name:true,type:true,status:true,logoId:true,headerId:true },
      orderBy: {name:"asc"},
    });
    return jsonOk(organizations);
  } catch(e) { return handleApiError(e); }
}
export async function POST(request:Request) {
  try {
    const user = await requireAdmin();
    const data = schema.parse(await request.json());
    const {type,excludedIds,logoId,headerId,status,verification,needsManualReview,preview}=data;
    if(!logoId&&!headerId&&!status&&!verification&&needsManualReview===undefined)
      return jsonError("Mindestens eine Änderung auswählen.",400);
    const excluded = new Set(excludedIds);
    const organizations = await prisma.organization.findMany({
      where:{ ...(type==="ALL"?{}:{type}), ...(excluded.size?{id:{notIn:[...excluded]}}:{}) },
      select:{id:true,name:true,logoId:true,headerId:true,status:true,verification:true,needsManualReview:true},
      orderBy:{name:"asc"},
    });
    if(organizations.length>2000) return jsonError("Zu viele Organisationen für einen Lauf (maximal 2000).",400);
    const ids=[logoId,headerId].filter((v):v is string=>!!v);
    const media=ids.length?await prisma.media.findMany({where:{id:{in:ids},organizationId:null,uploadedById:user.id}}):[];
    if(media.length!==new Set(ids).size) return jsonError("Ersatzbilder müssen als eigene, organisationsunabhängige Medien hochgeladen werden.",400);
    if(logoId&&media.find(m=>m.id===logoId)?.type!=="LOGO")return jsonError("Ungültiges Logo.",400);
    if(headerId&&media.find(m=>m.id===headerId)?.type!=="HEADER")return jsonError("Ungültiger Banner.",400);
    if(preview)return jsonOk({count:organizations.length,organizations:organizations.map(o=>({id:o.id,name:o.name})),preview:true});
    if(organizations.length===0)return jsonError("Keine Organisationen ausgewählt.",400);
    const batchId=randomUUID();
    // Unique constraints on logoId/headerId require distinct Media records per org.
    // Storage bytes are shared; records preserve the existing schema and references.
    await prisma.$transaction(async tx=>{
      for(const org of organizations){
        const updates:Record<string,unknown>={};
        for(const [field,sourceId] of [["logoId",logoId],["headerId",headerId]] as const){
          if(!sourceId)continue;
          const source=media.find(m=>m.id===sourceId)!;
          const copy=await tx.media.create({data:{
            type:source.type,provider:source.provider,key:source.key,url:source.url,
            thumbnailUrl:source.thumbnailUrl,filename:source.filename,mimeType:source.mimeType,
            size:source.size,width:source.width,height:source.height,alt:source.alt,
            caption:source.caption,uploadedById:user.id,
          }});
          updates[field]=copy.id;
        }
        if(status)updates.status=status;
        if(verification)updates.verification=verification;
        if(needsManualReview!==undefined)updates.needsManualReview=needsManualReview;
        if(status==="PUBLISHED"&&org.status!=="PUBLISHED")updates.publishedAt=new Date();
        await tx.organization.update({where:{id:org.id},data:updates});
        await tx.auditLog.create({data:{
          userId:user.id,userLabel:user.email,action:"organization.bulk_update",
          entity:"Organization",entityId:org.id,entityLabel:org.name,
          before:{batchId,logoId:org.logoId,headerId:org.headerId,status:org.status,verification:org.verification,needsManualReview:org.needsManualReview},
          after:{batchId,...updates},
        }});
      }
    },{timeout:120000,maxWait:10000});
    await logAudit({userId:user.id,userLabel:user.email,action:"organization.bulk_complete",entity:"OrganizationBulk",entityId:batchId,after:{count:organizations.length,type,excludedCount:excluded.size}});
    return jsonOk({count:organizations.length,batchId,preview:false});
  } catch(e) { return handleApiError(e); }
}
