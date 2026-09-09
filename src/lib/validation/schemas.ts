import { z } from "zod";

import {
  cuid,
  dateInput,
  decimalAmount,
  email,
  optionalCuid,
  optionalDate,
  optionalDecimal,
  optionalEmail,
  optionalInt,
  optionalPhone,
  optionalText,
  optionalUrl,
  password,
  requiredText,
  safeText,
  slug,
} from "@/lib/validation/common";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Bitte Passwort eingeben.").max(200),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10).max(200),
    password,
    passwordConfirm: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "Die Passwörter stimmen nicht überein.",
    path: ["passwordConfirm"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Bitte aktuelles Passwort eingeben.").max(200),
    password,
    passwordConfirm: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "Die Passwörter stimmen nicht überein.",
    path: ["passwordConfirm"],
  });

// ---------------------------------------------------------------------------
// Benutzer
// ---------------------------------------------------------------------------

export const roleEnum = z.enum(["ADMIN", "TEAM", "FASNACHT", "GUGGE"]);
export const membershipRoleEnum = z.enum(["OWNER", "MANAGER", "EDITOR"]);

export const createUserSchema = z.object({
  name: requiredText(120, "Name"),
  email,
  role: roleEnum,
  password: password.optional(),
  phone: optionalPhone,
  organizationId: optionalCuid,
  membershipRole: membershipRoleEnum.default("OWNER"),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  name: requiredText(120, "Name").optional(),
  email: email.optional(),
  role: roleEnum.optional(),
  phone: optionalPhone.optional(),
  isActive: z.boolean().optional(),
});

export const setUserPasswordSchema = z.object({ password });

/** Bestehendes Konto einer Organisation zuweisen. */
export const membershipCreateSchema = z.object({
  userId: cuid,
  role: membershipRoleEnum.default("EDITOR"),
  title: optionalText(80),
});

/** Berechtigung einer bestehenden Zuweisung ändern. */
export const membershipUpdateSchema = z.object({
  role: membershipRoleEnum.optional(),
  title: optionalText(80).optional(),
});

/** Neues Konto anlegen und der Organisation direkt zuweisen. */
export const membershipInviteSchema = z.object({
  name: requiredText(120, "Name"),
  email,
  password: password.optional(),
  phone: optionalPhone,
  role: membershipRoleEnum.default("EDITOR"),
  title: optionalText(80),
});

// ---------------------------------------------------------------------------
// Organisationen
// ---------------------------------------------------------------------------

export const organizationTypeEnum = z.enum(["CARNIVAL", "GUGGE"]);
export const publicationStatusEnum = z.enum([
  "DRAFT",
  "PENDING_REVIEW",
  "PUBLISHED",
  "UNPUBLISHED",
  "SUSPENDED",
]);
export const verificationEnum = z.enum(["UNVERIFIED", "VERIFIED", "OFFICIAL"]);
export const claimStatusEnum = z.enum(["UNCLAIMED", "CLAIM_REQUESTED", "CLAIMED"]);

