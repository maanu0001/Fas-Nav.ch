"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function StripeCheckoutButton({
  organizationId,
  planId,
  label,
  disabled = false,
}: {
  organizationId: string;
  planId: string;
  label: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, planId }),
      });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Checkout konnte nicht gestartet werden.");
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout konnte nicht gestartet werden.");
      setLoading(false);
    }
  }

  return (
    <div>
      <Button type="button" onClick={checkout} disabled={disabled || loading} className="w-full">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <CreditCard className="mr-2 h-4 w-4" aria-hidden />}
        {loading ? "Stripe wird geöffnet …" : label}
      </Button>
      {error ? <p className="mt-2 text-xs text-red-700" role="alert">{error}</p> : null}
    </div>
  );
}
