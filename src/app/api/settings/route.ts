import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { siteSettingsSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/** Plattform-Einstellungen speichern (Key-Value). */
export async function PUT(request: Request) {
  try {
    const actor = await requirePermission("manageSettings");
    const body = await parseBody(request, siteSettingsSchema);

    // Mailwerte gehören ausschliesslich in ihren eigenen Endpunkt. Dort wird
    // das Passwort verschlüsselt; hier käme es im Klartext in die Datenbank.
    // Zwei Wege zu denselben Daten, von denen einer die Verschlüsselung
    // umgeht, wären genau ein Weg zu viel.
    const mailSchluessel = body.settings.filter((s) => s.key.startsWith("mail."));
    if (mailSchluessel.length) {
      return jsonError(
        "Mail-Einstellungen werden unter „E-Mail / Mailversand“ verwaltet.",
        400,
      );
    }

    await prisma.$transaction(
      body.settings.map((setting) =>
        prisma.siteSetting.upsert({
          where: { key: setting.key },
          create: { key: setting.key, value: setting.value as never },
          update: { value: setting.value as never },
        }),
      ),
    );

    await logAudit({
      userId: actor.id,
      userLabel: actor.email,
      action: "settings.update",
      entity: "SiteSetting",
      after: { keys: body.settings.map((s) => s.key) },
    });

    return jsonOk({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