/** Felder, die eine Organisation selbst bearbeiten darf. */
export const organizationContentSchema = z.object({
  name: requiredText(140, "Name"),
  shortName: optionalText(60),
  tagline: optionalText(160),
  shortDescription: optionalText(400),
  description: optionalText(8000),
  history: optionalText(8000),
  importantInfo: optionalText(4000),
  city: requiredText(120, "Ort"),
  street: optionalText(160),
  zip: optionalText(10),
  cantonId: cuid,
  municipalityId: optionalCuid,
  contactName: optionalText(120),
  contactEmail: optionalEmail,
  contactPhone: optionalPhone,
  website: optionalUrl,
  bookingEmail: optionalEmail,
  startDate: optionalDate,
  endDate: optionalDate,
  foundedYear: optionalInt(1500, 2200),
  memberCount: optionalInt(0, 5000),
  repertoire: optionalText(2000),
  musicStyle: optionalText(120),

  // Aus der Recherche stammende Inhaltsfelder. Sie sind bewusst ebenfalls
  // bearbeitbar: nur so lässt sich eine importierte Angabe von Hand
  // korrigieren – und ist damit vor späteren Importen geschützt.
  motto: optionalText(300),
  catchmentArea: optionalText(300),
  associationType: optionalText(160),
  specialFeatures: z.array(safeText(300)).max(30).optional(),
  performanceArea: optionalText(300),
  homeCarnival: optionalText(200),
  instrumentation: optionalText(2000),
  knownAppearances: z.array(safeText(300)).max(50).optional(),
  bookingInfo: optionalText(2000),
  typicalPeriod: optionalText(200),
  recurrence: optionalText(120),
  organizerName: optionalText(200),
  programHighlights: z.array(safeText(300)).max(30).optional(),
  hasParade: z.boolean().nullable().optional(),
  hasChildrensCarnival: z.boolean().nullable().optional(),
  hasMaskedBall: z.boolean().nullable().optional(),
  hasMonsterConcert: z.boolean().nullable().optional(),
  hasSchnitzelbank: z.boolean().nullable().optional(),
  hasBeizenfasnacht: z.boolean().nullable().optional(),

  // Anreise. optionalText entfernt HTML und macht leere Eingaben zu null,
  // die Adressen lassen nur http(s) zu – beides dieselben Bausteine wie bei
  // den übrigen Inhaltsfeldern.
  arrivalByCar: optionalText(4000),
  arrivalByPublicTransport: optionalText(4000),
  arrivalNotes: optionalText(4000),
  arrivalMapUrl: optionalUrl,
  arrivalTransportUrl: optionalUrl,

  logoId: optionalCuid,
  headerId: optionalCuid,
  ogImageId: optionalCuid,
  metaTitle: optionalText(70),
  metaDesc: optionalText(180),
});

export const organizationUpdateSchema = organizationContentSchema
  .partial()
  .refine(
    (d) => !d.startDate || !d.endDate || d.endDate >= d.startDate,
    { message: "Das Enddatum muss nach dem Startdatum liegen.", path: ["endDate"] },
  );

/** Zusätzliche Felder, die ausschliesslich Admin/Team setzen dürfen. */
export const organizationAdminSchema = z.object({
  slug: slug.optional(),
  type: organizationTypeEnum.optional(),
  status: publicationStatusEnum.optional(),
  verification: verificationEnum.optional(),
  claimStatus: claimStatusEnum.optional(),
  isFeatured: z.boolean().optional(),
  featuredUntil: optionalDate.optional(),
});

export const organizationCreateSchema = organizationContentSchema
  .extend({
    type: organizationTypeEnum,
    slug: slug.optional(),
    status: publicationStatusEnum.default("DRAFT"),
    claimStatus: claimStatusEnum.default("UNCLAIMED"),
  })
  .refine(
    (d) => !d.startDate || !d.endDate || d.endDate >= d.startDate,
    { message: "Das Enddatum muss nach dem Startdatum liegen.", path: ["endDate"] },
  );

export const publishSchema = z.object({ status: publicationStatusEnum });

// ---------------------------------------------------------------------------
// Veranstaltungen
// ---------------------------------------------------------------------------

export const eventTypeEnum = z.enum([
  "FASNACHT",
  "UMZUG",
  "GUGGENKONZERT",
  "MONSTERKONZERT",
  "MASKENBALL",
  "BEIZENFASNACHT",
  "KINDERFASNACHT",
  "SCHNITZELBANK",
  "WAGENBAU",
  "VORFASNACHT",
  "HAUPTFASNACHT",
  "ABSCHLUSSVERANSTALTUNG",
  "SONSTIGE",
]);

