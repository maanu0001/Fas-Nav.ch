"use client";

import * as React from "react";
import { Download, QrCode } from "lucide-react";
import { SubscriptionUpgradeNotice } from "@/components/dashboard/subscription-feature-locked";

import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type QrTargetView = {
  key: string;
  label: string;
  description: string;
  url: string;
  available: boolean;
};

/**
 * Anzeige und Download der QR-Codes.
 *
 * Das Bild kommt vom Endpunkt, der die Berechtigung prüft – die Vorschau ist
 * also bereits das Ergebnis derselben Prüfung wie der Download. Gesperrte
 * Ziele werden gar nicht erst geladen.
 */
export function QrPanel({
  organizationId,
  targets,
}: {
  organizationId: string;
  targets: QrTargetView[];
}) {
  const [aktiv, setAktiv] = React.useState(targets[0]?.key ?? "profile");
  const ziel = targets.find((t) => t.key === aktiv) ?? targets[0];

  if (!ziel) return null;

  const bildUrl = `/api/organizations/${organizationId}/qr?ziel=${ziel.key}&format=png&groesse=512`;
  const downloadPng = `/api/organizations/${organizationId}/qr?ziel=${ziel.key}&format=png&groesse=2048`;
  const downloadSvg = `/api/organizations/${organizationId}/qr?ziel=${ziel.key}&format=svg`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_1fr]">
      <div>
        {ziel.available ? (
          // Der Endpunkt liefert ein Bild; deshalb bewusst ein einfaches
          // img-Element statt next/image – die Grösse steht ohnehin fest.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bildUrl}
            alt={`QR-Code: ${ziel.label}`}
            width={512}
            height={512}
            className="h-auto w-full rounded-xl border border-border bg-white p-3"
          />
        ) : (
          <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/60 p-6">
            <SubscriptionUpgradeNotice title={ziel.label} />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Ziel des QR-Codes</legend>
          <div className="space-y-2">
            {targets.map((target) => (
              <label
                key={target.key}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  target.key === aktiv
                    ? "border-primary bg-primary-50"
                    : "border-border hover:bg-secondary",
                )}
              >
                <input
                  type="radio"
                  name="qr-ziel"
                  value={target.key}
                  checked={target.key === aktiv}
                  onChange={() => setAktiv(target.key)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{target.label}</span>
                    {target.available ? null : <Badge variant="muted">Premium</Badge>}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {target.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-5">
          <p className="text-xs font-medium text-muted-foreground">Ziel-Adresse</p>
          <p className="mt-1 break-all rounded-lg border border-border bg-muted/50 px-3 py-2 font-mono text-xs">
            {ziel.url}
          </p>
        </div>

        {ziel.available ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <ButtonLink href={downloadPng} variant="primary" download>
              <Download />
              PNG für den Druck
            </ButtonLink>
            <ButtonLink href={downloadSvg} variant="outline" download>
              <QrCode />
              SVG
            </ButtonLink>
          </div>
        ) : null}
      </div>
    </div>
  );
}
