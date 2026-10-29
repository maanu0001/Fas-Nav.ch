import { z } from "zod";
import { handleApiError, jsonOk, parseBody } from "@/lib/api";
import { getAdminPreferences, saveAdminPreferences } from "@/lib/admin-preferences";
import { requireUser, isAdmin } from "@/lib/rbac";

const schema = z.object({
  notificationEmail: z.string().trim().email("Bitte eine gültige E-Mail-Adresse eingeben.").max(200),
  emailTodos: z.boolean(),
  emailNews: z.boolean(),
});

export async function GET() {
  try {
    const user = await requireUser();
    if (!isAdmin(user.role)) return new Response("Forbidden", { status: 403 });
    return jsonOk(await getAdminPreferences(user.id, user.email));
  } catch (error) { return handleApiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    if (!isAdmin(user.role)) return new Response("Forbidden", { status: 403 });
    const body = await parseBody(request, schema);
    await saveAdminPreferences(user.id, body);
    return jsonOk(body);
  } catch (error) { return handleApiError(error); }
}
