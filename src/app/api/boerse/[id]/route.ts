import { marketplaceLimits,listingContactMode } from "@/lib/marketplace-limits";
import { prisma } from "@/lib/prisma";
import { handleApiError,jsonError,jsonOk } from "@/lib/api";
import { listingSchema,orgAccess } from "@/lib/marketplace";
export const dynamic="force-dynamic";
type P={params:Promise<{id:string}>};
export async function PATCH(request:Request,{params}:P){try{const {id}=await params;const item=await prisma.marketplaceListing.findUniqueOrThrow({where:{id}});await orgAccess(item.organizationId);const body=await request.json();if(body.action){const actions=["publish","pause","reserve","complete","renew","draft","archive"];if(!actions.includes(body.action))return jsonError("Ungültige Aktion.",400);const status=body.action==="publish"||body.action==="renew"?"ACTIVE":body.action==="pause"?"PAUSED":body.action==="reserve"?"RESERVED":body.action==="complete"||body.action==="archive"?"COMPLETED":"DRAFT";const now=new Date();const limits=await marketplaceLimits(item.organizationId);
 if(status==="ACTIVE"){
 const current=await prisma.marketplaceListing.count({where:{organizationId:item.organizationId,id:{not:id},status:{in:["ACTIVE","RESERVED"]},expiresAt:{gt:now}}});
 if(current>=limits.active)return jsonError("Dein Tarif erlaubt maximal "+limits.active+" gleichzeitig sichtbare Inserate.",403);
 if(item.imageUrls.length>limits.images)return jsonError("Dein Tarif erlaubt maximal "+limits.images+" Bilder pro Inserat.",403);
 if(!limits.externalContact&&listingContactMode(item.details)!=="INTERNAL")return jsonError("Bitte stelle den Kontaktweg auf Fas-Nav um oder wechsle zu Basic.",403);
 }
 const updated=await prisma.marketplaceListing.update({where:{id},data:{status,publishedAt:status==="ACTIVE"?now:item.publishedAt,expiresAt:status==="ACTIVE"?new Date(now.getTime()+limits.days*86400000):item.expiresAt}});return jsonOk(updated);}
 const data=listingSchema.parse({...body,organizationId:item.organizationId});const limits=await marketplaceLimits(item.organizationId);
 if(data.imageUrls.length>limits.images)return jsonError("Dein Tarif erlaubt maximal "+limits.images+" Bilder pro Inserat.",403);
 if(!limits.externalContact&&listingContactMode(data.details)!=="INTERNAL")return jsonError("Direkte Kontaktangaben sind ab Basic verfügbar.",403);
 const {date,organizationId,...rest}=data;return jsonOk(await prisma.marketplaceListing.update({where:{id},data:{...rest,date:date?new Date(date):null}}));}catch(e){return handleApiError(e);}}
export async function DELETE(_r:Request,{params}:P){try{const {id}=await params;const item=await prisma.marketplaceListing.findUniqueOrThrow({where:{id}});await orgAccess(item.organizationId);await prisma.marketplaceListing.delete({where:{id}});return jsonOk({ok:true});}catch(e){return handleApiError(e);}}
