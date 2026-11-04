import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { handleApiError,jsonOk,jsonError } from "@/lib/api";
import { defaultQuestions,deliverSurvey } from "@/lib/season-survey";
export const dynamic="force-dynamic";
const q=z.object({id:z.string().min(1).max(60),label:z.string().min(3).max(300),type:z.enum(["rating","nps","single","multi","text"]),options:z.array(z.string().min(1).max(100)).max(20).optional()});
export async function POST(request:Request){
 try {await requireAdmin();const body=await request.json();const parsed=z.object({title:z.string().min(3).max(120),season:z.string().min(4).max(20),audience:z.enum(["ALL","GUGGE","CARNIVAL"]),questions:z.array(q).min(1).max(25).default(defaultQuestions)}).parse(body);
 const survey=await prisma.seasonSurvey.create({data:parsed});return jsonOk(survey,201);}catch(e){return handleApiError(e);}
}
export async function GET(){try{await requireAdmin();return jsonOk(await prisma.seasonSurvey.findMany({orderBy:{createdAt:"desc"},include:{_count:{select:{invitations:true}}}}));}catch(e){return handleApiError(e);}}
