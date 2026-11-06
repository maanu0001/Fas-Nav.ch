import { z } from "zod";
import { handleApiError, jsonOk } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { getNotificationPreferences, saveNotificationPreferences, NOTIFICATION_CATEGORIES, notificationTypesForRole } from "@/lib/notification-preferences";
const schema = z.object(Object.fromEntries(Object.keys(NOTIFICATION_CATEGORIES).map(key => [key, z.boolean()])) as Record<keyof typeof NOTIFICATION_CATEGORIES, z.ZodBoolean>);
export async function GET() {
  try { const user = await requireUser(); return jsonOk(await getNotificationPreferences(user.id)); }
  catch (error) { return handleApiError(error); }
}
export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const settings = schema.partial().parse(await request.json());
    const allowed = notificationTypesForRole(user.role);
    const existing = await getNotificationPreferences(user.id);
    for (const key of Object.keys(settings) as (keyof typeof settings)[]) {
      if (!allowed.includes(key)) return new Response("Forbidden notification type", { status: 403 });
    }
    await saveNotificationPreferences(user.id, {...existing, ...settings});
    return jsonOk(settings);
  } catch (error) { return handleApiError(error); }
}
