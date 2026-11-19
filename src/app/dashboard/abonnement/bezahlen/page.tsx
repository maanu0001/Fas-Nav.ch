import type { Metadata } from "next";
import { Check } from "lucide-react";

import { StripePortalButton } from "@/components/dashboard/stripe-portal-button";
import Link from "next/link";
import { StripePlanChangeButton } from "@/components/dashboard/stripe-plan-change-button";
import { StripeCheckoutButton } from "@/components/dashboard/stripe-checkout-button";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireOrganizationContext } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";
import { stripeConfigured } from "@/lib/stripe";
import { formatChf } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tarife vergleichen und wechseln" };

export default async function CheckoutPage() {
  const context = await requireOrganizationContext();
  const canManage = context.can("manage");
  const configured = stripeConfigured();
  const existingStripe=Boolean(context.subscription?.externalSubscriptionId && context.subscription?.externalCustomerId && !["CANCELLED","EXPIRED"].includes(context.subscription.status));
  const [plans, freePlan] = await Promise.all([prisma.plan.findMany({
    where: { isActive: true, isPublic: true, priceChf: { gt: 0 }, billingInterval: { in: ["MONTHLY", "YEARLY"] } },
    orderBy: { sortOrder: "asc" },
    include: { features: { where: { enabled: true }, include: { feature: true }, orderBy: { feature: { sortOrder: "asc" } } } },
  }), prisma.plan.findFirst({
    where: { tier: "FREE", isActive: true },
    include: { features: { where: { enabled: true }, include: { feature: true } } },
  })]);
  const currentSubscription=context.subscription;
  const currentListed=plans.some(plan=>plan.id===currentSubscription?.planId);
  const freeFeatures = new Map(freePlan?.features.map((entry) => [entry.feature.key, entry]) ?? []);

  return (
    <>
      <PageHeader title="Tarife vergleichen und wechseln" description={`Wähle den passenden Tarif für ${context.organization.name} und buche ihn direkt online. Für Beratungsfragen ist das Team weiterhin erreichbar.`} />

      {!canManage ? <Alert variant="warning" title="Keine Berechtigung">Nur Owner und Manager können ein Abonnement buchen oder wechseln.</Alert> : null}
      {!configured ? <Alert variant="error" title="Online-Zahlung noch nicht verfügbar" className="mt-4">Stripe ist auf dem Produktionsserver noch nicht vollständig konfiguriert.</Alert> : null}

      {existingStripe?<div className="mt-6 rounded-xl border border-primary-200 bg-primary-50 p-5"><h2 className="font-semibold text-primary-900 dark:text-white">Dein Stripe-Abo besteht bereits</h2><p className="mt-2 text-sm text-primary-800 dark:text-slate-200">Verwalte dein bestehendes Abo und Zahlungsmittel im Stripe-Kundenportal. Ein zweiter Checkout wird zum Schutz vor doppelten Abbuchungen nicht gestartet. Wähle unten einen neuen Tarif. Upgrades werden anteilmässig berechnet, Downgrades zum Laufzeitende vorgemerkt.</p><div className="mt-4 max-w-sm"><StripePortalButton organizationId={context.organization.id}/></div></div>:null}
      {currentSubscription && !currentListed ? <Card className="mt-6 border-2 border-emerald-500 bg-emerald-50/30 p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase text-emerald-700">Dein aktuelles Abonnement</p><h2 className="mt-1 font-display text-xl font-bold">{currentSubscription.plan.name}</h2><p className="mt-1 text-sm text-muted-foreground">{currentSubscription.plan.description}</p><p className="mt-2 text-lg font-semibold">{formatChf(Number(currentSubscription.priceChf))} / {currentSubscription.plan.billingInterval==="MONTHLY"?"Monat":"Jahr"}</p><p className="mt-1 text-xs text-muted-foreground">Laufzeit bis {currentSubscription.endDate?.toLocaleDateString("de-CH")??"unbefristet"}</p></div><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Aktueller Tarif</span></div></Card> : null}
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {plans.map((plan) => {
          const current = context.subscription?.planId === plan.id;
          const upgrades = plan.features.filter((entry) => {
            const free = freeFeatures.get(entry.feature.key);
            if (!free) return true;
            if (free.limit === null) return false;
            return entry.limit === null || entry.limit > free.limit;
          });
          const visible = upgrades.slice(0, 4);
          const remaining = upgrades.slice(4);
          const benefit = (item: (typeof upgrades)[number]) => (
            <li key={item.id} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              <span className="min-w-0">
                <span className="font-medium">{item.feature.name}</span>
                {item.limit !== null ? <span className="ml-1 text-xs text-muted-foreground">(bis {item.limit})</span> : null}
                {item.feature.description ? <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{item.feature.description}</span> : null}
              </span>
            </li>
          );
          return (
            <Card key={plan.id} className={`flex h-full flex-col p-6 ${current?"border-2 border-emerald-500 bg-emerald-50/20":""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-primary-900 dark:text-slate-100">{plan.name}</h2>
                  {plan.description ? <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p> : null}
                </div>
                {current ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">Aktuell</span> : null}
              </div>
              <p className="mt-5 font-display text-3xl font-bold text-primary-900 dark:text-slate-100">{formatChf(Number(plan.priceChf))}<span className="ml-1 text-sm font-normal text-muted-foreground">/{plan.billingInterval === "MONTHLY" ? "Monat" : "Jahr"}</span></p>
              <div className="my-5 flex-1">
                <ul className="space-y-2">{visible.map(benefit)}</ul>
                {remaining.length > 0 ? (
                  <details className="group mt-3">
                    <summary className="cursor-pointer select-none text-sm font-semibold text-primary-700 hover:underline group-open:hidden">
                      Mehr anzeigen
                    </summary>
                    <ul className="mt-3 space-y-2">{remaining.map(benefit)}</ul>
                  </details>
                ) : null}
                {upgrades.length === 0 ? <p className="text-sm text-muted-foreground">Keine zusätzlichen Funktionen gegenüber Free hinterlegt.</p> : null}
              </div>
              {existingStripe && !current && canManage && configured ? <StripePlanChangeButton organizationId={context.organization.id} planId={plan.id} label={`Zu ${plan.name} wechseln`} /> : <StripeCheckoutButton organizationId={context.organization.id} planId={plan.id} label={current && !context.subscription?.externalSubscriptionId ? `${plan.name} auf Online-Abo umstellen` : current ? "Aktueller Tarif" : `${plan.name} online buchen`} disabled={!canManage || !configured || existingStripe || (current && Boolean(context.subscription?.externalSubscriptionId))} />}
            </Card>
          );
        })}
      </div>
      <p className="mt-5 text-sm text-muted-foreground">Unsicher, welcher Tarif passt? <Link href="/dashboard/tickets/neu" className="font-semibold text-primary-700 underline">Beratung beim Team anfragen</Link>. Die Buchung erledigst du anschliessend selbst online.</p>

    </>
  );
}
