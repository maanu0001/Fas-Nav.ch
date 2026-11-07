import { NextResponse } from "next/server";
import { Prisma, type PaymentStatus, type SubscriptionStatus } from "@prisma/client";

import { notifyOrganization } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { stripeGet, stripeId, verifyStripeWebhook } from "@/lib/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type StripeObject = Record<string, any>;

function dateFromUnix(value: unknown): Date | null { return typeof value === "number" && Number.isFinite(value) ? new Date(value * 1000) : null; }
function subscriptionStatus(status: unknown): SubscriptionStatus { if (status === "active" || status === "trialing") return "ACTIVE"; if (status === "canceled") return "CANCELLED"; if (status === "paused") return "SUSPENDED"; return "PAYMENT_PENDING"; }
function metadata(object: StripeObject) { const meta = object.metadata && typeof object.metadata === "object" ? object.metadata : {}; return { organizationId: typeof meta.organizationId === "string" ? meta.organizationId : null, planId: typeof meta.planId === "string" ? meta.planId : null }; }

async function syncSubscription(object: StripeObject) {
  const externalSubscriptionId = stripeId(object.id); const externalCustomerId = stripeId(object.customer); const meta = metadata(object);
  let local = externalSubscriptionId ? await prisma.subscription.findFirst({ where: { externalSubscriptionId }, include: { plan: true } }) : null;
  if (!local && meta.organizationId) local = await prisma.subscription.findUnique({ where: { organizationId: meta.organizationId }, include: { plan: true } });
  const planId = meta.planId || local?.planId; const organizationId = meta.organizationId || local?.organizationId;
  if (!planId || !organizationId || !externalSubscriptionId) return null;
  const plan = local && local.planId === planId ? local.plan : await prisma.plan.findUnique({ where: { id: planId } }); if (!plan) return null;
  const startDate = dateFromUnix(object.current_period_start) || local?.startDate || new Date(); const endDate = dateFromUnix(object.current_period_end) || local?.endDate || null; const status = subscriptionStatus(object.status);
  return prisma.subscription.upsert({ where: { organizationId }, create: { organizationId, planId, priceChf: plan.priceChf, status, startDate, endDate, nextDueAt: endDate, autoRenew: object.cancel_at_period_end !== true, cancelledAt: status === "CANCELLED" ? new Date() : null, externalCustomerId, externalSubscriptionId }, update: { planId, priceChf: plan.priceChf, status, startDate, endDate, nextDueAt: endDate, autoRenew: object.cancel_at_period_end !== true, cancelledAt: status === "CANCELLED" ? new Date() : null, externalCustomerId: externalCustomerId || undefined, externalSubscriptionId, expiringNotifiedAt: null, expiredNotifiedAt: null }, include: { plan: true } });
}

async function handleCheckout(object: StripeObject) {
  if (object.mode !== "subscription") return; const externalSubscriptionId = stripeId(object.subscription); const externalCustomerId = stripeId(object.customer); const meta = metadata(object); if (!externalSubscriptionId || !meta.organizationId || !meta.planId) return;
  const plan = await prisma.plan.findUnique({ where: { id: meta.planId } }); if (!plan) return;
  await prisma.subscription.upsert({ where: { organizationId: meta.organizationId }, create: { organizationId: meta.organizationId, planId: plan.id, priceChf: plan.priceChf, status: object.payment_status === "paid" ? "ACTIVE" : "PAYMENT_PENDING", externalCustomerId, externalSubscriptionId }, update: { planId: plan.id, priceChf: plan.priceChf, status: object.payment_status === "paid" ? "ACTIVE" : "PAYMENT_PENDING", externalCustomerId: externalCustomerId || undefined, externalSubscriptionId, cancelledAt: null, autoRenew: true, expiringNotifiedAt: null, expiredNotifiedAt: null } });
}
function invoiceSubscriptionId(object: StripeObject) { return stripeId(object.subscription) || stripeId(object.parent?.subscription_details?.subscription) || stripeId(object.lines?.data?.[0]?.parent?.subscription_item_details?.subscription); }