const eventBase = z.object({
  title: requiredText(160, "Titel"),
  slug: slug.optional(),
  type: eventTypeEnum.default("SONSTIGE"),
  shortDescription: optionalText(400),
  description: optionalText(6000),
  startDate: dateInput,
  endDate: optionalDate,
  allDay: z.boolean().default(false),
  venueName: optionalText(160),
  street: optionalText(160),
  city: requiredText(120, "Ort"),
  zip: optionalText(10),
  cantonId: cuid,
  municipalityId: optionalCuid,
  organizerName: optionalText(160),
  externalUrl: optionalUrl,
  ticketUrl: optionalUrl,
  price: optionalDecimal,
  priceInfo: optionalText(160),
  imageId: optionalCuid,
  status: publicationStatusEnum.default("DRAFT"),
  metaTitle: optionalText(70),
  metaDesc: optionalText(180),
});

const endAfterStart = (d: { startDate?: Date; endDate?: Date | null }) =>
  !d.endDate || !d.startDate || d.endDate >= d.startDate;

export const eventCreateSchema = eventBase
  .extend({ organizationId: cuid })
  .refine(endAfterStart, {
    message: "Das Ende muss nach dem Beginn liegen.",
    path: ["endDate"],
  });

export const eventUpdateSchema = eventBase.partial().refine(endAfterStart, {
  message: "Das Ende muss nach dem Beginn liegen.",
  path: ["endDate"],
});

// ---------------------------------------------------------------------------
// Social Links, Sponsoren, Programm, FAQ, Downloads
// ---------------------------------------------------------------------------

export const socialPlatformEnum = z.enum([
  "WEBSITE",
  "FACEBOOK",
  "INSTAGRAM",
  "TIKTOK",
  "YOUTUBE",
  "X",
  "LINKEDIN",
  "SPOTIFY",
  "WHATSAPP",
  "OTHER",
]);

export const socialLinksSchema = z.object({
  links: z
    .array(
      z.object({
        platform: socialPlatformEnum,
        url: z.string().trim().min(1),
        label: optionalText(60),
      }),
    )
    .max(12, "Maximal 12 Social-Media-Links."),
});

