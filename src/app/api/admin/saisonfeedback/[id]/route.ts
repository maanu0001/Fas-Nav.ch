import { z } from "zod";
import { randomBytes } from "node:crypto";
import { hashToken } from "@/lib/season-survey";
import { sendMail } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { handleApiError,jsonOk,jsonError } from "@/lib/api";
import { deliverSurvey } from "@/lib/season-survey";
import { defaultQuestions } from "@/lib/season-survey-questions";
export const dynamic="force-dynamic";
type Params={params:Promise<{id:string}>};
export async function PATCH(request:Request,{params}:Params){
 try {await requireAdmin();const {id}=await params;const survey=await prisma.seasonSurvey.findUniqueOrThrow({where:{id}});
 const body=await request.json();
 if(body.action==="test"){
  const email=z.string().email().max(254).parse(body.email);
  if(survey.status==="CLOSED")return jsonError("Abgeschlossene Umfragen können nicht getestet werden.",409);
  const token=randomBytes(32).toString("hex");
  const invite=await prisma.surveyInvitation.create({data:{surveyId:id,organizationId:null,email,isTest:true,tokenHash:hashToken(token),sentAt:new Date()}});
  const link=(process.env.NEXT_PUBLIC_APP_URL||"https://fas-nav.ch").replace(/\/$/,"")+"/saisonfeedback/"+token;
  const result=await sendMail({to:email,subject:"Test: Saisonfeedback "+survey.season,text:"Hallo\n\nHier kannst du die Saisonfeedback-Umfrage testweise vollständig ausfüllen:\n"+link+"\n\nDie Testantwort wird in der Statistik nicht mitgezählt.\n\nFas-Nav.ch"});
  if(!result.sent){await prisma.surveyInvitation.delete({where:{id:invite.id}});return jsonError("Testmail konnte nicht verschickt werden. Bitte die SMTP-Einstellungen prüfen.",502);}
  return jsonOk({sent:true,email});
 }
 if(body.action==="prepare"){
 if(survey.status!=="DRAFT")return jsonError("Bereits gestartet.",400);
 const orgs=await prisma.organization.findMany({where:{status:"PUBLISHED",...(survey.audience==="ALL"?{}:{type:survey.audience as "GUGGE"|"CARNIVAL"})},select:{id:true,contactEmail:true,bookingEmail:true,memberships:{select:{user:{select:{email:true}}},take:1}}});
 let prepared=0;for(const org of orgs){const email=org.contactEmail||org.memberships[0]?.user.email||org.bookingEmail;if(!email)continue;
 await prisma.surveyInvitation.upsert({where:{surveyId_organizationId:{surveyId:id,organizationId:org.id}},create:{surveyId:id,organizationId:org.id,email,tokenHash:crypto.randomUUID()},update:{email}});prepared++;}
 return jsonOk({prepared});}
 if(body.action==="activate"){await prisma.seasonSurvey.update({where:{id},data:{status:"ACTIVE"}});return jsonOk({ok:true});}
 if(body.action==="close"){await prisma.seasonSurvey.update({where:{id},data:{status:"CLOSED"}});return jsonOk({ok:true});}
 if(body.action==="send"||body.action==="remind")return jsonOk(await deliverSurvey(id,body.action==="remind"));
 if(body.action==="edit"){if(survey.status!=="DRAFT")return jsonError("Nur Entwürfe können bearbeitet werden. Bereits versendete Fragebögen bleiben unverändert.",400);
 const parsed=z.object({title:z.string().min(3).max(120),season:z.string().min(4).max(20),audience:z.enum(["ALL","GUGGE","CARNIVAL"]),questions:z.array(z.object({id:z.string(),label:z.string(),type:z.enum(["rating","nps","single","multi","text"]),options:z.array(z.string()).optional()})).min(1).max(25)}).parse(body);
 await prisma.seasonSurvey.update({where:{id},data:parsed});return jsonOk({ok:true});}
 return jsonError("Unbekannte Aktion.",400);
 }catch(e){return handleApiError(e);}
}

export async function DELETE(_request:Request,{params}:Params){
 try{await requireAdmin();const {id}=await params;const survey=await prisma.seasonSurvey.findUniqueOrThrow({where:{id},include:{_count:{select:{invitations:true}}}});
 if(survey.status!=="DRAFT"||survey._count.invitations>0)return jsonError("Nur Umfrageentwürfe ohne Einladungen dürfen gelöscht werden, damit bestehende Antworten erhalten bleiben.",409);
 await prisma.seasonSurvey.delete({where:{id}});return jsonOk({deleted:true});
 }catch(e){return handleApiError(e);}
}
