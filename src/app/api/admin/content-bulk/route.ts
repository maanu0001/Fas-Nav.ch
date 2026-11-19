import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { randomUUID } from "node:crypto";
export const dynamic="force-dynamic";
const schema=z.object({kind:z.enum(["EVENT","MEDIA"]),ids:z.array(z.string().min(1)).min(1).max(100),action:z.enum(["PUBLISH","UNPUBLISH","SUSPEND","DRAFT","FEATURE","UNFEATURE","DELETE","TYPE_LOGO","TYPE_HEADER","TYPE_GALLERY","TYPE_DOCUMENT"]),preview:z.boolean().default(true)});
export async function POST(request:Request){
 try{
  const user=await requireAdmin();
  const data=schema.parse(await request.json());
  const ids=[...new Set(data.ids)];
  if(data.kind==="EVENT"){
   if(data.action.startsWith("TYPE_"))return jsonError("Ungültige Veranstaltungsaktion.",400);
   const events=await prisma.event.findMany({where:{id:{in:ids}},select:{id:true,title:true,status:true,isFeatured:true}});
   if(events.length!==ids.length)return jsonError("Mindestens ein Eintrag wurde nicht gefunden.",404);
   if(data.preview)return jsonOk({count:events.length,preview:true});
   const batchId=randomUUID();
   await prisma.$transaction(async tx=>{
    for(const e of events){
     if(data.action==="DELETE")await tx.event.delete({where:{id:e.id}});
     else await tx.event.update({where:{id:e.id},data:data.action==="FEATURE"?{isFeatured:true}:data.action==="UNFEATURE"?{isFeatured:false}:{status:({PUBLISH:"PUBLISHED",UNPUBLISH:"UNPUBLISHED",SUSPEND:"SUSPENDED",DRAFT:"DRAFT"} as Record<string,"PUBLISHED"|"UNPUBLISHED"|"SUSPENDED"|"DRAFT">)[data.action],...(data.action==="PUBLISH"&&e.status!=="PUBLISHED"?{publishedAt:new Date()}:{})}});
     await tx.auditLog.create({data:{userId:user.id,userLabel:user.email,action:"event.bulk_"+data.action.toLowerCase(),entity:"Event",entityId:e.id,entityLabel:e.title,before:{batchId,status:e.status,isFeatured:e.isFeatured},after:{batchId,action:data.action}}});
    }
   },{timeout:120000,maxWait:10000});
   return jsonOk({count:events.length,batchId});
  }
  if(!["DELETE","TYPE_LOGO","TYPE_HEADER","TYPE_GALLERY","TYPE_DOCUMENT"].includes(data.action))return jsonError("Ungültige Medienaktion.",400);
  const media=await prisma.media.findMany({where:{id:{in:ids}},select:{id:true,filename:true,type:true,logoOf:{select:{id:true}},headerOf:{select:{id:true}},ogImageOf:{select:{id:true}},eventImages:{select:{id:true},take:1},sponsorLogos:{select:{id:true},take:1},downloads:{select:{id:true},take:1},homepageSections:{select:{id:true},take:1}}});
  if(media.length!==ids.length)return jsonError("Mindestens eine Datei wurde nicht gefunden.",404);
  if(data.action==="DELETE"){
   const used=media.filter(m=>m.logoOf||m.headerOf||m.ogImageOf||m.eventImages.length||m.sponsorLogos.length||m.downloads.length||m.homepageSections.length);
   if(used.length)return jsonError("Verknüpfte Medien können nicht gelöscht werden: "+used.slice(0,8).map(m=>m.filename).join(", "),409);
  }
  if(data.preview)return jsonOk({count:media.length,preview:true});
  const batchId=randomUUID();
  await prisma.$transaction(async tx=>{
   for(const m of media){
    if(data.action==="DELETE")await tx.media.delete({where:{id:m.id}});
    else await tx.media.update({where:{id:m.id},data:{type:({TYPE_LOGO:"LOGO",TYPE_HEADER:"HEADER",TYPE_GALLERY:"GALLERY",TYPE_DOCUMENT:"DOCUMENT"} as Record<string,"LOGO"|"HEADER"|"GALLERY"|"DOCUMENT">)[data.action]}});
    await tx.auditLog.create({data:{userId:user.id,userLabel:user.email,action:"media.bulk_"+data.action.toLowerCase(),entity:"Media",entityId:m.id,entityLabel:m.filename,before:{batchId,type:m.type},after:{batchId,action:data.action}}});
   }
  },{timeout:120000,maxWait:10000});
  return jsonOk({count:media.length,batchId});
 }catch(e){return handleApiError(e);}
}