export const sponsorSchema = z.object({
  name: requiredText(120, "Name"),
  url: optionalUrl,
  tier: optionalText(60),
  logoId: optionalCuid,
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const programItemSchema = z.object({
  title: requiredText(160, "Titel"),
  description: optionalText(2000),
  day: optionalDate,
  timeLabel: optionalText(40),
  place: optionalText(160),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const faqSchema = z.object({
  question: requiredText(200, "Frage"),
  answer: requiredText(2000, "Antwort"),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const downloadSchema = z
  .object({
    title: requiredText(160, "Titel"),
    mediaId: optionalCuid,
    externalUrl: optionalUrl,
    sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  })
  .refine((d) => d.mediaId || d.externalUrl, {
    message: "Bitte eine Datei auswählen oder eine URL angeben.",
    path: ["externalUrl"],
  });

// ---------------------------------------------------------------------------
// Medien
// ---------------------------------------------------------------------------

export const mediaTypeEnum = z.enum([
  "LOGO",
  "HEADER",
  "GALLERY",
  "SPONSOR",
  "EVENT",
  "HOMEPAGE",
  "DOCUMENT",
]);

export const mediaUpdateSchema = z.object({
  alt: optionalText(200),
  caption: optionalText(300),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
  type: mediaTypeEnum.optional(),
});

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

export const ticketCategoryEnum = z.enum([
  "TECHNICAL",
  "PAGE_EDIT",
  "SUBSCRIPTION",
  "INVOICE",
  "EVENT",
  "GENERAL",
  "CONTACT",
  "OTHER",
]);
export const ticketStatusEnum = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_CUSTOMER",
  "RESOLVED",
  "CLOSED",
]);
export const ticketPriorityEnum = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

export const ticketCreateSchema = z.object({
  subject: requiredText(160, "Titel"),
  category: ticketCategoryEnum.default("GENERAL"),
  priority: ticketPriorityEnum.default("NORMAL"),
  message: requiredText(5000, "Nachricht"),
  organizationId: optionalCuid,
});

export const ticketMessageSchema = z.object({
  body: requiredText(5000, "Nachricht"),
  isInternal: z.boolean().default(false),
});

export const ticketUpdateSchema = z.object({
  status: ticketStatusEnum.optional(),
  priority: ticketPriorityEnum.optional(),
  category: ticketCategoryEnum.optional(),
  assigneeId: optionalCuid.optional(),
});

export const contactSchema = z.object({
  name: requiredText(120, "Name"),
  email,
  subject: requiredText(160, "Betreff"),
  message: requiredText(5000, "Nachricht"),
  /**
   * Honeypot: für Menschen unsichtbar. Ein ausgefülltes Feld wird im
   * Handler still verworfen – Bots erhalten damit kein Fehlersignal,
   * an dem sie ihr Vorgehen anpassen könnten.
   */
  website: z.string().max(200).optional(),
});

/** Bearbeitungsstand, den ADMIN und TEAM setzen dürfen. */
export const claimRequestStatusEnum = z.enum(["PENDING", "IN_REVIEW", "APPROVED", "REJECTED"]);

export const claimRequestUpdateSchema = z.object({
  status: claimRequestStatusEnum,
});

export const claimRequestSchema = z.object({
  organizationId: cuid,
  contactName: requiredText(120, "Name"),
  contactEmail: email,
  contactPhone: optionalPhone,
  message: requiredText(2000, "Nachricht"),
});

// ---------------------------------------------------------------------------
// Abonnements, Pläne & Zahlungen
// ---------------------------------------------------------------------------

export const planTierEnum = z.enum(["FREE", "BASIC", "PREMIUM", "CUSTOM"]);
export const billingIntervalEnum = z.enum(["MONTHLY", "YEARLY", "ONE_TIME"]);
export const subscriptionStatusEnum = z.enum([
  "TRIAL",
  "ACTIVE",
  "PAYMENT_PENDING",
  "EXPIRED",
  "CANCELLED",
  "SUSPENDED",
]);
export const paymentStatusEnum = z.enum(["PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"]);
export const paymentMethodEnum = z.enum([
  "INVOICE",
  "BANK_TRANSFER",
  "TWINT",
  "CREDIT_CARD",
  "STRIPE",
  "OTHER",
]);

/**
 * Ziel des Knopfes auf der Preisseite.
 *
 * Erlaubt sind ein Pfad innerhalb der Seite oder eine vollständige http(s)-Adresse.
 * Alles andere wird abgewiesen – insbesondere `javascript:`, das sonst über die
 * Preisverwaltung in einen Link auf der öffentlichen Seite gelangen könnte.
 */
export const ctaUrlField = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => (v === null || v === undefined || v.trim() === "" ? null : v.trim()))
  .refine(
    (v) => v === null || v.startsWith("/") || /^https?:\/\//i.test(v),
    "Bitte einen Pfad wie /kontakt oder eine vollständige http(s)-Adresse angeben.",
  )
  .refine((v) => v === null || v.length <= 300, "Die Adresse ist zu lang.");

export const planSchema = z.object({
  key: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9_]+$/, "Nur Kleinbuchstaben, Zahlen und Unterstriche."),
  tier: planTierEnum,
  name: requiredText(80, "Name"),
  description: optionalText(600),
  priceChf: decimalAmount,
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Bitte einen dreibuchstabigen Währungscode angeben, z. B. CHF.")
    .default("CHF"),
  billingInterval: billingIntervalEnum.default("YEARLY"),
  ctaText: optionalText(60),
  ctaUrl: ctaUrlField,
  isActive: z.boolean().default(true),
  isPublic: z.boolean().default(true),
  isRecommended: z.boolean().default(false),
  trialDays: z.coerce.number().int().min(0).max(365).default(0),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  features: z
    .array(
      z.object({
        featureId: cuid,
        enabled: z.boolean().default(true),
        limit: optionalInt(0, 100000),
        note: optionalText(120),
        /** Freitext für die Vergleichstabelle, z. B. „Unlimitiert“. */
        value: optionalText(60),
      }),
    )
    .optional(),
});

/** Eine Zeile der Vergleichstabelle. */
export const featureSchema = z.object({
  key: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9_]+$/, "Nur Kleinbuchstaben, Zahlen und Unterstriche."),
  name: requiredText(80, "Bezeichnung"),
  description: optionalText(300),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

/** Neue Reihenfolge für Tarife oder Leistungen. */
export const sortOrderSchema = z.object({
  order: z.array(z.object({ id: cuid, sortOrder: z.coerce.number().int().min(0).max(999) })).max(200),
});

export const subscriptionUpdateSchema = z.object({
  planId: cuid.optional(),
  status: subscriptionStatusEnum.optional(),
  priceChf: decimalAmount.optional(),
  startDate: optionalDate.optional(),
  endDate: optionalDate.optional(),
  nextDueAt: optionalDate.optional(),
  lastPaymentAt: optionalDate.optional(),
  autoRenew: z.boolean().optional(),
  notes: optionalText(1000).optional(),
});

export const paymentSchema = z.object({
  organizationId: cuid,
  subscriptionId: optionalCuid,
  amountChf: decimalAmount,
  status: paymentStatusEnum.default("PENDING"),
  method: paymentMethodEnum.default("INVOICE"),
  dueAt: optionalDate,
  paidAt: optionalDate,
  periodStart: optionalDate,
  periodEnd: optionalDate,
  reference: optionalText(80),
  notes: optionalText(1000),
});

export const paymentUpdateSchema = paymentSchema.partial().omit({ organizationId: true });

// ---------------------------------------------------------------------------
// Werbeplatzierungen
// ---------------------------------------------------------------------------

export const placementTypeEnum = z.enum([
  "FEATURED_CARNIVAL",
  "FEATURED_GUGGE",
  "FEATURED_EVENT",
  "HOMEPAGE_SLOT",
  "CANTON_HIGHLIGHT",
  "AGENDA_HIGHLIGHT",
]);
export const placementStatusEnum = z.enum(["REQUESTED", "ACTIVE", "EXPIRED", "CANCELLED"]);

export const placementSchema = z
  .object({
    type: placementTypeEnum,
    organizationId: optionalCuid,
    eventId: optionalCuid,
    cantonSlug: optionalText(60),
    status: placementStatusEnum.default("REQUESTED"),
    startDate: dateInput,
    endDate: dateInput,
    priceChf: optionalDecimal,
    sortOrder: z.coerce.number().int().min(0).max(999).default(0),
    notes: optionalText(600),
  })
  .refine((d) => d.endDate >= d.startDate, {
    message: "Das Enddatum muss nach dem Startdatum liegen.",
    path: ["endDate"],
  })
  .refine((d) => d.organizationId || d.eventId || d.cantonSlug, {
    message: "Bitte eine Organisation, Veranstaltung oder einen Kanton auswählen.",
    path: ["organizationId"],
  });

// ---------------------------------------------------------------------------
// Homepage-CMS & Einstellungen
// ---------------------------------------------------------------------------

const ctaButton = z.object({
  label: safeText(60),
  href: z.string().trim().max(300),
  variant: z.enum(["primary", "secondary", "ghost"]).default("primary"),
});

const infoItem = z.object({
  title: safeText(120),
  body: safeText(600),
  icon: optionalText(40),
});

/** Strukturierte Sektionsdaten – bewusst kein freier HTML-Editor. */
export const homepageSectionSchema = z.object({
  eyebrow: optionalText(80),
  title: optionalText(160),
  subtitle: optionalText(300),
  body: optionalText(3000),
  imageId: optionalCuid,
  isVisible: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
  data: z
    .object({
      buttons: z.array(ctaButton).max(4).optional(),
      items: z.array(infoItem).max(8).optional(),
      organizationIds: z.array(cuid).max(12).optional(),
      eventIds: z.array(cuid).max(12).optional(),
      limit: z.coerce.number().int().min(1).max(12).optional(),
    })
    .nullable()
    .optional(),
});

export const siteSettingsSchema = z.object({
  settings: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(80),
        value: z.unknown(),
      }),
    )
    .max(100),
});

