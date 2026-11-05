/**
 * Entwicklungs-Seed für Fas-Nav.ch.
 *
 * Legt Stammdaten (Kantone, Tarife, Funktionen, Homepage, Einstellungen)
 * sowie Beispielinhalte an, damit die Plattform unmittelbar testbar ist.
 * Das Skript ist idempotent und kann mehrfach ausgeführt werden.
 */
import { PrismaClient, type OrganizationType, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

import { syncClaimStatus } from "../src/lib/claim-status";

const prisma = new PrismaClient();

const CANTONS = [
  { code: "AG", name: "Aargau", slug: "aargau", region: "Nordwestschweiz" },
  { code: "AI", name: "Appenzell Innerrhoden", slug: "appenzell-innerrhoden", region: "Ostschweiz" },
  { code: "AR", name: "Appenzell Ausserrhoden", slug: "appenzell-ausserrhoden", region: "Ostschweiz" },
  { code: "BE", name: "Bern", slug: "bern", region: "Espace Mittelland" },
  { code: "BL", name: "Basel-Landschaft", slug: "basel-landschaft", region: "Nordwestschweiz" },
  { code: "BS", name: "Basel-Stadt", slug: "basel-stadt", region: "Nordwestschweiz" },
  { code: "FR", name: "Freiburg", slug: "freiburg", region: "Espace Mittelland" },
  { code: "GE", name: "Genf", slug: "genf", region: "Genferseeregion" },
  { code: "GL", name: "Glarus", slug: "glarus", region: "Ostschweiz" },
  { code: "GR", name: "Graubünden", slug: "graubuenden", region: "Ostschweiz" },
  { code: "JU", name: "Jura", slug: "jura", region: "Espace Mittelland" },
  { code: "LU", name: "Luzern", slug: "luzern", region: "Zentralschweiz" },
  { code: "NE", name: "Neuenburg", slug: "neuenburg", region: "Espace Mittelland" },
  { code: "NW", name: "Nidwalden", slug: "nidwalden", region: "Zentralschweiz" },
  { code: "OW", name: "Obwalden", slug: "obwalden", region: "Zentralschweiz" },
  { code: "SG", name: "St. Gallen", slug: "st-gallen", region: "Ostschweiz" },
  { code: "SH", name: "Schaffhausen", slug: "schaffhausen", region: "Ostschweiz" },
  { code: "SO", name: "Solothurn", slug: "solothurn", region: "Nordwestschweiz" },
  { code: "SZ", name: "Schwyz", slug: "schwyz", region: "Zentralschweiz" },
  { code: "TG", name: "Thurgau", slug: "thurgau", region: "Ostschweiz" },
  { code: "TI", name: "Tessin", slug: "tessin", region: "Tessin" },
  { code: "UR", name: "Uri", slug: "uri", region: "Zentralschweiz" },
  { code: "VD", name: "Waadt", slug: "waadt", region: "Genferseeregion" },
  { code: "VS", name: "Wallis", slug: "wallis", region: "Genferseeregion" },
  { code: "ZG", name: "Zug", slug: "zug", region: "Zentralschweiz" },
  { code: "ZH", name: "Zürich", slug: "zuerich", region: "Zürich" },
];

const FEATURES = [
  { key: "directory_listing", name: "Eintrag im Verzeichnis", description: "Sichtbar im Fasnachts- bzw. Guggenverzeichnis.", sortOrder: 10 },
  { key: "public_page", name: "Eigene öffentliche Seite", description: "Profilseite mit eigener, lesbarer Adresse.", sortOrder: 20 },
  { key: "social_links", name: "Website und Social Media", description: "Verlinke deine eigenen Kanäle.", sortOrder: 30 },
  { key: "events", name: "Veranstaltungen in der Agenda", description: "Termine erscheinen schweizweit in der Agenda.", sortOrder: 40 },
  { key: "gallery", name: "Bildergalerie", description: "Zeige Impressionen deiner Organisation.", sortOrder: 50 },
  { key: "program", name: "Programmübersicht", description: "Detailliertes Programm auf der Profilseite.", sortOrder: 60 },
  { key: "sponsors", name: "Sponsorenbereich", description: "Präsentiere deine Partner mit Logo und Link.", sortOrder: 70 },
  { key: "faq", name: "FAQ-Bereich", description: "Beantworte häufige Fragen direkt auf der Seite.", sortOrder: 80 },
  { key: "downloads", name: "Downloads", description: "Stelle Flyer und Dokumente bereit.", sortOrder: 90 },
  { key: "statistics", name: "Besucherstatistik", description: "Auswertung der Aufrufe und Klicks.", sortOrder: 100 },
  { key: "marketplace_active", name: "Aktive Inserate", description: "Gleichzeitig öffentlich sichtbare Inserate.", sortOrder: 120 },
  { key: "marketplace_images", name: "Bilder pro Inserat", description: "Maximale Anzahl Bilder je Inserat.", sortOrder: 130 },
  { key: "marketplace_days", name: "Inserate-Laufzeit (Tage)", description: "Laufzeit ab Veröffentlichung oder Verlängerung.", sortOrder: 140 },
  { key: "marketplace_external_contact", name: "Direkter Inserate-Kontakt", description: "E-Mail und Telefon zusätzlich zum Fas-Nav-Kontakt.", sortOrder: 150 },
  { key: "marketplace_featured", name: "Bevorzugte Inserate-Platzierung", description: "Hervorhebung in der Inserate-Übersicht.", sortOrder: 160 },
  { key: "audio_samples", name: "Hörproben", description: "Maximale Anzahl MP3-Hörproben.", sortOrder: 170 },
  { key: "audio_seconds", name: "Hörproben-Länge (Sekunden)", description: "Maximale Länge eines MP3-Ausschnitts.", sortOrder: 180 },
  { key: "highlighted", name: "Hervorgehobene Darstellung", description: "Bevorzugte Platzierung in Listen.", sortOrder: 110 },
];

/** Tarifdefinition: Preise und Funktionsumfang sind reine Daten. */
const PLANS = [
  {
    key: "free",
    tier: "FREE" as const,
    name: "Verzeichnis",
    description: "Kostenloser Basiseintrag – ideal für von Fas-Nav vorangelegte Profile.",
    priceChf: 0,
    isRecommended: false,
    isPublic: false,
    sortOrder: 10,
    features: {
      directory_listing: { enabled: true },
      public_page: { enabled: true },
      social_links: { enabled: true },
      events: { enabled: true, limit: 3 },
      marketplace_active: { enabled: true, limit: 1 }, marketplace_images: { enabled: true, limit: 3 }, marketplace_days: { enabled: true, limit: 30 }, audio_samples: { enabled: true, limit: 1 }, audio_seconds: { enabled: true, limit: 30 },
    },
  },
  {
    key: "basic",
    tier: "BASIC" as const,
    name: "Basis",
    description: "Der solide Auftritt für Fasnachten und Guggen.",
    priceChf: 25,
    isRecommended: false,
    isPublic: true,
    sortOrder: 20,
    features: {
      directory_listing: { enabled: true },
      public_page: { enabled: true },
      social_links: { enabled: true },
      events: { enabled: true, limit: 20 },
      program: { enabled: true },
      faq: { enabled: true },
      marketplace_active: { enabled: true, limit: 5 }, marketplace_images: { enabled: true, limit: 8 }, marketplace_days: { enabled: true, limit: 60 }, marketplace_external_contact: { enabled: true }, audio_samples: { enabled: true, limit: 3 }, audio_seconds: { enabled: true, limit: 60 },
    },
  },
  {
    key: "premium",
    tier: "PREMIUM" as const,
    name: "Premium",
    description: "Der volle Auftritt mit Galerie, Sponsoren und Statistik.",
    priceChf: 50,
    isRecommended: true,
    isPublic: true,
    sortOrder: 30,
    features: {
      directory_listing: { enabled: true },
      public_page: { enabled: true },
      social_links: { enabled: true },
      events: { enabled: true },
      gallery: { enabled: true, limit: 40 },
      program: { enabled: true },
      sponsors: { enabled: true, limit: 20 },
      faq: { enabled: true },
      downloads: { enabled: true, limit: 20 },
      statistics: { enabled: true },
      highlighted: { enabled: true },
      marketplace_active: { enabled: true, limit: 15 }, marketplace_images: { enabled: true, limit: 12 }, marketplace_days: { enabled: true, limit: 90 }, marketplace_external_contact: { enabled: true }, marketplace_featured: { enabled: true }, audio_samples: { enabled: true, limit: 5 }, audio_seconds: { enabled: true, limit: 180 },
    },
  },
];

const SETTINGS: { key: string; value: string; group: string; label: string }[] = [
  { key: "operator_name", value: "Fas-Nav.ch", group: "general", label: "Betreiberin" },
  { key: "operator_address", value: "Musterstrasse 1", group: "general", label: "Adresse" },
  { key: "operator_zip_city", value: "4600 Olten", group: "general", label: "PLZ / Ort" },
  { key: "operator_phone", value: "", group: "general", label: "Telefon" },
  { key: "operator_uid", value: "", group: "general", label: "UID" },
  { key: "contact_email", value: "info@fas-nav.ch", group: "contact", label: "Kontakt-E-Mail" },
  { key: "cta_price_label", value: "ab CHF 25.– / Jahr", group: "pricing", label: "Preishinweis" },
  { key: "pricing_title", value: "Deine Fasnacht. Deine Gugge. Deine Seite.", group: "pricing", label: "Titel Preisseite" },
  {
    key: "pricing_subtitle",
    value:
      "Präsentiere deine Organisation auf Fas-Nav.ch und erreiche Fasnachtsbegeisterte in der ganzen Schweiz. Faire Jahrespreise, jederzeit selbst bearbeitbar.",
    group: "pricing",
    label: "Untertitel Preisseite",
  },
];

const HOMEPAGE_SECTIONS: {
  key: string;
  type: Prisma.HomepageSectionCreateInput["type"];
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  sortOrder: number;
  data?: Prisma.InputJsonValue;
}[] = [
  {
    key: "hero",
    type: "HERO",
    eyebrow: "Schweizweit · Kostenlos für Besucher",
    title: "Die Schweizer Fasnacht auf einen Blick.",
    subtitle:
      "Entdecke Fasnachten, Guggen, Umzüge und Veranstaltungen in der ganzen Schweiz – aktuell, übersichtlich und an einem Ort.",
    sortOrder: 10,
    data: {
      buttons: [
        { label: "Fasnachten entdecken", href: "/fasnachten", variant: "primary" },
        { label: "Guggen entdecken", href: "/guggen", variant: "secondary" },
        { label: "Agenda öffnen", href: "/agenda", variant: "secondary" },
      ],
    },
  },
  {
    key: "info",
    type: "INFO",
    eyebrow: "Wofür Fas-Nav.ch",
    title: "Alles, was du zur Fasnacht wissen musst",
    subtitle:
      "Ob du am Wochenende einen Umzug suchst oder wissen willst, wann deine Gugge auftritt – Fas-Nav.ch beantwortet die Fragen der Fasnachtssaison.",
    sortOrder: 20,
    data: {
      items: [
        {
          title: "Wo ist dieses Wochenende Fasnacht?",
          body: "Die Agenda zeigt dir alle kommenden Termine – gefiltert nach Datum, Kanton und Veranstaltungstyp.",
          icon: "calendar",
        },
        {
          title: "Welche Guggen gibt es in meiner Region?",
          body: "Im Guggenverzeichnis findest du Guggenmusiken mit Auftritten, Geschichte und Kontakt.",
          icon: "music",
        },
        {
          title: "Wann ist der nächste Umzug?",
          body: "Umzüge, Monsterkonzerte und Maskenbälle – chronologisch sortiert und immer aktuell.",
          icon: "map",
        },
      ],
    },
  },
  {
    key: "upcoming_events",
    type: "UPCOMING_EVENTS",
    eyebrow: "Agenda",
    title: "Kommende Veranstaltungen",
    subtitle: "Die nächsten Termine der Schweizer Fasnacht.",
    sortOrder: 30,
    data: { limit: 6 },
  },
  {
    key: "featured_carnivals",
    type: "FEATURED_CARNIVALS",
    eyebrow: "Fasnachten",
    title: "Fasnachten entdecken",
    subtitle: "Von der grossen Stadtfasnacht bis zur Dorffasnacht.",
    sortOrder: 40,
    data: { limit: 3 },
  },
  {
    key: "featured_guggen",
    type: "FEATURED_GUGGEN",
    eyebrow: "Guggen",
    title: "Guggenmusiken entdecken",
    subtitle: "Die Klangkörper der Schweizer Fasnacht.",
    sortOrder: 50,
    data: { limit: 3 },
  },
  {
    key: "canton_grid",
    type: "CANTON_GRID",
    eyebrow: "Regionen",
    title: "Fasnacht nach Kanton",
    subtitle: "Die Schweizer Fasnacht ist regional geprägt – finde, was in deiner Region läuft.",
    sortOrder: 60,
  },
  {
    key: "organisation_cta",
    type: "ORGANISATION_CTA",
    eyebrow: "Für Organisationen",
    title: "Deine Fasnacht. Deine Gugge. Deine Seite.",
    subtitle:
      "Präsentiere deine Organisation auf Fas-Nav.ch und erreiche Fasnachtsbegeisterte in der ganzen Schweiz.",
    sortOrder: 70,
    data: {
      buttons: [
        { label: "Fasnacht eintragen", href: "/organisation-eintragen", variant: "primary" },
        { label: "Gugge eintragen", href: "/organisation-eintragen", variant: "secondary" },
      ],
      items: [
        { title: "Eigene öffentliche Profilseite", body: "Unter fas-nav.ch/fasnacht/deine-fasnacht" },
        { title: "Jederzeit selbst bearbeiten", body: "Live-Editor ohne technische Kenntnisse" },
        { title: "Veranstaltungen veröffentlichen", body: "Automatisch in der schweizweiten Agenda" },
        { title: "Website und Social Media verlinken", body: "Führe Besucher zu deinen Kanälen" },
        { title: "Mehr Reichweite gewinnen", body: "Sichtbar über Kantons- und Agendaseiten" },
      ],
    },
  },
  {
    key: "faq",
    type: "FAQ",
    eyebrow: "Fragen",
    title: "Häufige Fragen",
    sortOrder: 80,
    data: {
      items: [
        {
          title: "Ist Fas-Nav.ch für Besucher kostenlos?",
          body: "Ja. Agenda, Verzeichnisse und alle Profilseiten sind für Besucherinnen und Besucher vollständig kostenlos und ohne Konto nutzbar.",
        },
        {
          title: "Wie trage ich meine Fasnacht oder Gugge ein?",
          body: "Sende uns das Formular unter „Organisation eintragen“. Wir richten dein Konto ein, danach pflegst du deine Seite selbst.",
        },
        {
          title: "Was kostet ein Eintrag?",
          body: "Die Jahresabos starten bei CHF 25.–. Die aktuellen Konditionen findest du auf der Preisseite.",
        },
        {
          title: "Mein Profil besteht bereits, gehört mir aber nicht. Was tun?",
          body: "Einige Profile haben wir selbst angelegt, damit das Verzeichnis nützlich ist. Über „Profil übernehmen“ kannst du es beanspruchen.",
        },
      ],
    },
  },
];

async function main() {
  console.log("→ Kantone …");
  for (const canton of CANTONS) {
    await prisma.canton.upsert({
      where: { code: canton.code },
      create: canton,
      update: { name: canton.name, slug: canton.slug, region: canton.region },
    });
  }

  console.log("→ Funktionen …");
  for (const feature of FEATURES) {
    await prisma.feature.upsert({
      where: { key: feature.key },
      create: feature,
      update: { name: feature.name, description: feature.description, sortOrder: feature.sortOrder },
    });
  }
  const featureByKey = new Map(
    (await prisma.feature.findMany()).map((f) => [f.key, f.id]),
  );

  console.log("→ Tarife …");
  for (const plan of PLANS) {
    const { features, ...planData } = plan;
    const record = await prisma.plan.upsert({
      where: { key: plan.key },
      create: { ...planData, billingInterval: "YEARLY" },
      update: {
        name: planData.name,
        description: planData.description,
        priceChf: planData.priceChf,
        tier: planData.tier,
        isRecommended: planData.isRecommended,
        isPublic: planData.isPublic,
        sortOrder: planData.sortOrder,
      },
    });

    await prisma.planFeature.deleteMany({ where: { planId: record.id } });
    await prisma.planFeature.createMany({
      data: Object.entries(features).map(([key, config]) => ({
        planId: record.id,
        featureId: featureByKey.get(key)!,
        enabled: config.enabled,
        limit: "limit" in config ? config.limit : null,
      })),
    });
  }

  console.log("→ Einstellungen …");
  for (const setting of SETTINGS) {
    await prisma.siteSetting.upsert({
      where: { key: setting.key },
      create: { key: setting.key, value: setting.value, group: setting.group, label: setting.label },
      update: { group: setting.group, label: setting.label },
    });
  }

  console.log("→ Homepage-Sektionen …");
  for (const section of HOMEPAGE_SECTIONS) {
    await prisma.homepageSection.upsert({
      where: { key: section.key },
      create: {
        key: section.key,
        type: section.type,
        eyebrow: section.eyebrow,
        title: section.title,
        subtitle: section.subtitle,
        sortOrder: section.sortOrder,
        data: section.data,
      },
      update: {
        type: section.type,
        sortOrder: section.sortOrder,
      },
    });
  }

  await seedDemoContent(featureByKey);
  console.log("\n✔ Seed abgeschlossen.");
}

async function seedDemoContent(_featureByKey: Map<string, string>) {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@fas-nav.ch";
  const teamEmail = process.env.SEED_TEAM_EMAIL ?? "team@fas-nav.ch";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Fasnacht2027!";
  const teamPassword = process.env.SEED_TEAM_PASSWORD ?? "Fasnacht2027!";
  const orgPassword = process.env.SEED_ORG_PASSWORD ?? "Fasnacht2027!";

  const hash = (plain: string) => bcrypt.hash(plain, 12);

  console.log("→ Accounts …");
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      name: "Anna Admin",
      role: "ADMIN",
      passwordHash: await hash(adminPassword),
      emailVerified: new Date(),
    },
    update: { role: "ADMIN", isActive: true },
  });

  await prisma.user.upsert({
    where: { email: teamEmail },
    create: {
      email: teamEmail,
      name: "Tim Team",
      role: "TEAM",
      passwordHash: await hash(teamPassword),
      emailVerified: new Date(),
      createdById: admin.id,
    },
    update: { role: "TEAM", isActive: true },
  });

  const cantons = new Map((await prisma.canton.findMany()).map((c) => [c.code, c.id]));
  const plans = new Map((await prisma.plan.findMany()).map((p) => [p.key, p]));

  // Fasnachtssaison des kommenden Jahres – so bleiben Termine stets „kommend“.
  const now = new Date();
  const season = now.getMonth() > 3 ? now.getFullYear() + 1 : now.getFullYear();

  const organizations: {
    slug: string;
    type: OrganizationType;
    name: string;
    cantonCode: string;
    city: string;
    plan: string;
    account?: { email: string; name: string };
    data: Prisma.OrganizationCreateInput | Record<string, unknown>;
  }[] = [
    {
      slug: "oltner-fasnacht",
      type: "CARNIVAL",
      name: "Oltner Fasnacht",
      cantonCode: "SO",
      city: "Olten",
      plan: "premium",
      account: { email: "oltner-fasnacht@example.ch", name: "Peter Präsident" },
      data: {
        tagline: "Vier Tage Ausnahmezustand an der Aare.",
        shortDescription:
          "Die Oltner Fasnacht verwandelt die Altstadt in eine Bühne aus Guggenmusik, Wagen und Schnitzelbänken.",
        description:
          "Die Oltner Fasnacht gehört zu den grössten Fasnachten der Nordwestschweiz. Vom Schmutzigen Donnerstag bis zum Güdisdienstag prägen Umzüge, Guggenkonzerte und Beizenfasnacht das Bild der Altstadt.\n\nHöhepunkt ist der grosse Umzug am Sonntagnachmittag mit über sechzig Formationen aus der ganzen Region. Am Abend übernehmen die Guggenmusiken die Gassen und spielen bis tief in die Nacht.\n\nDie Kinderfasnacht am Montagvormittag richtet sich an die jüngsten Fasnächtlerinnen und Fasnächtler und ist bei Familien aus der ganzen Region beliebt.",
        importantInfo:
          "Die Altstadt ist während der Fasnachtstage für den Verkehr gesperrt. Wir empfehlen die Anreise mit dem öffentlichen Verkehr.",
        startDate: new Date(season, 1, 12),
        endDate: new Date(season, 1, 16),
        contactName: "Fasnachtskomitee Olten",
        contactEmail: "info@oltner-fasnacht.example.ch",
        contactPhone: "062 000 00 00",
        website: "https://www.example.ch/oltner-fasnacht",
        verification: "VERIFIED",
        status: "PUBLISHED",
        claimStatus: "CLAIMED",
        isFeatured: true,
        onboardingCompleted: true,
      },
    },
    {
      slug: "luzerner-fasnacht",
      type: "CARNIVAL",
      name: "Luzerner Fasnacht",
      cantonCode: "LU",
      city: "Luzern",
      plan: "basic",
      data: {
        tagline: "Wenn der Fritschi die Stadt übernimmt.",
        shortDescription:
          "Die Luzerner Fasnacht startet mit dem Urknall und füllt die Altstadt mit Guggenmusik und Konfetti.",
        description:
          "Die Luzerner Fasnacht beginnt am Schmutzigen Donnerstag um fünf Uhr morgens mit dem legendären Urknall. Danach ziehen Guggenmusiken und maskierte Gruppen durch die Altstadt.\n\nDie Fasnacht wird von den Zünften geprägt und ist bekannt für ihre farbenfrohen Umzüge, die Tausende von Besucherinnen und Besuchern anziehen.",
        startDate: new Date(season, 1, 12),
        endDate: new Date(season, 1, 17),
        contactEmail: "kontakt@luzerner-fasnacht.example.ch",
        website: "https://www.example.ch/luzerner-fasnacht",
        verification: "UNVERIFIED",
        status: "PUBLISHED",
        claimStatus: "UNCLAIMED",
        onboardingCompleted: false,
      },
    },
    {
      slug: "guggenmusik-chesslete-olten",
      type: "GUGGE",
      name: "Guggenmusik Chesslete Olten",
      cantonCode: "SO",
      city: "Olten",
      plan: "premium",
      account: { email: "chesslete@example.ch", name: "Marta Marketing" },
      data: {
        tagline: "Laut, präzis und mit Herzblut seit 1978.",
        shortDescription:
          "Rund 45 Musikantinnen und Musikanten aus Olten und Umgebung – bekannt für kräftigen Sound und markante Kostüme.",
        description:
          "Die Guggenmusik Chesslete Olten wurde 1978 gegründet und zählt heute rund 45 Aktive. Wir spielen an Fasnachten in der ganzen Deutschschweiz und treten regelmässig an Monsterkonzerten auf.\n\nUnser Repertoire reicht von Rock-Klassikern bis zu aktuellen Charthits, immer im typischen Guggensound arrangiert.",
        history:
          "Gegründet wurde die Chesslete 1978 von einer Handvoll Fasnächtler, die der Oltner Fasnacht mehr Klang verleihen wollten. Aus der kleinen Gruppe wurde über die Jahre eine der prägenden Guggen der Region.",
        repertoire:
          "Rock-Klassiker, Schweizer Mundart-Hits und aktuelle Charts – arrangiert für Blech, Holz und Schlagwerk.",
        musicStyle: "Rock und Charts",
        foundedYear: 1978,
        memberCount: 45,
        contactName: "Vorstand Chesslete",
        contactEmail: "kontakt@chesslete.example.ch",
        bookingEmail: "booking@chesslete.example.ch",
        website: "https://www.example.ch/chesslete",
        verification: "VERIFIED",
        status: "PUBLISHED",
        claimStatus: "CLAIMED",
        isFeatured: true,
        onboardingCompleted: true,
      },
    },
    {
      slug: "gugge-seebueebe-luzern",
      type: "GUGGE",
      name: "Seebüebe Luzern",
      cantonCode: "LU",
      city: "Luzern",
      plan: "basic",
      data: {
        tagline: "Guggensound vom Vierwaldstättersee.",
        shortDescription:
          "Junge Guggenmusik aus Luzern mit rund 30 Mitgliedern und Auftritten in der ganzen Zentralschweiz.",
        description:
          "Die Seebüebe Luzern sind eine junge Guggenmusik mit rund 30 Mitgliedern. Wir legen Wert auf ein modernes Repertoire und ein familiäres Vereinsleben.",
        foundedYear: 2004,
        memberCount: 30,
        contactEmail: "info@seebueebe.example.ch",
        verification: "UNVERIFIED",
        status: "PUBLISHED",
        claimStatus: "UNCLAIMED",
        onboardingCompleted: false,
      },
    },
  ];

  console.log("→ Organisationen …");
  const orgIds = new Map<string, string>();

  for (const entry of organizations) {
    const cantonId = cantons.get(entry.cantonCode);
    if (!cantonId) continue;

    const org = await prisma.organization.upsert({
      where: { slug: entry.slug },
      create: {
        slug: entry.slug,
        type: entry.type,
        name: entry.name,
        city: entry.city,
        cantonId,
        publishedAt: new Date(),
        ...(entry.data as object),
      } as Prisma.OrganizationUncheckedCreateInput,
      update: { name: entry.name, city: entry.city, cantonId },
    });
    orgIds.set(entry.slug, org.id);

    // Social Links
    await prisma.socialLink.deleteMany({ where: { organizationId: org.id } });
    await prisma.socialLink.createMany({
      data: [
        { organizationId: org.id, platform: "FACEBOOK", url: `https://facebook.com/${entry.slug}`, sortOrder: 0 },
        { organizationId: org.id, platform: "INSTAGRAM", url: `https://instagram.com/${entry.slug}`, sortOrder: 1 },
      ],
    });

    // Abonnement
    const plan = plans.get(entry.plan);
    if (plan) {
      const endDate = new Date(season, 6, 31);
      await prisma.subscription.upsert({
        where: { organizationId: org.id },
        create: {
          organizationId: org.id,
          planId: plan.id,
          priceChf: plan.priceChf,
          status: "ACTIVE",
          startDate: new Date(season - 1, 7, 1),
          endDate,
          nextDueAt: endDate,
          lastPaymentAt: new Date(season - 1, 7, 5),
        },
        update: { planId: plan.id, status: "ACTIVE", endDate },
      });
    }

    // Account und Membership
    if (entry.account) {
      const user = await prisma.user.upsert({
        where: { email: entry.account.email },
        create: {
          email: entry.account.email,
          name: entry.account.name,
          role: entry.type === "CARNIVAL" ? "FASNACHT" : "GUGGE",
          passwordHash: await hash(orgPassword),
          emailVerified: new Date(),
          createdById: admin.id,
        },
        update: {},
      });

      await prisma.membership.upsert({
        where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
        create: { userId: user.id, organizationId: org.id, role: "OWNER", title: "Präsidium" },
        update: {},
      });
    }
  }

  // Zweiter Account auf derselben Organisation sowie ein Konto mit Zugriff auf
  // zwei Organisationen – zeigt beide Richtungen der n:m-Beziehung.
  const oltenId = orgIds.get("oltner-fasnacht");
  const chessleteId = orgIds.get("guggenmusik-chesslete-olten");
  if (oltenId) {
    const webmaster = await prisma.user.upsert({
      where: { email: "webmaster-olten@example.ch" },
      create: {
        email: "webmaster-olten@example.ch",
        name: "Wanda Webmaster",
        role: "FASNACHT",
        passwordHash: await hash(orgPassword),
        emailVerified: new Date(),
        createdById: admin.id,
      },
      update: {},
    });
    await prisma.membership.upsert({
      where: { userId_organizationId: { userId: webmaster.id, organizationId: oltenId } },
      create: { userId: webmaster.id, organizationId: oltenId, role: "MANAGER", title: "Webmaster" },
      // Seed-Daten sollen den gewünschten Demonstrationszustand herstellen.
      update: { role: "MANAGER", title: "Webmaster" },
    });

    // Dasselbe Konto betreut zusätzlich eine Gugge.
    if (chessleteId) {
      await prisma.membership.upsert({
        where: {
          userId_organizationId: { userId: webmaster.id, organizationId: chessleteId },
        },
        create: {
          userId: webmaster.id,
          organizationId: chessleteId,
          role: "EDITOR",
          title: "Webmaster",
        },
        update: {},
      });
    }
  }

  console.log("→ Veranstaltungen …");
  const events: {
    slug: string;
    org: string;
    title: string;
    type: Prisma.EventCreateInput["type"];
    day: number;
    month: number;
    hour: number;
    endHour?: number;
    city: string;
    cantonCode: string;
    venueName: string;
    price?: number;
    shortDescription: string;
  }[] = [
    {
      slug: `grosser-umzug-olten-${season}`,
      org: "oltner-fasnacht",
      title: `Grosser Fasnachtsumzug Olten ${season}`,
      type: "UMZUG",
      month: 1,
      day: 15,
      hour: 14,
      endHour: 17,
      city: "Olten",
      cantonCode: "SO",
      venueName: "Altstadt Olten",
      price: 0,
      shortDescription:
        "Über sechzig Formationen ziehen durch die Oltner Altstadt – Wagen, Guggen und Fussgruppen.",
    },
    {
      slug: `monsterkonzert-olten-${season}`,
      org: "oltner-fasnacht",
      title: `Monsterkonzert Olten ${season}`,
      type: "MONSTERKONZERT",
      month: 1,
      day: 14,
      hour: 20,
      endHour: 23,
      city: "Olten",
      cantonCode: "SO",
      venueName: "Stadthalle Olten",
      price: 25,
      shortDescription: "Zwölf Guggenmusiken auf einer Bühne – das Klanghighlight der Saison.",
    },
    {
      slug: `kinderfasnacht-olten-${season}`,
      org: "oltner-fasnacht",
      title: `Kinderfasnacht Olten ${season}`,
      type: "KINDERFASNACHT",
      month: 1,
      day: 16,
      hour: 10,
      endHour: 12,
      city: "Olten",
      cantonCode: "SO",
      venueName: "Kirchgasse Olten",
      price: 0,
      shortDescription: "Der Umzug für die Jüngsten mit Konfetti, Musik und Znüni.",
    },
    {
      slug: `urknall-luzern-${season}`,
      org: "luzerner-fasnacht",
      title: `Urknall Luzern ${season}`,
      type: "HAUPTFASNACHT",
      month: 1,
      day: 12,
      hour: 5,
      endHour: 9,
      city: "Luzern",
      cantonCode: "LU",
      venueName: "Kapellplatz",
      price: 0,
      shortDescription: "Um fünf Uhr morgens beginnt die Luzerner Fasnacht mit dem Urknall.",
    },
    {
      slug: `guggenkonzert-chesslete-${season}`,
      org: "guggenmusik-chesslete-olten",
      title: `Guggenkonzert Chesslete ${season}`,
      type: "GUGGENKONZERT",
      month: 1,
      day: 13,
      hour: 19,
      endHour: 22,
      city: "Olten",
      cantonCode: "SO",
      venueName: "Kulturzentrum Schützi",
      price: 15,
      shortDescription: "Unser Jahreskonzert mit neuem Programm und Gastformationen.",
    },
    {
      slug: `auftritt-seebueebe-luzern-${season}`,
      org: "gugge-seebueebe-luzern",
      title: `Seebüebe am Fritschiumzug ${season}`,
      type: "UMZUG",
      month: 1,
      day: 15,
      hour: 13,
      endHour: 16,
      city: "Luzern",
      cantonCode: "LU",
      venueName: "Innenstadt Luzern",
      price: 0,
      shortDescription: "Unser Auftritt am grossen Fritschiumzug in der Luzerner Innenstadt.",
    },
  ];

  for (const event of events) {
    const organizationId = orgIds.get(event.org);
    const cantonId = cantons.get(event.cantonCode);
    if (!organizationId || !cantonId) continue;

    await prisma.event.upsert({
      where: { slug: event.slug },
      create: {
        slug: event.slug,
        organizationId,
        cantonId,
        title: event.title,
        type: event.type,
        shortDescription: event.shortDescription,
        startDate: new Date(season, event.month, event.day, event.hour, 0),
        endDate: event.endHour
          ? new Date(season, event.month, event.day, event.endHour, 0)
          : null,
        city: event.city,
        venueName: event.venueName,
        price: event.price,
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
      update: {
        title: event.title,
        startDate: new Date(season, event.month, event.day, event.hour, 0),
        status: "PUBLISHED",
      },
    });
  }

  console.log("→ Programm, Sponsoren und FAQ …");
  if (oltenId) {
    await prisma.programItem.deleteMany({ where: { organizationId: oltenId } });
    await prisma.programItem.createMany({
      data: [
        {
          organizationId: oltenId,
          title: "Schmutziger Donnerstag – Eröffnung",
          timeLabel: "05:00 Uhr",
          place: "Altstadt",
          day: new Date(season, 1, 12),
          description: "Die Fasnacht beginnt mit der traditionellen Eröffnung auf dem Marktplatz.",
          sortOrder: 0,
        },
        {
          organizationId: oltenId,
          title: "Monsterkonzert",
          timeLabel: "20:00 Uhr",
          place: "Stadthalle",
          day: new Date(season, 1, 14),
          sortOrder: 1,
        },
        {
          organizationId: oltenId,
          title: "Grosser Umzug",
          timeLabel: "14:00 Uhr",
          place: "Altstadt",
          day: new Date(season, 1, 15),
          sortOrder: 2,
        },
        {
          organizationId: oltenId,
          title: "Kinderfasnacht",
          timeLabel: "10:00 Uhr",
          place: "Kirchgasse",
          day: new Date(season, 1, 16),
          sortOrder: 3,
        },
      ],
    });

    await prisma.sponsor.deleteMany({ where: { organizationId: oltenId } });
    await prisma.sponsor.createMany({
      data: [
        { organizationId: oltenId, name: "Regionalbank Olten", tier: "Hauptsponsor", url: "https://example.ch", sortOrder: 0 },
        { organizationId: oltenId, name: "Brauerei zur Aare", tier: "Goldsponsor", url: "https://example.ch", sortOrder: 1 },
        { organizationId: oltenId, name: "Druckerei Mittelland", tier: "Partner", sortOrder: 2 },
      ],
    });

    await prisma.faq.deleteMany({ where: { organizationId: oltenId } });
    await prisma.faq.createMany({
      data: [
        {
          organizationId: oltenId,
          question: "Kostet der Umzug Eintritt?",
          answer: "Nein, der Umzug ist frei zugänglich. Für das Monsterkonzert wird ein Eintritt erhoben.",
          sortOrder: 0,
        },
        {
          organizationId: oltenId,
          question: "Wie reise ich am besten an?",
          answer: "Mit dem Zug bis Olten – der Bahnhof liegt fünf Gehminuten von der Altstadt entfernt. Parkplätze sind während der Fasnacht stark eingeschränkt.",
          sortOrder: 1,
        },
      ],
    });
  }

  console.log("→ Tickets …");
  const oltenUser = await prisma.user.findUnique({ where: { email: "oltner-fasnacht@example.ch" } });
  if (oltenUser && oltenId) {
    const existing = await prisma.ticket.findFirst({ where: { organizationId: oltenId } });
    if (!existing) {
      await prisma.ticket.create({
        data: {
          subject: "Titelbild wird unscharf dargestellt",
          category: "TECHNICAL",
          priority: "NORMAL",
          status: "OPEN",
          organizationId: oltenId,
          authorId: oltenUser.id,
          messages: {
            create: [
              {
                authorId: oltenUser.id,
                body: "Unser neues Titelbild wirkt auf dem Smartphone unscharf. Gibt es eine empfohlene Auflösung?",
              },
            ],
          },
        },
      });

      await prisma.ticket.create({
        data: {
          subject: "Frage zur Rechnung 2027",
          category: "INVOICE",
          priority: "LOW",
          status: "RESOLVED",
          organizationId: oltenId,
          authorId: oltenUser.id,
          closedAt: new Date(),
          messages: {
            create: [
              { authorId: oltenUser.id, body: "Können wir die Rechnung auf den Verein ausstellen lassen?" },
              { authorId: admin.id, body: "Gerne – wir haben die Rechnungsadresse angepasst." },
            ],
          },
        },
      });
    }
  }

  console.log("→ Zahlungen …");
  for (const [slug, id] of orgIds) {
    const subscription = await prisma.subscription.findUnique({ where: { organizationId: id } });
    if (!subscription) continue;

    const invoiceNumber = `RE-${season - 1}-${String([...orgIds.keys()].indexOf(slug) + 1).padStart(4, "0")}`;
    const existing = await prisma.payment.findUnique({ where: { invoiceNumber } });
    if (existing) continue;

    await prisma.payment.create({
      data: {
        organizationId: id,
        subscriptionId: subscription.id,
        invoiceNumber,
        amountChf: subscription.priceChf,
        status: "PAID",
        method: "INVOICE",
        issuedAt: new Date(season - 1, 7, 1),
        dueAt: new Date(season - 1, 7, 31),
        paidAt: new Date(season - 1, 7, 5),
        periodStart: new Date(season - 1, 7, 1),
        periodEnd: new Date(season, 6, 31),
      },
    });
  }

  // Übernahmestatus an den tatsächlichen Zuweisungen ausrichten.
  console.log("→ Übernahmestatus abgleichen …");
  for (const [, id] of orgIds) {
    await syncClaimStatus(prisma, id);
  }

  console.log("\nZugangsdaten:");
  console.log(`  ADMIN     ${adminEmail} / ${adminPassword}`);
  console.log(`  TEAM      ${teamEmail} / ${teamPassword}`);
  console.log(`  FASNACHT  oltner-fasnacht@example.ch / ${orgPassword}`);
  console.log(
    `  FASNACHT  webmaster-olten@example.ch / ${orgPassword}  (zwei Organisationen: Oltner Fasnacht + Chesslete)`,
  );
  console.log(`  GUGGE     chesslete@example.ch / ${orgPassword}`);
}

main()
  .catch((error) => {
    console.error("Seed fehlgeschlagen:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
