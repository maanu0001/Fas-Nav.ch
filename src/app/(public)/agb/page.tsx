import type { Metadata } from "next";

import { LegalPage } from "@/components/public/legal-page";
import { getSiteSettings, settingString } from "@/lib/queries/homepage";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Allgemeine Geschäftsbedingungen",
  description: "Die AGB für die Nutzung von Fas-Nav.ch durch Organisationen und Besucher.",
  path: "/agb",
});

export default async function TermsPage() {
  const settings = await getSiteSettings();
  const operator = settingString(settings, "operator_name", "Fas-Nav.ch");

  return (
    <LegalPage title="Allgemeine Geschäftsbedingungen">
      <h2>1. Geltungsbereich</h2>
      <p>
        Diese Allgemeinen Geschäftsbedingungen (AGB) regeln die Nutzung der Plattform Fas-Nav.ch,
        betrieben durch {operator}. Mit der Nutzung der Plattform oder dem Abschluss eines
        Abonnements werden diese AGB anerkannt.
      </p>

      <h2>2. Leistungen</h2>
      <p>
        Fas-Nav.ch stellt Fasnachtsorganisationen und Guggenmusiken eine öffentliche Profilseite
        sowie die Möglichkeit zur Verfügung, Veranstaltungen in einer schweizweiten Agenda zu
        publizieren. Der Funktionsumfang richtet sich nach dem gewählten Tarif.
      </p>

      <h2>3. Konten und Zugangsdaten</h2>
      <p>
        Konten werden in der Regel durch Fas-Nav.ch erstellt. Zugangsdaten sind vertraulich zu
        behandeln und dürfen nicht an Dritte weitergegeben werden. Die Organisation ist für alle
        über ihr Konto vorgenommenen Handlungen verantwortlich.
      </p>

      <h2>4. Inhalte der Organisationen</h2>
      <p>
        Die Organisation ist für die von ihr veröffentlichten Inhalte allein verantwortlich. Sie
        sichert zu, über die erforderlichen Rechte an hochgeladenen Bildern, Logos und Texten zu
        verfügen. Rechtswidrige, diskriminierende oder irreführende Inhalte sind untersagt.
      </p>
      <p>
        Fas-Nav.ch behält sich vor, Inhalte, die gegen diese AGB oder geltendes Recht verstossen,
        ohne Vorankündigung zu deaktivieren.
      </p>

      <h2>5. Abonnemente, Preise und Zahlung</h2>
      <p>
        Tarife werden gemäss der bei der Buchung angegebenen Laufzeit abgerechnet
        (beispielsweise monatlich oder jährlich). Massgebend sind der ausgewählte Tarif,
        die angezeigten Vertragsbedingungen und die Bestätigung im Online-Checkout.
        Manuell ausgestellte Rechnungen werden separat ausgewiesen. Alle Preise werden
        in Schweizer Franken angezeigt.
      </p>

      <h2>6. Laufzeit, Verlängerung und Kündigung</h2>
      <p>
        Wiederkehrende Online-Abonnemente verlängern sich gemäss der im Checkout vereinbarten
        Laufzeit, sofern sie nicht rechtzeitig gekündigt werden. Die Verwaltung der
        Zahlungsmittel und die Kündigung von Stripe-Abonnements erfolgt über das Kundenportal.
        Für manuell verwaltete Abonnemente gelten die individuell vereinbarten Bedingungen.
      </p>
      <p>
        Nach Ablauf oder bei ausstehender Zahlung kann der Funktionsumfang eingeschränkt werden.
        Die öffentliche Profilseite wird nicht unmittelbar gelöscht; Basisangaben können als
        Verzeichniseintrag bestehen bleiben.
      </p>

      <h2>7. Verfügbarkeit</h2>
      <p>
        Wir bemühen uns um eine hohe Verfügbarkeit der Plattform, schulden jedoch keine
        ununterbrochene Erreichbarkeit. Wartungsarbeiten werden nach Möglichkeit angekündigt.
      </p>

      <h2>8. Haftung</h2>
      <p>
        Die Haftung von Fas-Nav.ch ist auf Vorsatz und grobe Fahrlässigkeit beschränkt. Eine
        Haftung für indirekte Schäden, entgangenen Gewinn oder Datenverlust ist ausgeschlossen,
        soweit gesetzlich zulässig.
      </p>

      <h2>9. Änderungen der AGB</h2>
      <p>
        Fas-Nav.ch kann diese AGB anpassen. Über wesentliche Änderungen werden Kundinnen und Kunden
        vorgängig informiert.
      </p>

      <h2>10. Anwendbares Recht und Gerichtsstand</h2>
      <p>
        Es gilt ausschliesslich Schweizer Recht. Gerichtsstand ist – soweit gesetzlich zulässig –
        der Sitz der Betreiberin.
      </p>
    </LegalPage>
  );
}
