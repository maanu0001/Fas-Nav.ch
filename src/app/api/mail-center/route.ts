import { z } from "zod";
import { handleApiError,jsonError,jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { graphConfiguration,saveGraphConfiguration,syncMailCenter,sendGraphMail } from "@/lib/mail-center-graph";
import { checkRateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
export const dynamic="force-dynamic";
const configSchema=z.object({tenant:z.string().uuid(),clientId:z.string().uuid(),mailbox:z.string().email(),secret:z.string().min(1).max(1000).optional()});
const sendSchema=z.object({to:z.string().email(),subject:z.string().min(1).max(250),text:z.string().min(1).max(50000),replyToId:z.string().max(500).optional()});
export async function GET(){try{await requireAdmin();const [config,conversations]=await Promise.all([graphConfiguration(),prisma.mailConversation.findMany({orderBy:{lastMessageAt:"desc"},take:100,include:{messages:{orderBy:{receivedAt:"asc"},select:{id:true,providerId:true,sender:true,recipients:true,subject:true,textBody:true,direction:true,receivedAt:true,attachmentInfo:true}}}})]);return jsonOk({config,conversations});}catch(e){return handleApiError(e);}}
export async function POST(request:Request){try{const actor=await requireAdmin();const body=await request.json();if(body.action==="config"){const data=configSchema.parse(body);await saveGraphConfiguration(data);await logAudit({userId:actor.id,userLabel:actor.email,action:"mailCenter.config",entity:"SiteSetting"});return jsonOk(await graphConfiguration());}
 if(body.action==="sync"){if(!checkRateLimit("mail-sync:"+actor.id,12,60000).ok)return jsonError("Bitte kurz warten.",429);return jsonOk(await syncMailCenter());}
 if(body.action==="send"){if(!checkRateLimit("mail-send:"+actor.id,20,60000).ok)return jsonError("Zu viele Nachrichten.",429);const data=sendSchema.parse(body);if(data.replyToId){const source=await prisma.mailCenterMessage.findUnique({where:{providerId:data.replyToId}});if(!source||source.direction!=="IN")return jsonError("Die Antwort gehört zu keiner eingegangenen Nachricht.",400);if(source.sender.toLowerCase()!==data.to.toLowerCase())return jsonError("Empfänger stimmt nicht mit der Nachricht überein.",400);}
 await sendGraphMail(data);await logAudit({userId:actor.id,userLabel:actor.email,action:"mailCenter.send",entity:"MailCenterMessage",after:{reply:Boolean(data.replyToId)}});return jsonOk({sent:true});}
 if(body.action==="status"){const id=z.string().parse(body.id);const status=z.enum(["OPEN","IN_PROGRESS","DONE"]).parse(body.status);await prisma.mailConversation.update({where:{id},data:{status}});return jsonOk({ok:true});}
 if(body.action==="read"){const id=z.string().parse(body.id);await prisma.mailConversation.update({where:{id},data:{unread:false}});return jsonOk({ok:true});}
 return jsonError("Ungültige Aktion.",400);
 }catch(e){return handleApiError(e);}}
