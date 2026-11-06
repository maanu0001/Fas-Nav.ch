import type{Metadata}from"next";
import{DashboardFilters}from"@/components/dashboard/filter-form";
import{PageHeader}from"@/components/dashboard/page-header";
import{PaymentManager}from"@/components/dashboard/payment-manager";
import { Pagination } from "@/components/ui/pagination";
import{StatCard,StatGrid}from"@/components/dashboard/stat-card";
import{PAYMENT_STATUS_LABELS}from"@/lib/constants";
import{requirePermissionPage}from"@/lib/dashboard-context";
import{prisma}from"@/lib/prisma";
import{formatChf}from"@/lib/utils";
import type{Prisma,PaymentMethod}from"@prisma/client";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";

export const dynamic="force-dynamic";export const metadata:Metadata={title:"Zahlungen"};type SearchParams=Promise<Record<string,string|undefined>>;
export default async function PaymentsPage({searchParams}:{searchParams:SearchParams}){
 await requirePermissionPage("managePayments");const params=await searchParams;const page=Math.max(1,Math.min(10000,Number(params.page)||1));const perPage=100;const where:Prisma.PaymentWhereInput={...(params.method&&params.method in PAYMENT_METHOD_LABELS?{method:params.method as PaymentMethod}:{}),...(params.status?{status:params.status as never}:{}),...(params.q?{OR:[{invoiceNumber:{contains:params.q,mode:"insensitive"}},{organization:{name:{contains:params.q,mode:"insensitive"}}}]}:{})};
 const[payments,organizations,plans,settings,paid,pendingSum,total]=await Promise.all([
  prisma.payment.findMany({where,orderBy:{issuedAt:"desc"},skip:(page-1)*perPage,take:perPage,select:{id:true,invoiceNumber:true,amountChf:true,status:true,method:true,externalId:true,issuedAt:true,dueAt:true,paidAt:true,organization:{select:{id:true,name:true,memberships:{where:{user:{isActive:true}},select:{role:true,title:true,user:{select:{id:true,name:true,email:true}}},orderBy:{createdAt:"asc"}}}}}}),
  prisma.organization.findMany({select:{id:true,name:true,subscription:{select:{id:true,priceChf:true,planId:true}}},orderBy:{name:"asc"},take:500}),
  prisma.plan.findMany({where:{isActive:true},select:{id:true,name:true,key:true,priceChf:true,billingInterval:true},orderBy:{sortOrder:"asc"}}),
  prisma.siteSetting.findMany({where:{key:{in:["billing.dueDays","billing.referencePrefix","billing.defaultNotes"]}},select:{key:true,value:true}}),
  prisma.payment.aggregate({where:{status:"PAID"},_sum:{amountChf:true},_count:true}),prisma.payment.aggregate({where:{status:"PENDING"},_sum:{amountChf:true},_count:true}),prisma.payment.count({where})
 ]);
 const sm=new Map(settings.map(s=>[s.key,s.value]));
 const totalPages=Math.max(1,Math.ceil(total/perPage));
 const buildHref=(p:number)=>{const query=new URLSearchParams();for(const [key,value] of Object.entries(params)){if(value&&key!=="page")query.set(key,value);}query.set("page",String(p));return "/dashboard/zahlungen?"+query.toString();};
 return <><PageHeader title="Zahlungen" description="Alle Zahlungen an einem Ort: Stripe-Transaktionen, Bank/TWINT und selbst erstellte Rechnungen. Filterbar nach Zahlungsart."/><StatGrid><StatCard label="Bezahlt" value={formatChf(Number(paid._sum.amountChf??0))} hint={`${paid._count} Rechnungen`} icon="wallet" tone="success"/><StatCard label="Offen" value={formatChf(Number(pendingSum._sum.amountChf??0))} hint={`${pendingSum._count} Rechnungen`} icon="wallet" tone={pendingSum._count>0?"warning":"default"}/></StatGrid><div className="mt-6"><DashboardFilters searchPlaceholder="Rechnungsnummer oder Organisation …" filters={[{name:"status",label:"Status",options:Object.entries(PAYMENT_STATUS_LABELS).map(([value,label])=>({value,label}))},{name:"method",label:"Zahlungsweg",options:Object.entries(PAYMENT_METHOD_LABELS).map(([value,label])=>({value,label}))}]}/></div><PaymentManager payments={payments.map(p=>({...p,amountChf:Number(p.amountChf),issuedAt:p.issuedAt.toISOString(),dueAt:p.dueAt?.toISOString()??null,paidAt:p.paidAt?.toISOString()??null,organization:{id:p.organization.id,name:p.organization.name,recipients:p.organization.memberships.map(m=>({id:m.user.id,name:m.user.name,email:m.user.email,role:m.title||m.role}))}}))} organizations={organizations.map(o=>({id:o.id,name:o.name,subscriptionId:o.subscription?.id??null,planId:o.subscription?.planId??null,priceChf:Number(o.subscription?.priceChf??0)}))} plans={plans.map(p=>({...p,priceChf:Number(p.priceChf)}))} defaults={{dueDays:Number(sm.get("billing.dueDays")??30),referencePrefix:String(sm.get("billing.referencePrefix")??""),defaultNotes:String(sm.get("billing.defaultNotes")??"")}}/><div className="mt-5"><Pagination page={page} totalPages={totalPages} buildHref={buildHref}/><p className="mt-2 text-xs text-muted-foreground">{total} Zahlungen insgesamt · {perPage} pro Seite · Stripe- und manuelle Zahlungen in einer Übersicht</p></div></>;
}
