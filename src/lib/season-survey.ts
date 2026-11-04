import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { defaultQuestions } from "@/lib/season-survey-questions";
export function hashToken(token:string){return createHash("sha256").update(token).digest("hex");}
export async function deliverSurvey(surveyId:string,reminder=false){
 const survey=await prisma.seasonSurvey.findUniqueOrThrow({where:{id:surveyId}});
 if(survey.status!=="ACTIVE")throw new Error("Nur aktive Umfragen können versendet werden.");
 const invitations=await prisma.surveyInvitation.findMany({where:{surveyId,answeredAt:null,optedOutAt:null,...(reminder?{sentAt:{lte:new Date(Date.now()-7*86400000)},reminderSentAt:null}:{sentAt:null})},take:100});
 let sent=0,failed=0;
 for(const inv of invitations){
  // Tokens are not stored in plaintext. Generate a new link for each delivery.
  const token=randomBytes(32).toString("hex");
  const link=(process.env.NEXT_PUBLIC_APP_URL??"https://fas-nav.ch").replace(/\/$/,"")+"/saisonfeedback/"+token;
  const result=await sendMail({to:inv.email,subject:(reminder?"Erinnerung: ":"")+"FAS-NAV Saisonfeedback "+survey.season,text:"Hallo\n\nWir freuen uns über euer Feedback zur vergangenen Fasnacht. Die Umfrage dauert etwa 3–5 Minuten:\n"+link+"\n\nFalls ihr nicht teilnehmen möchtet, könnt ihr euch über denselben Link abmelden.\n\nFreundliche Grüsse\nFAS-NAV"});
  if(result.sent){await prisma.surveyInvitation.update({where:{id:inv.id},data:{tokenHash:hashToken(token),...(reminder?{reminderSentAt:new Date()}:{sentAt:new Date()})}});sent++;}else failed++;
 }
 return {sent,failed,remaining:invitations.length===100};
}
