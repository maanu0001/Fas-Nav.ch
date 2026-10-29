import { jsonOk, parseBody, route } from "@/lib/api";
import { jsonError } from "@/lib/api";
import { notifyStaff } from "@/lib/notifications";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { contactSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

/**
 * Öffentliche Kontaktanfrage ohne Benutzerkonto.
 *
 * CONTACT wird vorerst als eigener Legacy-Datensatztyp in der bestehenden
 * Tabelle gespeichert, damit bestehende Anfragen ohne riskante Datenmigration
 * erhalten bleiben. Der Datensatz wird aber nirgends mehr als Support-Ticket
 * behandelt oder einem Gast als Ticketnummer präsentiert.
 */
export const POST = route(async (request) => {
  const limit = checkRateLimit(clientKey(request, "contact"), 5, 15 * 60_000);
  if (!limit.ok) {
    return jsonError(
      "Zu viele Anfragen. Bitte versuche es in einigen Minuten erneut.",
      429,
    );
  }

  const body = await parseBody(request, contactSchema);

  // Honeypot: Bots füllen dieses Feld aus – wir antworten unauffällig mit Erfolg.
  if (body.website) {
    return jsonOk({ received: true });
  }

  const contact = await prisma.ticket.create({
    data: {
      subject: body.subject,
      category: "CONTACT",
      priority: "NORMAL",
      status: "OPEN",
      guestName: body.name,
      guestEmail: body.email,
      messages: {
        create: {
          body: body.message,
          authorName: body.name,
        },
      },
    },
    select: { id: true, number: true, subject: true },
  });

  await notifyStaff({
    type: "SYSTEM",
    title: "Neue Kontaktanfrage",
    body: `${body.name} (${body.email}): ${body.subject}`,
    link: `/dashboard/kontaktanfragen/${contact.id}`,
  });

  const notifyEmail = process.env.CONTACT_NOTIFY_EMAIL;
  if (notifyEmail) {
    await sendMail({
      to: notifyEmail,
      subject: `[Fas-Nav] Kontaktanfrage: ${body.subject}`,
      text: `Von: ${body.name} <${body.email}>\n\n${body.message}`,
    });
  }

  return jsonOk({ received: true }, 201);
});
