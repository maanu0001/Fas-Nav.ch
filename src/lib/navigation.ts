import type { Role } from "@prisma/client";

import { isAdmin, isStaff } from "@/lib/rbac";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
};

export type NavGroup = {
  title?: string;
  items: NavItem[];
};

/**
 * Navigationsstruktur je Rolle.
 * Ausgeblendete Einträge sind zusätzlich serverseitig geschützt –
 * die Navigation ist reine Benutzerführung, keine Sicherheitsgrenze.
 *
 * `organizationId` ist die gerade aktive Organisation eines
 * Organisationskontos. Sie wird für die Galerie gebraucht, die – wie jede
 * Galerie – unter ihrer Organisation liegt. Ohne aktive Organisation bleibt
 * der Weg über die Umleitung unter „/dashboard/galerie" bestehen.
 */
export function dashboardNavigation(role: Role, organizationId?: string | null): NavGroup[] {
  if (isStaff(role)) {
    return [
      {
        items: [{ href: "/dashboard", label: "Dashboard", icon: "gauge", exact: true }],
      },
      {
        title: "Inhalte",
        items: [
          // Startseite und Datenimport sind der Administration vorbehalten.
          // Die Prüfung erfolgt zusätzlich serverseitig in jeder Seite und in
          // jedem Endpunkt; diese Filterung dient allein der Benutzerführung.
          ...(isAdmin(role)
            ? [{ href: "/dashboard/homepage", label: "Homepage", icon: "layout" }]
            : []),
          { href: "/dashboard/organisationen", label: "Organisationen", icon: "building" },
          { href: "/dashboard/agenda", label: "Agenda", icon: "calendar" },
          { href: "/dashboard/medien", label: "Medien", icon: "image" },
          ...(isAdmin(role)
            ? [
                { href: "/dashboard/import", label: "Datenimport", icon: "upload" },
                { href: "/dashboard/datenqualitaet", label: "Datenqualität", icon: "chart" },
              ]
            : []),
        ],
      },
      {
        title: "Verwaltung",
        items: [
          { href: "/dashboard/accounts", label: "Accounts", icon: "users" },
          { href: "/dashboard/abonnemente", label: "Abonnemente", icon: "badge" },
          // Zahlungen sind eine kaufmännische Funktion und nur für ADMIN.
          ...(isAdmin(role)
            ? [
                { href: "/dashboard/zahlungen", label: "Zahlungen", icon: "wallet" },
                // Preise bestimmen, was auf der öffentlichen Preisseite steht,
                // und schalten Funktionen frei – deshalb nur für ADMIN.
                { href: "/dashboard/preise", label: "Preise", icon: "tag" },
              ]
            : []),
          { href: "/dashboard/tickets", label: "Tickets", icon: "ticket" },
          // Zuschriften über die Website. Admin und Team bearbeiten sie
          // gemeinsam; die Prüfung dazu hängt am Recht handleContactRequests.
          { href: "/dashboard/kontaktanfragen", label: "Kontaktanfragen", icon: "mail" },
          { href: "/dashboard/werbung", label: "Werbung", icon: "megaphone" },
        ],
      },
      {
        title: "Auswertung",
        items: [
          { href: "/dashboard/statistik", label: "Statistik", icon: "chart" },
          { href: "/dashboard/logs", label: "Logs", icon: "scroll" },
          // Die Einstellungen enthalten für jede Rolle das eigene Konto –
          // E-Mail-Adresse, Ticketmeldungen, Passwort. Die Plattformteile
          // darin bleiben der Administration vorbehalten und werden auf der
          // Seite selbst geprüft, nicht durch Ausblenden im Menü.
          { href: "/dashboard/einstellungen", label: "Einstellungen", icon: "settings" },
        ],
      },
    ];
  }

  // Organisationsaccounts (FASNACHT, GUGGE)
  return [
    {
      items: [{ href: "/dashboard", label: "Dashboard", icon: "gauge", exact: true }],
    },
    {
      title: "Meine Organisation",
      items: [
        { href: "/dashboard/seite", label: "Meine Seite", icon: "layout" },
        { href: "/dashboard/veranstaltungen", label: "Veranstaltungen", icon: "calendar" },
        {
          href: organizationId ? organizationGalleryPath(organizationId) : "/dashboard/galerie",
          label: "Galerie",
          icon: "image",
        },
        { href: "/dashboard/qr-code", label: "QR-Code", icon: "layout" },
        { href: "/dashboard/statistik", label: "Statistik", icon: "chart" },
      ],
    },
    {
      title: "Konto",
      items: [
        { href: "/dashboard/abonnement", label: "Abonnement", icon: "badge" },
        { href: "/dashboard/tickets", label: "Tickets", icon: "ticket" },
        { href: "/dashboard/einstellungen", label: "Einstellungen", icon: "settings" },
      ],
    },
  ];
}

/**
 * Adresse der Galerie einer Organisation.
 *
 * Es gibt genau eine Galerieseite je Organisation, und sie steht unter der
 * Organisation, zu der sie gehört. Das ist der Grund für diese Funktion:
 * Der Editor hat zuvor fest auf „/dashboard/galerie" verwiesen – die Galerie
 * der *eigenen* Organisation. Für Admin und Team, die eine fremde
 * Organisation bearbeiten, führte der Verweis deshalb ins Leere, während
 * dieselbe Galerie über die Adresse direkt erreichbar war.
 *
 * Wer den Verweis baut, muss also immer die Organisation nennen, um die es
 * geht. Die Berechtigung prüft die Zielseite anschliessend selbst; dieser
 * Pfad ist reine Wegweisung.
 */
export function organizationGalleryPath(organizationId: string): string {
  return `/dashboard/organisationen/${organizationId}/galerie`;
}
