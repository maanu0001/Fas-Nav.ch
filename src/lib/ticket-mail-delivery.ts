import { getEmailTemplate,renderEmailTemplate } from "@/lib/email-templates";
import { getMailSettings } from "@/lib/mail-settings";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/rbac";
import { absoluteUrl } from "@/lib/utils";
import { messagePreview,ticketMailHtml } from "@/lib/ticket-mail";
import type { MailMessage } from "@/lib/mail";
import type { NotifyRecipient } from "@/lib/notifications";
export type TicketMailContext={ticketId:string;ticketNumber:number;ticketSubject:string;organizationName:string|null;senderName:string;messageBody:string};
function values(context:TicketMailContext,name:string){return{recipientName:name,ticketNumber:String(context.ticketNumber),ticketTitle:context.ticketSubject,senderName:context.senderName,ticketUrl:absoluteUrl(`/dashboard/tickets/${context.ticketId}`),organizationName:context.organizationName??"",messagePreview:messagePreview(context.messageBody),siteName:"Fas-Nav.ch",siteUrl:absoluteUrl("/")};}
export async function ticketReplyMailFor(context:TicketMailContext):Promise<(recipient:{name:string;ticketEmails:boolean})=>Omit<MailMessage,"to">|null>{const template=await getEmailTemplate("ticket_reply");return recipient=>{if(!template.enabled||!recipient.ticketEmails)return null;const v=values(context,recipient.name);const rendered=renderEmailTemplate(template,v);return{...rendered,html:ticketMailHtml({body:rendered.text,ticketUrl:v.ticketUrl})};};}
export async function ticketReplyNotifyMail(context:TicketMailContext):Promise<(recipient:NotifyRecipient)=>Omit<MailMessage,"to">|null>{return ticketReplyMailFor(context);}
export async function staffMailTarget(ticket:{assigneeId:string|null}):Promise<{to:string;name:string}|null>{const template=await getEmailTemplate("ticket_reply");if(!template.enabled)return null;if(ticket.assigneeId){const assignee=await prisma.user.findFirst({where:{id:ticket.assigneeId,isActive:true,role:{in:STAFF_ROLES},ticketEmails:true},select:{email:true,name:true}});if(assignee?.email)return{to:assignee.email,name:assignee.name};}const settings=await getMailSettings();const to=settings.ticketRecipient.trim();return to?{to,name:"Fas-Nav.ch Team"}:null;}
export async function staffTicketMail(context:TicketMailContext,target:{to:string;name:string}):Promise<MailMessage>{const template=await getEmailTemplate("ticket_reply");const v=values(context,target.name);const rendered=renderEmailTemplate(template,v);return{to:target.to,...rendered,html:ticketMailHtml({body:rendered.text,ticketUrl:v.ticketUrl})};}
