import { z } from "zod";
import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireOrganizationAccess } from "@/lib/rbac";
import { stripeConfigured, stripePost } from "@/lib/stripe";
export const dynamic="force-dynamic";
const schema=z.object({organizationId:z.string().cuid()});
export async function POST(request:Request){
 try{
  const body=await parseBody(request,schema);
  await requireOrganizationAccess(body.organizationId,"manage");
  const sub=await prisma.subscription.findUnique({where:{organizationId:body.organizationId},select:{externalCustomerId:true,externalSubscriptionId:true,status:true}});
  if(!sub?.externalCustomerId||!sub.externalSubscriptionId||["CANCELLED","EXPIRED"].includes(sub.status))return jsonError("Kein verwaltbares Stripe-Abo gefunden.",409);
  if(!stripeConfigured())return jsonError("Online-Zahlungen sind noch nicht konfiguriert.",503);
  const appUrl=(process.env.NEXT_PUBLIC_APP_URL||"https://fas-nav.ch").replace(/\/$/,"");
  const params=new URLSearchParams({customer:sub.externalCustomerId,return_url:appUrl+"/dashboard/abonnement"});
  const session=await stripePost<{url:string}>("/billing_portal/sessions",params);
  if(!session.url||!session.url.startsWith("https://"))return jsonError("Das Stripe-Kundenportal konnte nicht geöffnet werden.",502);
  return jsonOk({url:session.url});
 }catch(error){return handleApiError(error);}
}
