import { z } from "zod";
import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { generateInvoicePdf, loadInvoice } from "@/lib/invoice";
import { sendMail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";

export const dynamic="force-dynamic";
type Params={params:Promise<{id:string}>};
const schema=z.object({userId:z.string().cuid(),subject:z.string().trim().min(1).max(300).optional(),text:z.string().trim().min(1).max(8000).optional()});
const money=(n:number)=>`CHF ${n.toLocaleString("de-CH",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const date=(d:Date|null)=>d?new Intl.DateTimeFormat("de-CH",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Europe/Zurich"}).format(d):null;

export async function POST(request:Request,{params}:Params){
 try{
  const actor=await requirePermission("managePayments");const{id}=await params;const body=await parseBody(request,schema);const data=await loadInvoice(id);if(!data)return jsonError("Rechnung nicht gefunden.",404);
  const membership=await prisma.membership.findFirst({where:{organizationId:data.invoice.organization?undefined:undefined}}).catch(()=>null);
  void membership;
  const recipient=await prisma.user.findFirst({where:{id:body.userId,isActive:true,memberships:{some:{organization:{payments:{some:{id}}}}}},select:{id:true,name:true,email:true}});
  if(!recipient)return jsonError("Die gewählte Person ist für diese Organisation nicht berechtigt.",422);
  let pdf:Buffer;try{pdf=await generateInvoicePdf(data.invoice,data.settings)}catch(error){return jsonError(error instanceof Error?error.message:"Rechnung konnte nicht erstellt werden.",422)}
  const subject=body.subject??`Rechnung ${data.invoice.invoiceNumber} von Fas-Nav.ch`;
  const due=date(data.invoice.dueAt);
  const text=body.text??`Guten Tag ${recipient.name}\n\nim Anhang erhältst du die Rechnung ${data.invoice.invoiceNumber} von Fas-Nav.ch über ${money(data.invoice.amountChf)}.${due?` Die Rechnung ist zahlbar bis ${due}.`:""}\n\nVielen Dank.\n\nFreundliche Grüsse\nFas-Nav.ch`;
  const result=await sendMail({to:recipient.email,subject,text,attachments:[{filename:`${data.invoice.invoiceNumber}.pdf`,content:pdf,contentType:"application/pdf"}]});
  if(!result.sent)return jsonError(result.message??"Die Rechnung konnte nicht per E-Mail gesendet werden.",502);
  await logAudit({userId:actor.id,userLabel:actor.email,action:"payment.invoice.email",entity:"Payment",entityId:data.invoice.id,entityLabel:data.invoice.invoiceNumber,after:{recipientUserId:recipient.id,recipientEmail:recipient.email}});
  return jsonOk({sent:true});
 }catch(error){return handleApiError(error)}
}
