import type { Metadata } from "next";
import { Check } from "lucide-react";

import { StripePortalButton } from "@/components/dashboard/stripe-portal-button";
import Link from "next/link";
import { StripeCheckoutButton } from "@/components/dashboard/stripe-checkout-button";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { requireOrganizationContext } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";
import { stripeConfigured } from "@/lib/stripe";
import { formatChf } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tarif online buchen" };

export default async function CheckoutPage() {
  const context = await requireOrganizationContext();
  const canManage = context.can("manage");
  const configured = stripeConfigured();
  const existingStripe=Boolean(context.subscription?.externalSubscriptionId && context.subscription?.externalCustomerId && !["CANCELLED","EXPIRED"].includes(context.subscription.status));
  const plans = await prisma.plan.findMany({
    where: { isActive: true, isPublic: true, priceChf: { gt: 0 }, billingInterval: { in: ["MONTHLY", "YEARLY"] } },
    orderBy: { sortOrder: "asc" },
    include: { features: { where: { enabled: true }, include: { feature: true }, orderBy: { feature: { sortOrder: "asc" } } } },
  });

  return (
    <>
      <PageHeader title="Tarif online buchen" description={`Wähle den passenden Tarif für ${context.organization.name} und buche ihn direkt online. Für Beratungsfragen ist das Team weiterhin erreichbar.`} />

      {!canManage ? <Alert variant="warning" title="Keine Berechtigung">Nur Owner und Manager können ein Abonnement buchen oder wechseln.</Alert> : null}
      {!configured ? <Alert variant="error" title="Online-Zahlung noch nicht verfügbar" className="mt-4">Stripe ist auf dem Produktionsserver noch nicht vollständig konfiguriert.</Alert> : null}

      {existingStripe?<div className="mt-6 rounded-xl border border-primary-200 bg-primary-50 p-5"><h2 className="font-semibold text-primary-900">Dein Stripe-Abo besteht bereits</h2><p className="mt-2 text-sm text-primary-800">Verwalte dein bestehendes Abo und Zahlungsmittel im Stripe-Kundenportal. Ein zweiter Checkout wird zum Schutz vor doppelten Abbuchungen nicht gestartet. Tarifwechsel sind im Portal verfügbar, sofern diese Funktion in Stripe freigeschaltet ist.</p><div className="mt-4 max-w-sm"><StripePortalButton organizationId={context.organization.id}/></div></div>:null}
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {plans.map((plan) => {
          const current = context.subscription?.planId === plan.id;
          return (
            <Card key={plan.id} className="flex h-full flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-primary-900">{plan.name}</h2>
                  {plan.description ? <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p> : null}
                </div>
                {current ? <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">Aktuell</span> : null}
              </div>
              <p className="mt-5 font-display text-3xl font-bold text-primary-900">{formatChf(Number(plan.priceChf))}<span className="ml-1 text-sm font-normal text-muted-foreground">/{plan.billingInterval === "MONTHLY" ? "Monat" : "Jahr"}</span></p>
              <ul className="my-5 flex-1 space-y-2">
                {plan.features.slice(0, 8).map((item) => <li key={item.id} className="flex gap-2 text-sm text-slate-700"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />{item.feature.name}</li>)}
              </ul>
              <StripeCheckoutButton organizationId={context.organization.id} planId={plan.id} label={current && !context.subscription?.externalSubscriptionId ? `${plan.name} auf Online-Abo umstellen` : current ? "Aktueller Tarif" : `${plan.name} online buchen`} disabled={!canManage || !configured || existingStripe || (current && Boolean(context.subscription?.externalSubscriptionId))} />
            </Card>
          );
        })}
      </div>
      <p className="mt-5 text-sm text-muted-foreground">Unsicher, welcher Tarif passt? <Link href="/dashboard/tickets/neu" className="font-semibold text-primary-700 underline">Beratung beim Team anfragen</Link>. Die Buchung erledigst du anschliessend selbst online.</p>
      <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <p className="font-semibold">TWINT ist verfügbar.</p>
        <p className="mt-1 text-emerald-800">Im sicheren Stripe Checkout werden TWINT und weitere für das Gerät verfügbare Zahlungsmethoden automatisch angezeigt. Wiederkehrende Zahlungen werden über das gewählte Zahlungsmittel abgewickelt. Bestehende manuelle Rechnungen bleiben weiterhin möglich.</p>
      </div>
    </>
  );
}
