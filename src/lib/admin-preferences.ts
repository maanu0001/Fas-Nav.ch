import { prisma } from "@/lib/prisma";

export type AdminPreferences = {
  notificationEmail: string;
  emailTodos: boolean;
  emailNews: boolean;
};

const key = (userId: string) => `admin.preferences.${userId}`;

export async function getAdminPreferences(userId: string, fallbackEmail = ""): Promise<AdminPreferences> {
  const row = await prisma.siteSetting.findUnique({ where: { key: key(userId) }, select: { value: true } });
  const value = row?.value && typeof row.value === "object" && !Array.isArray(row.value) ? row.value as Record<string, unknown> : {};
  return {
    notificationEmail: typeof value.notificationEmail === "string" ? value.notificationEmail : fallbackEmail,
    emailTodos: value.emailTodos !== false,
    emailNews: value.emailNews !== false,
  };
}

export async function saveAdminPreferences(userId: string, preferences: AdminPreferences) {
  await prisma.siteSetting.upsert({
    where: { key: key(userId) },
    create: { key: key(userId), value: preferences, group: "admin_preferences", label: "Admin-Benachrichtigungen" },
    update: { value: preferences, group: "admin_preferences" },
  });
}
