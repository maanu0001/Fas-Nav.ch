import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableWrapper, Td, Th, Thead, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { PageHeader } from "@/components/dashboard/page-header";
import { PaymentBadge, SubscriptionBadge } from "@/components/dashboard/status-badge";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { requireOrganizationContext } from "@/lib/dashboard-context";
import { formatDateShort } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { daysUntilExpiry, isExpiringSoon, isSubscriptionUsable } from "@/lib/subscription";
import { formatChf } from "@/lib/utils";
import { stripeGet } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Abonnement" };

export default async function SubscriptionPage() {
  const context = await requireOrganizationContext();
  let subscription = context.subscription;
  // Recheck Stripe when the dashboard is opened, including portal cancellations.
  if (subscription?.externalSubscriptionId) {
    try {
      const remote = await stripeGet<{
        status: string; cancel_at_period_end: boolean;
        canceled_at: number | null; cancel_at: number | null;
        current_period_end: number | null;
      }>(`/subscriptions/${encodeURIComponent(subscription.externalSubscriptionId)}`);
      const cancelled = remote.status === "canceled";
      const scheduled = remote.cancel_at_period_end === true || (typeof remote.cancel_at === "number" && remote.cancel_at > Date.now() / 1000);
      const remoteEnd = remote.current_period_end ? new Date(remote.current_period_end * 1000) : subscription.endDate;
      const updated = await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: cancelled ? "CANCELLED" : remote.status === "active" || remote.status === "trialing" ? "ACTIVE" : remote.status === "paused" ? "SUSPENDED" : "PAYMENT_PENDING",
          autoRenew: !cancelled && !scheduled,
          cancelledAt: cancelled || scheduled ? (remote.canceled_at ? new Date(remote.canceled_at * 1000) : subscription.cancelledAt ?? new Date()) : null,
          ...(remoteEnd ? { endDate: remoteEnd, nextDueAt: cancelled || scheduled ? null : remoteEnd } : {}),
        },
      });
      subscription = { ...subscription, ...updated };
    } catch (error) {
      console.error("[subscription] Stripe status reconciliation failed", error);
    }
  }
  const cancellationScheduled = Boolean(subscription && subscription.externalSubscriptionId && !subscription.autoRenew && subscription.status === "ACTIVE");

  const payments = await prisma.payment.findMany({
    where: { organizationId: context.organization.id },
    orderBy: { issuedAt: "desc" },
    take: 24,
    select: {
      id: true,
      invoiceNumber: true,
      amountChf: true,
      status: true,
      method: true,
      issuedAt: true,
      dueAt: true,
      paidAt: true,
      periodStart: true,
      periodEnd: true,
    },
  });

  const expiryDays = daysUntilExpiry(subscription?.endDate);
  const usable = isSubscriptionUsable(subscription);

  return (
    <>
      <PageHeader
        title="Abonnement"
        description="Dein Tarif, Laufzeit und Rechnungen im Überblick."
      />

      {!subscription ? (
        <EmptyState
          title="Noch kein Abonnement hinterlegt"
          description="Für deine Organisation ist noch kein Tarif erfasst. Wähle ihn direkt online – unser Team hilft bei Beratungsfragen."
          action={<ButtonLink href="/dashboard/abonnement/bezahlen">Tarif online buchen</ButtonLink>}
        />
      ) : (
        <>
          {cancellationScheduled ? (
            <Alert variant="warning" title="Abonnement gekündigt" className="mb-6">
              Die automatische Verlängerung ist deaktiviert. Dein Tarif bleibt
              {subscription.endDate ? ` bis ${formatDateShort(subscription.endDate)}` : " bis zum Ende der bezahlten Laufzeit"} verfügbar.
              Danach wird er nicht mehr verlängert.
            </Alert>
          ) : !usable ? (
            <Alert variant="error" title="Abonnement nicht aktiv" className="mb-6">
              Kostenpflichtige Funktionen sind derzeit eingeschränkt. Deine öffentliche Seite bleibt
              als Basiseintrag bestehen. Bei Fragen hilft dir das Fas-Nav-Team gerne weiter.
            </Alert>
          ) : isExpiringSoon(subscription.endDate) && expiryDays !== null ? (
            <Alert variant="warning" title="Dein Fas-Nav-Abo läuft bald ab" className="mb-6">
              Das Abonnement endet in {expiryDays} {expiryDays === 1 ? "Tag" : "Tagen"} am{" "}
              {formatDateShort(subscription.endDate)}.{" "}
              {subscription.autoRenew
                ? "Es verlängert sich automatisch – du musst nichts tun."
                : "Melde dich beim Team, wenn du verlängern möchtest."}
            </Alert>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Aktueller Tarif</p>
                  <h2 className="mt-0.5 font-display text-2xl font-bold text-primary-900">
                    {subscription.plan.name}
                  </h2>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <SubscriptionBadge status={subscription.status} />
                  {cancellationScheduled ? <span className="text-xs font-semibold text-amber-700">Gekündigt · läuft aus</span> : null}
                </div>
              </div>

              {subscription.plan.description ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {subscription.plan.description}
                </p>
              ) : null}

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                {[
                  { label: "Preis", value: formatChf(Number(subscription.priceChf)) },
                  { label: "Beginn", value: formatDateShort(subscription.startDate) },
                  {
                    label: "Läuft bis",
                    value: subscription.endDate ? formatDateShort(subscription.endDate) : "Unbefristet",
                  },
                  {
                    label: "Nächste Fälligkeit",
                    value: subscription.nextDueAt ? formatDateShort(subscription.nextDueAt) : "–",
                  },
                  {
                    label: "Letzte Zahlung",
                    value: subscription.lastPaymentAt
                      ? formatDateShort(subscription.lastPaymentAt)
                      : "–",
                  },
                  {
                    label: "Verlängerung",
                    value: cancellationScheduled ? "Gekündigt – keine Verlängerung" : subscription.autoRenew ? "Automatisch" : "Keine automatische Verlängerung",
                  },
                ].map((row) => (
                  <div key={row.label}>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                      {row.label}
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium text-primary-900">{row.value}</dd>
                  </div>
                ))}
              </dl>

              <p className="mt-6 text-sm text-muted-foreground">
                Möchtest du deinen Tarif wechseln?{" "}
                <Link href="/dashboard/abonnement/bezahlen" className="font-medium text-primary-700 underline">Tarif online verwalten</Link>. Bei Beratungsfragen steht dir das Fas-Nav-Team weiterhin zur Verfügung.
              </p>
            </Card>

            <Card className="p-5">
              <h2 className="mb-4 font-display text-base font-semibold">Enthaltene Leistungen</h2>
              <ul className="space-y-2">
                {subscription.plan.features.map((pf) => (
                  <li key={pf.id} className="flex gap-2.5 text-sm">
                    {pf.enabled ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                    ) : (
                      <Minus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    )}
                    <span className={pf.enabled ? "text-slate-700" : "text-muted-foreground"}>
                      {pf.feature.name}
                      {pf.limit !== null ? (
                        <span className="text-muted-foreground"> (bis {pf.limit})</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>

              <ButtonLink href="/dashboard/abonnement/bezahlen" variant="outline" block className="mt-5">
                Tarife vergleichen
              </ButtonLink>
            </Card>
          </div>

          <section className="mt-8">
            <h2 className="mb-4 font-display text-lg font-bold">Rechnungen</h2>
            {payments.length ? (
              <TableWrapper>
                <Table>
                  <Thead>
                    <Tr>
                      <Th>Rechnung</Th>
                      <Th>Betrag</Th>
                      <Th>Periode</Th>
                      <Th>Ausgestellt</Th>
                      <Th>Fällig</Th>
                      <Th>Zahlungsart</Th>
                      <Th>Status</Th>
                    </Tr>
                  </Thead>
                  <tbody>
                    {payments.map((payment) => (
                      <Tr key={payment.id}>
                        <Td className="whitespace-nowrap font-mono text-xs">
                          {payment.invoiceNumber}
                        </Td>
                        <Td className="whitespace-nowrap font-medium">
                          {formatChf(Number(payment.amountChf))}
                        </Td>
                        <Td className="whitespace-nowrap text-muted-foreground">
                          {payment.periodStart && payment.periodEnd
                            ? `${formatDateShort(payment.periodStart)} – ${formatDateShort(payment.periodEnd)}`
                            : "–"}
                        </Td>
                        <Td className="whitespace-nowrap text-muted-foreground">
                          {formatDateShort(payment.issuedAt)}
                        </Td>
                        <Td className="whitespace-nowrap text-muted-foreground">
                          {payment.dueAt ? formatDateShort(payment.dueAt) : "–"}
                        </Td>
                        <Td className="text-muted-foreground">
                          {PAYMENT_METHOD_LABELS[payment.method]}
                        </Td>
                        <Td>
                          <PaymentBadge status={payment.status} />
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrapper>
            ) : (
              <EmptyState
                title="Noch keine Rechnungen"
                description="Sobald eine Rechnung ausgestellt wurde, erscheint sie hier."
              />
            )}
          </section>
        </>
      )}
    </>
  );
}