// ---------------------------------------------------------------------------
// Öffentliche Filter
// ---------------------------------------------------------------------------

/**
 * Eigene Kontodaten.
 *
 * Die E-Mail-Adresse ist zugleich die Anmeldeadresse; es gibt bewusst keine
 * zweite „Benachrichtigungsadresse" daneben, die dasselbe bedeuten würde.
 * Geprüft wird mit demselben Validator wie überall sonst: getrimmt,
 * kleingeschrieben, Format, Länge – und da nur eine Adresse durchkommt,
 * bleibt für HTML oder Skript kein Platz.
 */
export const accountProfileSchema = z.object({
  // Spitze Klammern haben in einem Namen nichts zu suchen. Ausgegeben wird er
  // ohnehin maskiert – in React wie in der HTML-Fassung der E-Mail –, aber es
  // gibt keinen Grund, solche Zeichen überhaupt zu speichern.
  name: z
    .string()
    .trim()
    .min(2, "Bitte einen Namen angeben.")
    .max(120)
    .refine((wert) => !/[<>]/.test(wert), "Der Name darf keine spitzen Klammern enthalten."),
  email,
  ticketEmails: z.boolean(),
});

/**
 * Mailkonfiguration der Plattform.
 *
 * Das Passwort ist optional: Die Oberfläche kennt es nicht und schickt es
 * deshalb nur mit, wenn es geändert werden soll. `clearPassword` ist der
 * ausdrückliche Weg, ein hinterlegtes Passwort zu entfernen.
 */
