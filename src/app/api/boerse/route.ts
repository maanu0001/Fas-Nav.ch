import { prisma } from "@/lib/prisma";
import { handleApiError,jsonOk } from "@/lib/api";
import { listingSchema,orgAccess,activeFilter } from "@/lib/marketplace";
export const dynamic="force-dynamic";
export async function GET(request:Request){try{const u=new URL(request.url);const category=u.searchParams.get("category");const q=u.searchParams.get("q")?.trim().slice(0,100);const listings=await prisma.marketplaceListing.findMany({where:{...activeFilter(),...(category&&["AUFTRITTE","KOSTUEME","INSTRUMENTE"].includes(category)?{category}:{}),...(q?{OR:[{title:{contains:q,mode:"insensitive"}},{description:{contains:q,mode:"insensitive"}},{city:{contains:q,mode:"insensitive"}}]}:{})},orderBy:{publishedAt:"desc"},take:100,include:{organization:{select:{name:true,slug:true,type:true}}}});return jsonOk(listings);}catch(e){return handleApiError(e);}}
export async function POST(request:Request){
 try{
  const data=listingSchema.parse(await request.json());
  await orgAccess(data.organizationId);
  // Drafts are private: publish-time checks enforce all plan limits.
  // Rejecting a DRAFT here made the Save button fail for legitimate edits.
  const {date,...rest}=data;
  const listing=await prisma.marketplaceListing.create({data:{...rest,date:date?new Date(date):null,status:"DRAFT"}});
  return jsonOk(listing,201);
 }catch(e){return handleApiError(e);}
}
