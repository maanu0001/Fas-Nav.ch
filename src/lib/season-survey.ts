import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
export type Question={id:string;label:string;type:"rating"|"nps"|"single"|"multi"|"text";options?:string[]};
export const defaultQuestions:Question[]=[
{id:"satisfaction",label:"Wie zufrieden seid ihr insgesamt mit FAS-NAV?",type:"rating"},
{id:"usability",label:"Wie einfach war die Verwaltung eurer Organisationsseite?",type:"rating"},
{id:"used",label:"Welche Funktionen habt ihr genutzt?",type:"multi",options:["Profil","Agenda","Galerie","Hörproben","Statistiken","Social Media Studio"]},
{id:"valuable",label:"Welche Funktion war am wertvollsten?",type:"single",options:["Profil","Agenda","Galerie","Hörproben","Statistiken","Social Media Studio"]},
{id:"issues",label:"Was hat euch gefehlt oder gestört?",type:"text"},
{id:"wishes",label:"Welche Funktionen wünscht ihr euch?",type:"multi",options:["Mehr Sichtbarkeit","Event-Promotion","Besucherstatistiken","Profilgestaltung","Weitere Integrationen"]},
{id:"recommend",label:"Wie wahrscheinlich ist es, dass ihr FAS-NAV weiterempfehlt?",type:"nps"},
{id:"comments",label:"Weitere Ideen und Anregungen",type:"text"}
];
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
