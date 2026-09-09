import { redirect } from "next/navigation";

import { requireOrganizationContext } from "@/lib/dashboard-context";
import { organizationGalleryPath } from "@/lib/navigation";

export const dynamic = "force-dynamic";

/**
 * Alter Weg zur eigenen Galerie.
 *
 * Es gibt nur noch eine Galerieseite je Organisation, und sie liegt unter
 * dieser Organisation. Damit prüfen Menüweg und direkte Adresse dieselbe
 * Berechtigung an derselben Stelle – vorher waren es zwei Seiten mit zwei
 * Prüfungen, und genau daran ist der Verweis für Admin und Team gescheitert.
 *
 * Diese Adresse bleibt als Umleitung bestehen, damit gespeicherte Verweise
 * und Lesezeichen weiterhin funktionieren.
 */
export default async function GalleryRedirectPage() {
  const context = await requireOrganizationContext();
  redirect(organizationGalleryPath(context.organization.id));
}
