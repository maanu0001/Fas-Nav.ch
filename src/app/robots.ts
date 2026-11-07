import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/utils";
import { getMaintenanceState } from "@/lib/maintenance";
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const maintenance = await getMaintenanceState();
  if (maintenance.enabled) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Geschützte und nicht indexierbare Bereiche ausschliessen.
        disallow: ["/dashboard", "/api/", "/login", "/passwort-vergessen", "/passwort-zuruecksetzen", "/suche"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    // Keine Host-Direktive: Sie wird von Google nicht ausgewertet und die
    // bevorzugte Adresse steht bereits im Canonical jeder Seite.
  };
}
