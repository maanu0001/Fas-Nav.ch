import { Prisma } from "@prisma/client";

import { handleApiError, jsonError, jsonOk, parseBody } from "@/lib/api";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/rbac";
import { accountProfileSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/**
 * Eigene Kontodaten ändern.
 *
 * Ausschliesslich die eigenen: Die Kennung stammt aus der Sitzung, nicht aus
 * dem Rumpf der Anfrage. Es gibt hier keinen Weg, ein fremdes Konto zu
 * treffen – auch nicht durch eine mitgeschickte Kennung, denn eine solche
 * wird gar nicht gelesen.
 *
 * Die Rolle bleibt unangetastet. Wer sie ändern darf, tut das unter
 * „Accounts"; dieser Endpunkt kennt sie nicht einmal.
 */
export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = await parseBody(request, accountProfileSchema);

    const vorher = await prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, name: true, ticketEmails: true },
    });
    if (!vorher) return jsonError("Benutzer nicht gefunden.", 404);

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { name: body.name, email: body.email, ticketEmails: body.ticketEmails },
      });
    } catch (error) {
      // Die Adresse ist zugleich die Anmeldeadresse und deshalb eindeutig.
      // Eine bereits vergebene Adresse ist ein Eingabefehler, kein Serverfehler.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return jsonError("Diese E-Mail-Adresse wird bereits verwendet.", 409, {
          email: "Diese E-Mail-Adresse wird bereits verwendet.",
        });
      }
      throw error;
    }

    await logAudit({
      userId: user.id,
      userLabel: user.email,
      action: "account.update",
      entity: "User",
      entityId: user.id,
      entityLabel: body.email,
      before: {
        name: vorher.name,
        email: vorher.email,
        ticketEmails: vorher.ticketEmails,
      },
      after: { name: body.name, email: body.email, ticketEmails: body.ticketEmails },
    });

    return jsonOk({ name: body.name, email: body.email, ticketEmails: body.ticketEmails });
  } catch (error) {
    return handleApiError(error);
  }
}