export const mailSettingsSchema = z.object({
  enabled: z.boolean(),
  host: z.string().trim().max(200),
  port: z.coerce.number().int().min(1).max(65535),
  security: z.enum(["none", "starttls", "tls"]),
  user: z.string().trim().max(200),
  password: z.string().max(400).optional(),
  clearPassword: z.boolean().optional(),
  fromName: z.string().trim().max(120),
  fromEmail: z.union([z.literal(""), email]),
  replyTo: z.union([z.literal(""), email]),
  ticketRecipient: z.union([z.literal(""), email]),
  ticketSubject: z.string().trim().min(1, "Bitte einen Betreff angeben.").max(300),
  ticketBody: z.string().trim().min(1, "Bitte einen Text angeben.").max(5000),
});

/** Zieladresse einer Testmail. */
export const testMailSchema = z.object({ to: email });

export const agendaFilterSchema = z.object({
  q: z.string().trim().max(120).optional(),
  canton: z.string().trim().max(60).optional(),
  region: z.string().trim().max(60).optional(),
  city: z.string().trim().max(120).optional(),
  type: z.string().trim().max(40).optional(),
  org: z.string().trim().max(90).optional(),
  orgType: z.enum(["CARNIVAL", "GUGGE"]).optional(),
  from: z.string().trim().max(30).optional(),
  to: z.string().trim().max(30).optional(),
  view: z.enum(["list", "calendar"]).optional(),
  month: z.string().trim().max(10).optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
});

export const directoryFilterSchema = z.object({
  q: z.string().trim().max(120).optional(),
  canton: z.string().trim().max(60).optional(),
  region: z.string().trim().max(60).optional(),
  city: z.string().trim().max(120).optional(),
  sort: z.enum(["name", "upcoming", "newest"]).optional(),
  foundedFrom: z.coerce.number().int().min(1500).max(2200).optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
});
