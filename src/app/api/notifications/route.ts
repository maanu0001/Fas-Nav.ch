import { z } from "zod";
import { handleApiError, jsonOk, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
export const dynamic="force-dynamic";
const idsSchema=z.object({ids:z.array(z.string().max(40)).min(1).max(200)});
const markSchema=z.object({ids:z.array(z.string().max(40)).max(200).optional()});
export async function POST(request:Request){try{const user=await requireUser();const body=await parseBody(request,markSchema);const result=await prisma.notification.updateMany({where:{userId:user.id,readAt:null,...(body.ids?.length?{id:{in:body.ids}}:{})},data:{readAt:new Date()}});return jsonOk({updated:result.count});}catch(error){return handleApiError(error);}}
/** Löscht ausschliesslich Benachrichtigungen des angemeldeten Benutzers. */
export async function DELETE(request:Request){try{const user=await requireUser();const body=await parseBody(request,idsSchema);const result=await prisma.notification.deleteMany({where:{userId:user.id,id:{in:body.ids}}});return jsonOk({deleted:result.count});}catch(error){return handleApiError(error);}}
