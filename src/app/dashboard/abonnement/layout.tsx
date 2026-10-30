import Link from "next/link";

import { requireOrganizationContext } from "@/lib/dashboard-context";

export default async function SubscriptionLayout({ children }: { children: React.ReactNode }) {
  const context = await requireOrganizationContext();
  const canManage = context.can("manage");

  return (
    <>
      {canManage ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-primary-900">Online bezahlen mit Stripe</p>
            <p className="text-xs text-primary-700">Tarif direkt buchen oder wechseln – inklusive TWINT, sobald Stripe die Freigabe erteilt.</p>
          </div>
          <Link href="/dashboard/abonnement/bezahlen" className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-800">
            Tarif online buchen
          </Link>
        </div>
      ) : null}
      {children}
    </>
  );
}
