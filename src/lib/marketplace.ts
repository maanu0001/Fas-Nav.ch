import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser,AuthError,isStaff } from "@/lib/rbac";
export const categories=["AUFTRITTE","KOSTUEME","INSTRUMENTE"] as const;
export const labels:Record<string,string>={AUFTRITTE:"Auftritte",KOSTUEME:"Kostüme",INSTRUMENTE:"Instrumente"};
export const listingSchema=z.object({organizationId:z.string().min(1),title:z.string().trim().min(5).max(120),description:z.string().trim().min(20).max(5000),category:z.enum(categories),listingType:z.enum(["SUCHE","BIETE"]),city:z.string().trim().min(2).max(100),canton:z.string().max(60).optional().nullable(),price:z.number().int().min(0).max(10000000).nullable().optional(),date:z.string().datetime().nullable().optional(),imageUrls:z.array(z.string().url().max(1000)).max(8).default([]),details:z.record(z.string(),z.union([z.string().max(500),z.number(),z.boolean(),z.object({mode:z.enum(["INTERNAL","EXTERNAL","BOTH"]),email:z.string().max(254).refine(v=>!v||z.string().email().safeParse(v).success),phone:z.string().max(30).regex(/^[+0-9 ()-]*$/)}).refine(v=>v.mode==="INTERNAL"||!!v.email||!!v.phone)])).optional()});
export async function orgAccess(orgId:string){const user=await requireUser();if(isStaff(user.role))return user;const m=await prisma.membership.findUnique({where:{userId_organizationId:{userId:user.id,organizationId:orgId}}});if(!m||!["OWNER","MANAGER","EDITOR"].includes(m.role))throw new AuthError("Kein Zugriff auf diese Organisation.",403);return user;}
export function activeFilter(){return {status:"ACTIVE",expiresAt:{gt:new Date()}} as const;}
