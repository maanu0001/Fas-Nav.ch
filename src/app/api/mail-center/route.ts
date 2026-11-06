import { z } from "zod";
import { randomBytes } from "node:crypto";
import { brandedHtml } from "@/lib/mail";
import { getEmailTemplate, renderEmailTemplate } from "@/lib/email-templates";
import { handleApiError,jsonError,jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { mailboxConfiguration,saveMailboxConfiguration,syncMailCenter,sendMailboxMail,deleteMailboxThreadMessages,testMailboxConnection } from "@/lib/mail-center-imap";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
export const dynamic="force-dynamic";
const configSchema=z.object({user:z.string().email().refine(v=>v.toLowerCase()==="info@fas-nav.ch"),password:z.string().max(1000).optional()});
const emailList=z.string().max(2000).refine(v=>!v||v.split(",").every(x=>z.string().email().safeParse(x.trim()).success),"Ungültige E-Mail-Adresse");
const sendSchema=z.object({to:emailList.refine(v=>!!v.trim(),"Empfänger fehlt"),cc:emailList.optional(),bcc:emailList.optional(),subject:z.string().min(1).max(250),text:z.string().min(1).max(50000),replyToId:z.string().max(500).optional(),attachments:z.array(z.object({name:z.string().min(1).max(160).refine(v=>!/[\r\n]/.test(v)),type:z.string().max(120),data:z.string().max(7_000_000).regex(/^[A-Za-z0-9+/]*={0,2}$/)})).max(5).optional()});
const ADDRESS_BLOCKLIST="mailcenter.hidden-addresses";
function recipientAddresses(messages:{sender:string;recipients:unknown}[],hidden:string[]){const addresses=new Set<string>();for(const m of messages){const r=(m.recipients||{}) as {to?:string;cc?:string;bcc?:string};for(const source of [m.sender,r.to,r.cc,r.bcc])for(const value of (source||"").split(",")){const address=value.trim().toLowerCase();if(z.string().email().safeParse(address).success&&address!=="info@fas-nav.ch"&&!hidden.includes(address))addresses.add(address);}}return Array.from(addresses).sort();}
export async function GET(request:Request){try{await requireAdmin();const email=(new URL(request.url).searchParams.get("email")||"").trim().toLowerCase();if(email&&!z.string().email().safeParse(email).success)return jsonError("Ungültige E-Mail-Adresse.",400);const matchedIds=email?await prisma.$queryRaw<{conversationId:string}[]>`SELECT DISTINCT "conversationId" FROM "mail_center_messages" WHERE lower("sender")=${email} OR lower("recipients"->>\'to\') LIKE ${"%"+email+"%"} OR lower("recipients"->>\'cc\') LIKE ${"%"+email+"%"} OR lower("recipients"->>\'bcc\') LIKE ${"%"+email+"%"}`:null;const [config,conversations,hiddenRow,contactMessages]=await Promise.all([mailboxConfiguration(),prisma.mailConversation.findMany({where:matchedIds?{id:{in:matchedIds.map(x=>x.conversationId)}}:{},orderBy:{lastMessageAt:"desc"},...(!matchedIds?{take:100}:{}),include:{messages:{orderBy:{receivedAt:"asc"},select:{id:true,providerId:true,sender:true,recipients:true,subject:true,textBody:true,direction:true,receivedAt:true,attachmentInfo:true,internetMessageId:true}}}}),prisma.siteSetting.findUnique({where:{key:ADDRESS_BLOCKLIST}}),prisma.mailCenterMessage.findMany({orderBy:{receivedAt:"desc"},take:2000,select:{sender:true,recipients:true}})]);const hidden=Array.isArray(hiddenRow?.value)?hiddenRow.value.filter((x):x is string=>typeof x==="string"):[];const tracking=await prisma.acquisitionOpen.findMany({where:{messageId:{in:conversations.flatMap(c=>c.messages.map(m=>m.internetMessageId).filter((id):id is string=>!!id))}},select:{messageId:true,openCount:true,lastOpenedAt:true,clickCount:true,lastClickedAt:true}});
return jsonOk({config,conversations,contacts:recipientAddresses(contactMessages,hidden),tracking});}catch(e){return handleApiError(e);}}
export async function POST(request:Request){try{const actor=await requireAdmin();const body=await request.json();if(body.action==="config"){const data=configSchema.parse(body);await saveMailboxConfiguration(data);await logAudit({userId:actor.id,userLabel:actor.email,action:"mailCenter.config",entity:"SiteSetting"});return jsonOk(await mailboxConfiguration());}
 if(body.action==="test"){if(!checkRateLimit("mail-test:"+actor.id,5,60000).ok)return jsonError("Bitte kurz warten.",429);return jsonOk(await testMailboxConnection());}
 if(body.action==="sync"){if(!checkRateLimit("mail-sync:"+actor.id,60,60000).ok)return jsonError("Bitte kurz warten.",429);return jsonOk(await syncMailCenter());}
 if(body.action==="resync"){if(!checkRateLimit("mail-full-sync:"+actor.id,2,3600000).ok)return jsonError("Bitte mit vollständigem Abgleich warten.",429);return jsonOk(await syncMailCenter({full:true}));}
 if(body.action==="acquisition"){
  if(!checkRateLimit("mail-acquisition:"+actor.id,8,3600000).ok)return jsonError("Akquise-Versandlimit erreicht. Bitte später erneut versuchen.",429);
  const input=z.object({to:z.string().email().max(254),type:z.enum(["CARNIVAL","GUGGE"]),organizationName:z.string().trim().max(120).optional()}).parse(body);
  if(input.to.toLowerCase()==="info@fas-nav.ch")return jsonError("Bitte eine externe Empfängeradresse verwenden.",400);
  const template=await getEmailTemplate(input.type==="CARNIVAL"?"acquisition_carnival":"acquisition_gugge");
  if(!template.enabled)return jsonError("Die Akquise-Vorlage ist deaktiviert.",400);
  const rendered=renderEmailTemplate(template,{organizationName:input.organizationName||"Ihre Organisation",websiteUrl:"https://fas-nav.ch"});
  const token=randomBytes(32).toString("hex");
  const base=(process.env.NEXT_PUBLIC_APP_URL||"https://fas-nav.ch").replace(/\/$/,"");
  const pixel=`<img src="${base}/api/mail-center/open/${token}.png" width="1" height="1" alt="" style="display:block;width:1px;height:1px" />`;
  const privacyNotice=`<p style="margin:12px 18px;text-align:center;color:#6b7280;font-size:10px;line-height:1.5">Diese Nachricht enthält eine technische Messung von E-Mail- und Linkaufrufen. <a href="https://fas-nav.ch/datenschutz" style="color:#374151">Datenschutzhinweise</a></p>`;
  const branded=brandedHtml(rendered.subject,rendered.text).replace("</body>",privacyNotice+"</body>");
  const tracked=branded.replace(/href="(https:\/\/(?:www\.)?fas-nav\.ch[^"]*)"/gi,(_match:string,url:string)=>`href="${base}/api/mail-center/link/${token}?to=${encodeURIComponent(url)}"`);
  const result=await sendMailboxMail({to:input.to,subject:rendered.subject,text:rendered.text,html:tracked.replace("</body>",pixel+"</body>"),acquisitionToken:token});
  await logAudit({userId:actor.id,userLabel:actor.email,action:"mailCenter.acquisition.send",entity:"MailCenterMessage",after:{recipient:input.to,type:input.type}});
  return jsonOk(result);
 }
 if(body.action==="send"){if(!checkRateLimit("mail-send:"+actor.id,20,60000).ok)return jsonError("Zu viele Nachrichten.",429);const data=sendSchema.parse(body);if(data.replyToId){const source=await prisma.mailCenterMessage.findUnique({where:{providerId:data.replyToId}});if(!source||source.direction!=="IN")return jsonError("Die Antwort gehört zu keiner eingegangenen Nachricht.",400);if(source.sender.toLowerCase()!==data.to.toLowerCase())return jsonError("Empfänger stimmt nicht mit der Nachricht überein.",400);}
 const result=await sendMailboxMail(data);await logAudit({userId:actor.id,userLabel:actor.email,action:"mailCenter.send",entity:"MailCenterMessage",after:{reply:Boolean(data.replyToId)}});return jsonOk(result);}
 if(body.action==="hide-contact"){const email=z.string().email().parse(body.email).toLowerCase();const current=await prisma.siteSetting.findUnique({where:{key:ADDRESS_BLOCKLIST}});const previous=Array.isArray(current?.value)?current.value.filter((v):v is string=>typeof v==="string"):[];const next=Array.from(new Set([...previous,email]));await prisma.siteSetting.upsert({where:{key:ADDRESS_BLOCKLIST},create:{key:ADDRESS_BLOCKLIST,group:"mail",value:next},update:{value:next}});await logAudit({userId:actor.id,userLabel:actor.email,action:"mailCenter.contact.hide",entity:"SiteSetting"});return jsonOk({ok:true});}
 if(body.action==="status"){const id=z.string().parse(body.id);const status=z.enum(["OPEN","IN_PROGRESS","DONE"]).parse(body.status);await prisma.mailConversation.update({where:{id},data:{status}});return jsonOk({ok:true});}
 if(body.action==="read"){const id=z.string().parse(body.id);const unread=z.boolean().optional().parse(body.unread)??false;await prisma.mailConversation.update({where:{id},data:{unread}});return jsonOk({ok:true});}
 if(body.action==="delete-permanent"){
  const id=z.string().parse(body.id);
  const conversation=await prisma.mailConversation.findUnique({where:{id},include:{messages:{select:{internetMessageId:true}}}});
  if(!conversation)return jsonError("Konversation nicht gefunden.",404);
  if(conversation.folder!=="TRASH")return jsonError("Nur Nachrichten im Papierkorb können endgültig gelöscht werden.",409);
  await deleteMailboxThreadMessages(conversation.messages.map(m=>m.internetMessageId).filter((id):id is string=>!!id));
  await prisma.$transaction(async tx=>{
    await tx.deletedMailThread.upsert({where:{threadKey:conversation.providerThreadId},create:{threadKey:conversation.providerThreadId},update:{}});
    await tx.acquisitionOpen.deleteMany({where:{messageId:{in:conversation.messages.map(m=>m.internetMessageId).filter((v):v is string=>!!v)}}});
    await tx.mailConversation.delete({where:{id}});
  });
  await logAudit({userId:actor.id,userLabel:actor.email,action:"mailCenter.delete.permanent",entity:"MailConversation",entityId:id});
  return jsonOk({deleted:true});
 }
 if(body.action==="folder"){const id=z.string().parse(body.id);const folder=z.enum(["INBOX","SENT","ARCHIVE","TRASH","AQUISE"]).parse(body.folder);await prisma.mailConversation.update({where:{id},data:{folder}});await logAudit({userId:actor.id,userLabel:actor.email,action:"mailCenter.folder",entity:"MailConversation",entityId:id,after:{folder}});return jsonOk({ok:true});}
 return jsonError("Ungültige Aktion.",400);
 }catch(e){return handleApiError(e);}}
