import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/public/legal-page";
import { getSiteSettings, settingString } from "@/lib/queries/homepage";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Datenschutzerklärung",
  description:
    "Wie Fas-Nav.ch Personendaten bearbeitet – im Einklang mit dem Schweizer Datenschutzgesetz (DSG).",
  path: "/datenschutz",
});

export default async function PrivacyPage() {
  const settings = await getSiteSettings();
  const operator = settingString(settings, "operator_name", "Fas-Nav.ch");
  const email = settingString(settings, "contact_email", "info@fas-nav.ch");

  return (
    <LegalPage title="Datenschutzerklärung">
      <p>
        Der Schutz deiner Personendaten ist uns wichtig. Diese Erklärung beschreibt, welche Daten
        wir bearbeiten und zu welchem Zweck. Grundlage bildet das revidierte Schweizer
        Datenschutzgesetz (DSG).
      </p>

      <h2>1. Verantwortliche Stelle</h2>
      <p>
        Verantwortlich für die Datenbearbeitung ist {operator}. Bei Fragen zum Datenschutz erreichst
        du uns unter{" "}
        <a href={`mailto:${email}`} className="text-primary-700 underline">
          {email}
        </a>
        .
      </p>

      <h2>2. Welche Daten wir bearbeiten</h2>
      <h3>Besucherinnen und Besucher</h3>
      <p>
        Beim Besuch der Website erfassen wir aggregierte Nutzungsdaten (aufgerufene Seite,
        Zeitpunkt, Referrer). Wir speichern <strong>keine IP-Adressen im Klartext</strong>. Zur
        groben Unterscheidung von Besuchen verwenden wir einen täglich wechselnden, nicht
        rückrechenbaren Hashwert. Es findet keine Profilbildung und keine Weitergabe an
        Werbenetzwerke statt.
      </p>

      <h3>Registrierte Organisationen</h3>
      <p>
        Für Konten von Fasnachtsorganisationen und Guggenmusiken bearbeiten wir Name, E-Mail-Adresse,
        optional Telefonnummer sowie die von der Organisation selbst erfassten Profilinhalte.
        Passwörter werden ausschliesslich als kryptografischer Hash (bcrypt) gespeichert.
      </p>

      <h3>Kontakt- und Supportanfragen</h3>
      <p>
        Deine Angaben aus dem Kontaktformular bearbeiten wir zur Beantwortung deiner Anfrage. Sie
        werden als Support-Ticket gespeichert und nach Abschluss der Bearbeitung archiviert.
      </p>

      <h3>Akquise-E-Mails und Linkmessung</h3>
      <p>
        Bei individuell versendeten Einladungs- und Akquise-E-Mails können wir erfassen,
        wie oft ein individueller Link zu Fas-Nav.ch aufgerufen wurde und wann der letzte
        Linkaufruf stattgefunden hat. Zusätzlich können einzelne E-Mail-Programme ein
        technisches Bild zum Messen des Nachrichtenaufrufs laden. Diese Messwerte sind
        nicht zwingend echte Lesevorgänge: Sicherheitsdienste und Mailprogramme können
        Links und Bilder automatisch abrufen. Die Messung dient ausschliesslich der
        Nachverfolgung unserer eigenen Kommunikation; sie wird nicht an Werbenetzwerke
        weitergegeben. Zu einer gelöschten Akquise-Konversation gehörende Messdaten
        werden bei der endgültigen Löschung ebenfalls entfernt.
      </p>
      <h3>Online-Zahlungen</h3>
      <p>
        Für kostenpflichtige Online-Abonnemente setzen wir Stripe als Zahlungsdienstleister
        ein. Zahlungs-, Rechnungs- und Abonnementdaten werden zur Vertragsabwicklung
        verarbeitet; Bank- und Kartendaten werden nicht von Fas-Nav.ch gespeichert.
        Stripe verarbeitet die Zahlungsangaben nach seinen eigenen Datenschutzbestimmungen.
      </p>

      <h2>3. Zweck der Bearbeitung</h2>
      <ul>
        <li>Betrieb und Weiterentwicklung der Plattform</li>
        <li>Darstellung öffentlicher Profile und Veranstaltungen</li>
        <li>Abwicklung von Abonnements und Rechnungsstellung</li>
        <li>Beantwortung von Anfragen und Support</li>
        <li>Sicherheit, Missbrauchsverhinderung und Fehleranalyse</li>
      </ul>

      <h2>4. Cookies</h2>
      <p>
        Wir setzen ausschliesslich technisch notwendige Cookies ein – insbesondere für die
        Anmeldung am Dashboard. Es werden keine Marketing- oder Tracking-Cookies Dritter verwendet.
        Details findest du unter{" "}
        <Link href="/cookies" className="text-primary-700 underline">
          Cookie-Einstellungen
        </Link>
        .
      </p>

      <h2>5. Weitergabe an Dritte</h2>
      <p>
        Wir geben Personendaten nicht an Dritte weiter, ausser dies ist zur Vertragserfüllung
        erforderlich (z.&nbsp;B. Hosting, Zahlungsabwicklung) oder wir sind gesetzlich dazu
        verpflichtet. Eingesetzte Dienstleister werden sorgfältig ausgewählt und vertraglich
        verpflichtet.
      </p>

      <h2>6. Aufbewahrung</h2>
      <p>
        Wir bewahren Personendaten nur so lange auf, wie dies für die genannten Zwecke erforderlich
        ist oder gesetzliche Aufbewahrungsfristen es verlangen. Nutzungsstatistiken verwenden zeitlich begrenzte pseudonyme Kennungen.
        Gesetzliche Aufbewahrungspflichten für Rechnungs- und Vertragsdaten bleiben vorbehalten.
      </p>

      <h2>7. Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung sowie Herausgabe deiner Daten. Sende
        uns dazu eine Nachricht an{" "}
        <a href={`mailto:${email}`} className="text-primary-700 underline">
          {email}
        </a>
        . Zur Wahrung der Sicherheit können wir einen Identitätsnachweis verlangen.
      </p>

      <h2>8. Sicherheit</h2>
      <p>
        Wir treffen angemessene technische und organisatorische Massnahmen: verschlüsselte
        Übertragung (TLS), sichere Passwort-Hashes, rollenbasierte Zugriffskontrolle,
        serverseitige Berechtigungsprüfung sowie Protokollierung administrativer Aktionen.
      </p>

      <h2>9. Änderungen</h2>
      <p>
        Wir können diese Datenschutzerklärung jederzeit anpassen. Massgebend ist die jeweils auf
        dieser Seite veröffentlichte Fassung.
      </p>
    </LegalPage>
  );
}
