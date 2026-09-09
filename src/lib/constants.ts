import type {
  EventType,
  MediaType,
  OrganizationType,
  PaymentMethod,
  PaymentStatus,
  PublicationStatus,
  Role,
  SocialPlatform,
  SubscriptionStatus,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  VerificationStatus,
  ClaimStatus,
  MembershipRole,
  PlacementType,
} from "@prisma/client";

export const SITE = {
  name: "Fas-Nav.ch",
  shortName: "Fas-Nav",
  logo: "FN",
  domain: "fas-nav.ch",
  tagline: "Die Schweizer Fasnacht auf einen Blick.",
  description:
    "Fas-Nav.ch ist die zentrale Übersicht für Fasnachten, Guggenmusiken, Umzüge und Fasnachtsveranstaltungen in der ganzen Schweiz.",
} as const;

/** Die 26 Schweizer Kantone inkl. Regionszuordnung für Landingpages und Filter. */
export const CANTONS = [
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
] as const;

export const REGIONS = Array.from(new Set(CANTONS.map((c) => c.region))).sort();

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  FASNACHT: "Fasnacht",
  UMZUG: "Umzug",
  GUGGENKONZERT: "Guggenkonzert",
  MONSTERKONZERT: "Monsterkonzert",
  MASKENBALL: "Maskenball",
  BEIZENFASNACHT: "Beizenfasnacht",
  KINDERFASNACHT: "Kinderfasnacht",
  SCHNITZELBANK: "Schnitzelbank",
  WAGENBAU: "Wagenbau",
  VORFASNACHT: "Vorfasnacht",
  HAUPTFASNACHT: "Hauptfasnacht",
  ABSCHLUSSVERANSTALTUNG: "Abschlussveranstaltung",
  SONSTIGE: "Sonstige Veranstaltung",
};

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  CARNIVAL: "Fasnacht",
  GUGGE: "Gugge",
};

export const PUBLICATION_STATUS_LABELS: Record<PublicationStatus, string> = {
  DRAFT: "Entwurf",
  PENDING_REVIEW: "In Prüfung",
  PUBLISHED: "Veröffentlicht",
  UNPUBLISHED: "Nicht veröffentlicht",
  SUSPENDED: "Gesperrt",
};

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  UNVERIFIED: "Nicht verifiziert",
  VERIFIED: "Verifiziert",
  OFFICIAL: "Offiziell",
};

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  UNCLAIMED: "Nicht beansprucht",
  CLAIM_REQUESTED: "Übernahme angefragt",
  CLAIMED: "Beansprucht",
};

/**
 * Bearbeitungsstand einer Übernahmeanfrage.
 *
 * Der Wert liegt als Text in ClaimRequest.status; PENDING ist der Standard
 * beim Eingang. IN_REVIEW ist neu dazugekommen, damit sichtbar ist, dass sich
 * jemand der Anfrage bereits angenommen hat.
 *
 * Nicht zu verwechseln mit Organization.claimStatus (CLAIM_STATUS_LABELS):
 * Der beschreibt das Profil, dieser hier die einzelne Anfrage.
 */
export const CLAIM_REQUEST_STATUS_LABELS = {
  PENDING: "Neu",
  IN_REVIEW: "In Prüfung",
  APPROVED: "Genehmigt",
  REJECTED: "Abgelehnt",
} as const;

export type ClaimRequestStatus = keyof typeof CLAIM_REQUEST_STATUS_LABELS;

/** Anfragen, die noch Arbeit verursachen – für Zähler und Hervorhebung. */
export const OPEN_CLAIM_REQUEST_STATUSES: ClaimRequestStatus[] = ["PENDING", "IN_REVIEW"];

/** Kontaktanfragen, die noch Arbeit verursachen. */
export const OPEN_CONTACT_TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"] as const;

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  TEAM: "Team",
  FASNACHT: "Fasnacht",
  GUGGE: "Gugge",
};

/** Bezeichnungen der organisationsinternen Berechtigungen. */
export const MEMBERSHIP_ROLE_LABELS: Record<MembershipRole, string> = {
  OWNER: "Vollzugriff",
  MANAGER: "Verwaltung",
  EDITOR: "Bearbeitung",
};

/** Kurzerklärung je Berechtigung – wird in der Oberfläche angezeigt. */
export const MEMBERSHIP_ROLE_DESCRIPTIONS: Record<MembershipRole, string> = {
  OWNER: "Darf alles verwalten, auch Benutzer und deren Zugriffe.",
  MANAGER: "Darf Inhalte, Veranstaltungen und Medien verwalten sowie veröffentlichen.",
  EDITOR: "Darf Inhalte und Veranstaltungen bearbeiten, aber nicht veröffentlichen.",
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIAL: "Testphase",
  ACTIVE: "Aktiv",
  PAYMENT_PENDING: "Zahlung ausstehend",
  EXPIRED: "Abgelaufen",
  CANCELLED: "Gekündigt",
  SUSPENDED: "Gesperrt",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Offen",
  PAID: "Bezahlt",
  FAILED: "Fehlgeschlagen",
  REFUNDED: "Rückerstattet",
  CANCELLED: "Storniert",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  INVOICE: "Rechnung",
  BANK_TRANSFER: "Banküberweisung",
  TWINT: "TWINT",
  CREDIT_CARD: "Kreditkarte",
  STRIPE: "Stripe",
  OTHER: "Andere",
};

