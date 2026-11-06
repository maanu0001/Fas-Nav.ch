import { z } from "zod";
import { handleApiError, jsonOk } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { getNotificationPreferences, saveNotificationPreferences, NOTIFICATION_CATEGORIES } from "@/lib/notification-preferences";
const schema = z.object(Object.fromEntries(Object.keys(NOTIFICATION_CATEGORIES).map(key => [key, z.boolean()])) as Record<keyof typeof NOTIFICATION_CATEGORIES, z.ZodBoolean>);
export async function GET() {
  try { const user = await requireUser(); return jsonOk(await getNotificationPreferences(user.id)); }
  catch (error) { return handleApiError(error); }
}
export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const settings = schema.parse(await request.json());
    await saveNotificationPreferences(user.id, settings);
    return jsonOk(settings);
  } catch (error) { return handleApiError(error); }
}
