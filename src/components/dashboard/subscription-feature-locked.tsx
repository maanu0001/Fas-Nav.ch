import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";

export function SubscriptionFeatureLocked({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card className="mx-auto mt-6 max-w-xl p-7 text-center sm:p-9">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <LockKeyhole className="h-6 w-6 text-muted-foreground" aria-hidden />
        </div>
        <h2 className="font-display text-xl font-semibold">Ein anderes Abonnement erforderlich</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          {title} ist in deinem aktuellen Tarif nicht enthalten. Vergleiche die Abonnemente und wähle einen Tarif, der diese Funktion freischaltet.
        </p>
        <Link href="/dashboard/abonnement/bezahlen" className="mt-5 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
          Abonnemente ansehen
        </Link>
      </Card>
    </>
  );
}
