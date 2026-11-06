import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const NOTIFICATION_CATEGORIES = {
  TICKET_REPLY: "Ticketantworten",
  TICKET_STATUS: "Ticket-Statusänderungen",
  SUBSCRIPTION_EXPIRING: "Bald ablaufende Abonnemente",
  SUBSCRIPTION_EXPIRED: "Abgelaufene Abonnemente",
  PAYMENT_DUE: "Offene Zahlungen",
  PAYMENT_RECEIVED: "Zahlungsbestätigungen",
  EVENT_PUBLISHED: "Veröffentlichte Veranstaltungen",
  ORGANIZATION_VERIFIED: "Verifizierung von Organisationen",
  ORGANIZATION_PUBLISHED: "Veröffentlichung von Organisationen",
  ACCOUNT_CREATED: "Neue Konten",
  SYSTEM: "Neue Aufgaben, Anfragen und Systemmeldungen",
} as const satisfies Record<NotificationType, string>;

export type NotificationPreferences = Record<NotificationType, boolean>;
const key = (userId: string) => "notifications.email." + userId;
export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
  const row = await prisma.siteSetting.findUnique({ where: { key: key(userId) }, select: { value: true } });
  const raw = row?.value && typeof row.value === "object" && !Array.isArray(row.value)
    ? row.value as Record<string, unknown> : {};
  return Object.fromEntries(Object.keys(NOTIFICATION_CATEGORIES).map(type => [type, raw[type] !== false])) as NotificationPreferences;
}
export async function saveNotificationPreferences(userId: string, preferences: NotificationPreferences) {
  await prisma.siteSetting.upsert({
    where: { key: key(userId) },
    create: { key: key(userId), label: "E-Mail-Benachrichtigungen", group: "notification_preferences", value: preferences },
    update: { value: preferences },
  });
}
