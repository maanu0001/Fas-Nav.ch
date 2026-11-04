import { auth } from "@/lib/auth";
import { MaintenanceScreen } from "@/components/maintenance/maintenance-screen";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import { maintenanceScreenFor } from "@/lib/maintenance";

// Der Wartungsmodus wird bei jeder Anfrage frisch gelesen, damit er sofort
// greift und nicht an einer zwischengespeicherten Seite vorbeiläuft.
export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  // Vor allem anderen: Ist Wartung, sieht niemand ausser der Administration
  // den öffentlichen Bereich. Die Prüfung sitzt im Layout und gilt damit für
  // jede Unterseite, auch bei direkt eingegebener Adresse.
  const maintenance = await maintenanceScreenFor();
  if (maintenance) return <MaintenanceScreen message={maintenance.message} />;

  const session = await auth();

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader isAuthenticated={Boolean(session?.user)} />
      <main id="inhalt" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