/**
 * Sichtbare Bezeichnungen der Ticketzustände.
 *
 * Die Aufzählungswerte in der Datenbank bleiben unverändert – umbenannt wird
 * nur, was Menschen lesen. OPEN heisst hier bewusst „Wartet auf Fas-Nav.ch
 * Team“: Ein neu erfasstes Ticket und ein Ticket, auf das die Organisation
 * zuletzt geantwortet hat, warten beide auf uns. Genau diese Tickets zählt
 * auch der Zähler in der Seitenleiste.
 */
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Wartet auf Fas-Nav.ch Team",
  IN_PROGRESS: "In Bearbeitung",
  WAITING_FOR_CUSTOMER: "Warten auf Kunde",
  RESOLVED: "Gelöst",
  CLOSED: "Geschlossen",
};

/**
 * Zustände, in denen das Team am Zug ist.
 *
 * Massgeblich für den Zähler in der Seitenleiste. „Warten auf Kunde“,
 * „Gelöst“ und „Geschlossen“ zählen bewusst nicht mit – dort liegt der Ball
 * nicht bei uns.
 */
export const TICKET_STATUSES_AWAITING_TEAM: TicketStatus[] = ["OPEN"];

/**
 * Zustände, in denen die Organisation am Zug ist.
 *
 * Das Gegenstück zur Liste oben und die Grundlage des Zählers für
 * Organisationskonten: Für sie ist nicht interessant, worauf das Team noch
 * antworten muss, sondern was auf ihre eigene Rückmeldung wartet.
 */
export const TICKET_STATUSES_AWAITING_CUSTOMER: TicketStatus[] = ["WAITING_FOR_CUSTOMER"];

/**
 * Zustände, in denen die Antwortautomatik nicht eingreift.
 *
 * Ein abgeschlossenes Ticket soll durch eine nachträgliche Notiz oder eine
 * abschliessende Bemerkung des Teams nicht unbemerkt wieder aufgehen.
 */
export const TICKET_STATUSES_FINAL: TicketStatus[] = ["RESOLVED", "CLOSED"];

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: "Tief",
  NORMAL: "Normal",
  HIGH: "Hoch",
  URGENT: "Dringend",
};

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  TECHNICAL: "Technisches Problem",
  PAGE_EDIT: "Seite bearbeiten",
  SUBSCRIPTION: "Abonnement",
  INVOICE: "Rechnung",
  EVENT: "Veranstaltung",
  GENERAL: "Allgemeine Frage",
  CONTACT: "Kontaktanfrage",
  OTHER: "Sonstiges",
};

export const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  WEBSITE: "Website",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
  X: "X",
  LINKEDIN: "LinkedIn",
  SPOTIFY: "Spotify",
  WHATSAPP: "WhatsApp",
  OTHER: "Anderes Netzwerk",
};

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  LOGO: "Logo",
  HEADER: "Titelbild",
  GALLERY: "Galerie",
  SPONSOR: "Sponsor",
  EVENT: "Veranstaltung",
  HOMEPAGE: "Homepage",
  DOCUMENT: "Dokument",
};

export const PLACEMENT_TYPE_LABELS: Record<PlacementType, string> = {
  FEATURED_CARNIVAL: "Featured Fasnacht",
  FEATURED_GUGGE: "Featured Gugge",
  FEATURED_EVENT: "Featured Veranstaltung",
  HOMEPAGE_SLOT: "Homepage-Platzierung",
  CANTON_HIGHLIGHT: "Kanton-Highlight",
  AGENDA_HIGHLIGHT: "Agenda-Highlight",
};

/** Feature-Keys des Abo-Systems. Limits und Zuordnung kommen aus der Datenbank. */
export const FEATURE_KEYS = {
  DIRECTORY_LISTING: "directory_listing",
  PUBLIC_PAGE: "public_page",
  SOCIAL_LINKS: "social_links",
  EVENTS: "events",
  GALLERY: "gallery",
  SPONSORS: "sponsors",
  STATISTICS: "statistics",
  HIGHLIGHTED: "highlighted",
  PROGRAM: "program",
  DOWNLOADS: "downloads",
  FAQ: "faq",
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];

export const ALLOWED_IMAGE_MIME = ["image/png", "image/jpeg", "image/webp"] as const;
export const ALLOWED_IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp"] as const;

export const MAX_UPLOAD_BYTES =
  Number(process.env.MAX_UPLOAD_SIZE_MB ?? "8") * 1024 * 1024;

/** Wie lange vor Ablauf eine Abo-Warnung ausgelöst wird. */
export const SUBSCRIPTION_EXPIRY_WARNING_DAYS = 30;
