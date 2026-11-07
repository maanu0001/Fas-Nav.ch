import { BillingInterval, Prisma } from "@prisma/client";
import { z } from "zod";

import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireOrganizationAccess } from "@/lib/rbac";
import { stripePost } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const schema = z.object({ organizationId: z.string().cuid(), planId: z.string().cuid() });
type CheckoutSession = { id: string; url: string | null };

function recurringInterval(interval: BillingInterval) {
  if (interval === "MONTHLY") return "month";
  if (interval === "YEARLY") return "year";
  return null;
}

export async function POST(request: Request) {
  try {
    const body = await parseBody(request, schema);
    const access = await requireOrganizationAccess(body.organizationId, "manage");

    const [plan, organization, current] = await Promise.all([
      prisma.plan.findFirst({
        where: { id: body.planId, isActive: true, isPublic: true, priceChf: { gt: 0 } },
        select: { id: true, key: true, name: true, description: true, priceChf: true, currency: true, billingInterval: true },
      }),
      prisma.organization.findUnique({ where: { id: body.organizationId }, select: { id: true, name: true } }),
      prisma.subscription.findUnique({
        where: { organizationId: body.organizationId },
        select: { externalCustomerId: true, externalSubscriptionId: true, status: true },
      }),
    ]);

    if (!plan || !organization) return jsonError("Tarif oder Organisation nicht gefunden.", 404);
    if (current?.externalSubscriptionId && !["CANCELLED", "EXPIRED"].includes(current.status)) {
      return jsonError("Für diese Organisation besteht bereits ein aktives Stripe-Abo. So verhindern wir eine doppelte Belastung.", 409);
    }

    const interval = recurringInterval(plan.billingInterval);
    if (!interval) return jsonError("Dieser Tarif kann nicht als wiederkehrendes Stripe-Abo gebucht werden.", 422);

    const now = new Date();
    const old = await prisma.stripeCheckoutAttempt.findUnique({where:{organizationId:organization.id}});
    if (old?.expiresAt && old.expiresAt > now) {
      if (old.url && old.planId === plan.id) return jsonOk({url:old.url});
      return jsonError("Für diese Organisation läuft bereits eine Tarifbuchung. Bitte zuerst abschliessen oder den Ablauf abwarten.",409);
    }
    if (old) {
      await prisma.stripeCheckoutAttempt.deleteMany({where:{organizationId:organization.id,expiresAt:{lte:now}}});
    }
    const expiresAt = new Date(now.getTime() + 60*60_000);
    try {
      await prisma.stripeCheckoutAttempt.create({data:{organizationId:organization.id,planId:plan.id,expiresAt}});
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code==="P2002")
        return jsonError("Für diese Organisation wird bereits ein Checkout vorbereitet. Bitte erneut versuchen.",409);
      throw error;
    }
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://fas-nav.ch").replace(/\/$/, "");
    const params = new URLSearchParams();
    params.set("mode", "subscription");
    params.set("expires_at", String(Math.floor(expiresAt.getTime()/1000)));
    params.set("success_url", `${appUrl}/dashboard/abonnement?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
    params.set("cancel_url", `${appUrl}/dashboard/abonnement?checkout=cancelled`);
    params.set("client_reference_id", organization.id);
    params.set("locale", "de");
    params.set("billing_address_collection", "auto");
    params.set("phone_number_collection[enabled]", "true");
    params.set("allow_promotion_codes", "false");
    params.set("metadata[organizationId]", organization.id);
    params.set("metadata[planId]", plan.id);
    params.set("subscription_data[metadata][organizationId]", organization.id);
    params.set("subscription_data[metadata][planId]", plan.id);
    params.set("line_items[0][quantity]", "1");
    params.set("line_items[0][price_data][currency]", plan.currency.toLowerCase());
    params.set("line_items[0][price_data][unit_amount]", String(Math.round(Number(plan.priceChf) * 100)));
    params.set("line_items[0][price_data][recurring][interval]", interval);
    params.set("line_items[0][price_data][product_data][name]", `Fas-Nav ${plan.name}`);
    if (plan.description) params.set("line_items[0][price_data][product_data][description]", plan.description.slice(0, 500));

    if (current?.externalCustomerId) params.set("customer", current.externalCustomerId);
    else if (access.user.email) params.set("customer_email", access.user.email);

    try {
      const session = await stripePost<CheckoutSession>("/checkout/sessions", params);
      if (!session.url) throw new Error("Stripe hat keine Checkout-Adresse zurückgegeben.");
      await prisma.stripeCheckoutAttempt.update({where:{organizationId:organization.id},data:{url:session.url,sessionId:session.id}});
      return jsonOk({ url: session.url });
    } catch(error) {
      await prisma.stripeCheckoutAttempt.deleteMany({where:{organizationId:organization.id,sessionId:null}}).catch(()=>{});
      throw error;
    }
  } catch (error) {
    return handleApiError(error);
  }
}
