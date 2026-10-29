import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { QrPanel } from "@/components/dashboard/qr/qr-panel";
import { requireOrganizationContext } from "@/lib/dashboard-context";
import { QR_TARGETS, qrTargetUrl } from "@/lib/qr";
import { hasFeature, isSubscriptionUsable } from "@/lib/subscription";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "QR-Code" };

export default async function QrCodePage() {
  const context = await requireOrganizationContext();
  const organization = context.organization;
  const subscription = context.subscription;
  const qrEligible = Boolean(subscription && isSubscriptionUsable(subscription) && (subscription.plan.tier === "PREMIUM" || subscription.plan.key === "pilot"));

  const targets = QR_TARGETS.map((target) => ({
    key: target.key,
    label: target.label,
    description: target.description,
    url: qrTargetUrl({ type: organization.type, slug: organization.slug }, target),
    available: qrEligible && (target.feature ? hasFeature(subscription, target.feature) : true),
  }));

  return (
    <>
      <PageHeader title="QR-Code" description="Für Plakate, Flyer und Programmhefte. Der Code führt direkt auf deine Seite auf Fas-Nav.ch." />
      {!qrEligible ? (
        <Card className="mb-4 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          QR-Codes sind in Premium sowie für Pilot-Kunden enthalten.
        </Card>
      ) : null}
      <Card className="p-5"><QrPanel organizationId={organization.id} targets={targets} /></Card>
      <p className="mt-4 text-xs text-muted-foreground">Die Codes werden bei jedem Abruf aus der Adresse deiner Seite berechnet. Änderst du die Adresse deiner Seite, muss ein bereits gedruckter Code neu erzeugt werden.</p>
    </>
  );
}
