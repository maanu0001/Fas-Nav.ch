import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashToken,type Question } from "@/lib/season-survey";
import { handleApiError,jsonOk,jsonError } from "@/lib/api";
export const dynamic="force-dynamic";
type Params={params:Promise<{token:string}>};
export async function GET(_request:Request,{params}:Params){
 try{const {token}=await params;const invite=await prisma.surveyInvitation.findUnique({where:{tokenHash:hashToken(token)},include:{survey:true}});
 if(!invite||invite.survey.status!=="ACTIVE")return jsonError("Link ungültig oder Umfrage abgeschlossen.",404);
 return jsonOk({title:invite.survey.title,season:invite.survey.season,questions:invite.survey.questions,answered:!!invite.answeredAt,optedOut:!!invite.optedOutAt});}catch(e){return handleApiError(e);}
}
export async function POST(request:Request,{params}:Params){
 try{const {token}=await params;const invite=await prisma.surveyInvitation.findUnique({where:{tokenHash:hashToken(token)},include:{survey:true}});
 if(!invite||invite.survey.status!=="ACTIVE")return jsonError("Link ungültig.",404);
 if(invite.answeredAt||invite.optedOutAt)return jsonError("Bereits beantwortet oder abgemeldet.",409);
 const body=await request.json();
 if(body.optOut===true){await prisma.surveyInvitation.update({where:{id:invite.id},data:{optedOutAt:new Date()}});return jsonOk({ok:true});}
 const questions=invite.survey.questions as Question[];const answers=z.record(z.string(),z.union([z.string().max(3000),z.array(z.string().max(100)).max(20),z.number()])).parse(body.answers);
 const allowed=new Set(questions.map(q=>q.id));if(Object.keys(answers).some(k=>!allowed.has(k)))return jsonError("Unbekannte Frage.",400);
 for(const q of questions){const a=answers[q.id];if(a===undefined)continue;
 if(q.type==="rating"&&(!Number.isInteger(a)||typeof a!=="number"||a<1||a>5))return jsonError("Ungültige Bewertung.",400);
 if(q.type==="nps"&&(!Number.isInteger(a)||typeof a!=="number"||a<0||a>10))return jsonError("Ungültige Bewertung.",400);
 if(q.type==="single"&&(typeof a!=="string"||!q.options?.includes(a)))return jsonError("Ungültige Auswahl.",400);
 if(q.type==="multi"&&(!Array.isArray(a)||a.some(v=>!q.options?.includes(v))))return jsonError("Ungültige Auswahl.",400);
 if(q.type==="text"&&typeof a!=="string")return jsonError("Ungültiger Text.",400);
 }
 await prisma.$transaction(async tx=>{await tx.surveyResponse.create({data:{invitationId:invite.id,answers,revealIdentity:body.revealIdentity===true,contactConsent:body.contactConsent===true}});await tx.surveyInvitation.update({where:{id:invite.id},data:{answeredAt:new Date()}});});
 return jsonOk({ok:true});
 }catch(e){return handleApiError(e);}
}
