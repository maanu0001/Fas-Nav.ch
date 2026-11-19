import {z} from "zod";
import {handleApiError,jsonError,jsonOk,parseBody} from "@/lib/api";
import {prisma} from "@/lib/prisma";
import {requireOrganizationAccess} from "@/lib/rbac";
import {stripeConfigured,stripeGet,stripePost} from "@/lib/stripe";
export const dynamic="force-dynamic";
const schema=z.object({organizationId:z.string().cuid(),planId:z.string().cuid(),confirm:z.boolean().default(false)});
type Remote={id:string;status:string;cancel_at_period_end:boolean;schedule:string|null;current_period_start:number;current_period_end:number;items:{data:{id:string;price:{id:string;product:string;currency:string;recurring:{interval:string}}}[]}};
export async function POST(request:Request){
 try{
 const input=await parseBody(request,schema);
 await requireOrganizationAccess(input.organizationId,"manage");
 if(!stripeConfigured())return jsonError("Stripe nicht konfiguriert.",503);
 const [sub,plan]=await Promise.all([prisma.subscription.findUnique({where:{organizationId:input.organizationId},include:{plan:true}}),prisma.plan.findFirst({where:{id:input.planId,isActive:true,isPublic:true,priceChf:{gt:0}}})]);
 if(!sub?.externalSubscriptionId||!sub.externalCustomerId||sub.status!=="ACTIVE"||!plan||sub.planId===plan.id)return jsonError("Kein gültiger Tarifwechsel möglich.",409);
 if(plan.billingInterval!==sub.plan.billingInterval||plan.currency.toLowerCase()!==sub.plan.currency.toLowerCase())return jsonError("Tarifwechsel zwischen Laufzeiten oder Währungen benötigt Beratung.",422);
 const remote=await stripeGet<Remote>("/subscriptions/"+encodeURIComponent(sub.externalSubscriptionId));
 if(remote.status!=="active"||remote.cancel_at_period_end||remote.schedule||remote.items.data.length!==1)return jsonError("Dieses Abo kann derzeit nicht automatisch gewechselt werden.",409);
 const item=remote.items.data[0],interval=plan.billingInterval==="MONTHLY"?"month":plan.billingInterval==="YEARLY"?"year":null;
 if(!interval||item.price.recurring.interval!==interval||item.price.currency!==plan.currency.toLowerCase())return jsonError("Abrechnungsdaten stimmen nicht überein.",409);
 const cents=Math.round(Number(plan.priceChf)*100),upgrade=Number(plan.priceChf)>Number(sub.priceChf);
 if(!input.confirm){
  if(!upgrade)return jsonOk({kind:"DOWNGRADE",amountDue:0,currency:plan.currency,renewalAt:remote.current_period_end});
  const p=new URLSearchParams({customer:sub.externalCustomerId,subscription:remote.id,"subscription_details[items][0][id]":item.id,"subscription_details[items][0][price_data][currency]":plan.currency.toLowerCase(),"subscription_details[items][0][price_data][unit_amount]":String(cents),"subscription_details[items][0][price_data][recurring][interval]":interval,"subscription_details[items][0][price_data][product]":item.price.product,"subscription_details[proration_behavior]":"always_invoice"});
  const preview=await stripePost<{amount_due:number;currency:string}>("/invoices/create_preview",p);
  return jsonOk({kind:"UPGRADE",amountDue:preview.amount_due,currency:preview.currency,renewalAt:remote.current_period_end});
 }
 const price=await stripePost<{id:string}>("/prices",new URLSearchParams({product:item.price.product,currency:plan.currency.toLowerCase(),unit_amount:String(cents),"recurring[interval]":interval}));
 if(upgrade){
  const p=new URLSearchParams({"items[0][id]":item.id,"items[0][price]":price.id,proration_behavior:"always_invoice",payment_behavior:"pending_if_incomplete","metadata[organizationId]":input.organizationId,"metadata[planId]":plan.id});
  const changed=await stripePost<{pending_update?:unknown}>("/subscriptions/"+encodeURIComponent(remote.id),p);
  return jsonOk({kind:"UPGRADE",pending:Boolean(changed.pending_update)});
 }
 const schedule=await stripePost<{id:string}>("/subscription_schedules",new URLSearchParams({from_subscription:remote.id}));
 const p=new URLSearchParams({end_behavior:"release",proration_behavior:"none","phases[0][start_date]":String(remote.current_period_start),"phases[0][end_date]":String(remote.current_period_end),"phases[0][items][0][price]":item.price.id,"phases[0][items][0][quantity]":"1","phases[1][start_date]":String(remote.current_period_end),"phases[1][iterations]":"1","phases[1][items][0][price]":price.id,"phases[1][items][0][quantity]":"1","phases[1][metadata][organizationId]":input.organizationId,"phases[1][metadata][planId]":plan.id});
 try{await stripePost("/subscription_schedules/"+encodeURIComponent(schedule.id),p);}catch(e){await stripePost("/subscription_schedules/"+encodeURIComponent(schedule.id)+"/release",new URLSearchParams()).catch(()=>{});throw e;}
 return jsonOk({kind:"DOWNGRADE",scheduled:true,renewalAt:remote.current_period_end});
 }catch(e){return handleApiError(e);}
}
