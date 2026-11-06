import { prisma } from "@/lib/prisma";
import { requireUser,isStaff } from "@/lib/rbac";
import { handleApiError,jsonOk } from "@/lib/api";
export const dynamic="force-dynamic";
export async function GET(request:Request){try{const user=await requireUser();const ownOnly=user.role==="ADMIN"&&new URL(request.url).searchParams.get("own")==="1";const ids=isStaff(user.role)&&!ownOnly?null:(await prisma.membership.findMany({where:{userId:user.id},select:{organizationId:true}})).map(m=>m.organizationId);return jsonOk(await prisma.marketplaceListing.findMany({where:ids?{organizationId:{in:ids}}:{},include:{organization:{select:{name:true}},inquiries:{orderBy:{createdAt:"desc"}}},orderBy:{createdAt:"desc"},take:200}));}catch(e){return handleApiError(e);}}
