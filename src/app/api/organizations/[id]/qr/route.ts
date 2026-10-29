import QRCode from "qrcode";
import { z } from "zod";

import { handleApiError, jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { findQrTarget, qrFileName, qrTargetUrl } from "@/lib/qr";
import { requireOrganizationAccess } from "@/lib/rbac";
import { getSubscription, hasFeature, isSubscriptionUsable } from "@/lib/subscription";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };
const querySchema = z.object({ziel:z.string().max(40).default("profile"),format:z.enum(["png","svg"]).default("png"),groesse:z.coerce.number().int().min(256).max(2048).default(1024)});

export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
    const access = await requireOrganizationAccess(id, "view");
    const organization = await prisma.organization.findUnique({where:{id:access.organizationId},select:{id:true,slug:true,type:true}});
    if (!organization) return jsonError("Organisation nicht gefunden.",404);
    const target=findQrTarget(query.ziel);if(!target)return jsonError("Unbekanntes QR-Ziel.",400);
    const subscription=await getSubscription(organization.id);
    const qrEligible=Boolean(subscription&&isSubscriptionUsable(subscription)&&(subscription.plan.tier==="PREMIUM"||subscription.plan.key==="pilot"));
    if(!qrEligible)return jsonError("QR-Codes sind für Premium- und Pilot-Abonnements verfügbar.",403);
    if(target.feature&&!hasFeature(subscription,target.feature))return jsonError("Dieses QR-Ziel ist im aktuellen Abonnement nicht enthalten.",403);
    const ziel=qrTargetUrl(organization,target);const gemeinsam={errorCorrectionLevel:"M" as const,margin:4};
    if(query.format==="svg"){const svg=await QRCode.toString(ziel,{...gemeinsam,type:"svg",width:query.groesse});return new Response(svg,{headers:{"Content-Type":"image/svg+xml; charset=utf-8","Content-Disposition":`attachment; filename="${qrFileName(organization.slug,target.key,"svg")}"`,"Cache-Control":"private, max-age=300"}})}
    const png=await QRCode.toBuffer(ziel,{...gemeinsam,width:query.groesse});return new Response(new Uint8Array(png),{headers:{"Content-Type":"image/png","Content-Disposition":`attachment; filename="${qrFileName(organization.slug,target.key,"png")}"`,"Cache-Control":"private, max-age=300"}});
  } catch(error){return handleApiError(error)}
}