async function handleInvoice(object: StripeObject, paid: boolean) {
  const invoiceId = stripeId(object.id); if (!invoiceId) return; const externalSubscriptionId = invoiceSubscriptionId(object); if (!externalSubscriptionId) return;
  let subscription = await prisma.subscription.findFirst({ where: { externalSubscriptionId }, include: { organization: { select: { name: true } } } });
  if (!subscription) {
    // Stripe invoice events may precede checkout/subscription webhooks.
    const remote = await stripeGet<StripeObject>(`/subscriptions/${encodeURIComponent(externalSubscriptionId)}`);
    await syncSubscription(remote);
    subscription = await prisma.subscription.findFirst({ where: { externalSubscriptionId }, include: { organization: { select: { name: true } } } });
  }
  if (!subscription) throw new Error(`Stripe-Rechnung ${invoiceId}: Zugehöriges Abonnement konnte nicht aufgelöst werden.`);
  const firstLine = object.lines?.data?.[0]; const periodStart = dateFromUnix(firstLine?.period?.start); const periodEnd = dateFromUnix(firstLine?.period?.end); const amount = Number(paid ? object.amount_paid : object.amount_due) / 100; const status: PaymentStatus = paid ? "PAID" : "FAILED";
  const invoiceLabel = typeof object.number === "string" && object.number ? object.number : invoiceId; const invoiceNumber = `STRIPE-${invoiceLabel}`.slice(0, 120); const existing = await prisma.payment.findFirst({ where: { externalId: invoiceId } });
  const wasPaid = existing?.status === "PAID";
  if (!paid && wasPaid) return; // Late failed-payment events never undo a settled invoice.
  const payment = existing ? await prisma.payment.update({ where: { id: existing.id }, data: { status, amountChf: amount, paidAt: paid ? new Date() : null, periodStart, periodEnd } }) : await prisma.payment.create({ data: { organizationId: subscription.organizationId, subscriptionId: subscription.id, invoiceNumber, amountChf: amount, status, method: "STRIPE", paidAt: paid ? new Date() : null, periodStart, periodEnd, externalId: invoiceId, reference: typeof object.number === "string" ? object.number : null, notes: "Automatisch über Stripe verbucht." } });
  if (paid) { await prisma.subscription.update({ where: { id: subscription.id }, data: { status: "ACTIVE", lastPaymentAt: payment.paidAt || new Date(), ...(periodStart ? { startDate: periodStart } : {}), ...(periodEnd ? { endDate: periodEnd, nextDueAt: periodEnd } : {}), expiredNotifiedAt: null, expiringNotifiedAt: null } }); if (!wasPaid) await notifyOrganization(subscription.organizationId, { type: "PAYMENT_RECEIVED", title: "Stripe-Zahlung erfolgreich", body: `CHF ${amount.toFixed(2)} wurden für ${subscription.organization.name} verbucht.`, link: "/dashboard/abonnement" }); }
  else { await prisma.subscription.update({ where: { id: subscription.id }, data: { status: "PAYMENT_PENDING" } }); if (!existing || existing.status !== "FAILED") await notifyOrganization(subscription.organizationId, { type: "PAYMENT_DUE", title: "Stripe-Zahlung fehlgeschlagen", body: `Die Zahlung über CHF ${amount.toFixed(2)} konnte nicht abgeschlossen werden.`, link: "/dashboard/abonnement" }); }
}

async function handleRefund(charge: StripeObject) {
  // Stripe charge.refunded includes the invoice ID for subscription charges.
  const invoiceId = stripeId(charge.invoice);
  const amount = Number(charge.amount);
  const refunded = Number(charge.amount_refunded);
  if (!invoiceId || !Number.isFinite(amount) || amount <= 0 || refunded < amount) return;
  const payment = await prisma.payment.findFirst({ where: { externalId: invoiceId, method: "STRIPE" } });
  if (!payment || payment.status === "REFUNDED") return;
  await prisma.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
}

export async function POST(request: Request) {
  const payload = await request.text();
  let event: ReturnType<typeof verifyStripeWebhook>;
  try {
    event = verifyStripeWebhook(payload, request.headers.get("stripe-signature"));
  } catch (error) {
    console.warn("[stripe-webhook] Ungültige Signatur:", error);
    return NextResponse.json({ error: "Ungültige Signatur." }, { status: 400 });
  }

  if (!event.id || typeof event.id !== "string") {
    return NextResponse.json({ error: "Fehlende Ereignis-ID." }, { status: 400 });
  }
  // The unique event ID protects against Stripe retries, including concurrent deliveries.
  try {
    await prisma.stripeWebhookEvent.create({ data: { id: event.id, eventType: event.type } });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      console.error("[stripe-webhook] Event-Erfassung fehlgeschlagen:", error);
      return NextResponse.json({ error: "Erfassung fehlgeschlagen." }, { status: 500 });
    }
    const saved = await prisma.stripeWebhookEvent.findUnique({ where: { id: event.id }, select: { processedAt: true } });
    if (saved?.processedAt) return NextResponse.json({ received: true, duplicate: true });
    // An event in progress must be retried, not silently acknowledged.
    return NextResponse.json({ error: "Ereignis wird verarbeitet. Bitte erneut senden." }, { status: 503 });
  }

  try {
    const object = event.data.object;
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await handleCheckout(object);
        break;
      case "invoice.paid":
      case "invoice.payment_succeeded":
        await handleInvoice(object, true);
        break;
      case "invoice.payment_failed":
        await handleInvoice(object, false);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await syncSubscription(object);
        break;
      case "customer.subscription.deleted":
        await syncSubscription({ ...object, status: "canceled" });
        break;
      case "charge.refunded":
        await handleRefund(object);
        break;
      default:
        break;
    }
    await prisma.stripeWebhookEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
    return NextResponse.json({ received: true });
  } catch (error) {
    // Remove failed receipt so Stripe can retry the same event safely.
    await prisma.stripeWebhookEvent.deleteMany({ where: { id: event.id, processedAt: null } }).catch(() => {});
    console.error(`[stripe-webhook] ${event.type} fehlgeschlagen:`, error);
    return NextResponse.json({ error: "Webhook-Verarbeitung fehlgeschlagen." }, { status: 500 });
  }
}
