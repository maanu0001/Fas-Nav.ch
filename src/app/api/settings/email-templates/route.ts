import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { EMAIL_TEMPLATE_IDS, type EmailTemplateId } from "@/lib/email-template-config";
import { getEmailTemplates, saveEmailTemplates } from "@/lib/email-templates";
import { requirePermission } from "@/lib/rbac";

export const dynamic="force-dynamic";
export async function GET(){try{await requirePermission("manageSettings");return jsonOk(await getEmailTemplates());}catch(e){return handleApiError(e);}}
export async function PUT(request:Request){try{
 const actor=await requirePermission("manageSettings");
 const raw=await request.json().catch(()=>null) as {templates?:Array<{id?:string;enabled?:unknown;subject?:unknown;body?:unknown}>}|null;
 if(!raw?.templates||!Array.isArray(raw.templates))return jsonError("Ungültige Vorlagen.",422);
 const templates=[] as Array<{id:EmailTemplateId;enabled:boolean;subject:string;body:string}>;
 for(const item of raw.templates){if(!item.id||!EMAIL_TEMPLATE_IDS.includes(item.id as EmailTemplateId)||typeof item.enabled!=="boolean"||typeof item.subject!=="string"||typeof item.body!=="string"||!item.subject.trim()||item.subject.length>300||!item.body.trim()||item.body.length>8000)return jsonError("Eine E-Mail-Vorlage ist ungültig.",422);templates.push({id:item.id as EmailTemplateId,enabled:item.enabled,subject:item.subject.trim(),body:item.body.trim()});}
 await saveEmailTemplates(templates);
 await logAudit({userId:actor.id,userLabel:actor.email,action:"settings.emailTemplates.update",entity:"SiteSetting",entityLabel:"E-Mail-Vorlagen",after:{templates:templates.map(t=>({id:t.id,enabled:t.enabled}))}});
 return jsonOk(await getEmailTemplates());
 }catch(e){return handleApiError(e);}}
