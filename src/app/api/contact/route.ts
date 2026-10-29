import { jsonError, jsonOk, parseBody, route } from "@/lib/api";
import { sendTemplateToStaff } from "@/lib/email-templates";
import { notifyStaff } from "@/lib/notifications";
import { checkRateLimit, clientKey } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/utils";
import { contactSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export const POST = route(async (request) => {
  const limit = checkRateLimit(clientKey(request, "contact"), 5, 15 * 60_000);
  if (!limit.ok) return jsonError("Zu viele Anfragen. Bitte versuche es in einigen Minuten erneut.", 429);

  const body = await parseBody(request, contactSchema);
  if (body.website) return jsonOk({ received: true });

  const plan = body.planKey
    ? await prisma.plan.findFirst({ where: { key: body.planKey, isActive: true }, select: { name: true } })
    : null;

  const details = [
    body.organizationName ? `Organisation: ${body.organizationName}` : null,
    body.phone ? `Telefon: ${body.phone}` : null,
    plan ? `Gewünschter Tarif: ${plan.name}` : body.planKey ? `Gewünschter Tarif: ${body.planKey}` : null,
  ].filter(Boolean);
  const message = details.length ? `${details.join("\n")}\n\n---\n\n${body.message}` : body.message;

  const contact = await prisma.ticket.create({
    data: {
      subject: body.subject,
      category: "CONTACT",
      priority: "NORMAL",
      status: "OPEN",
      guestName: body.name,
      guestEmail: body.email,
      messages: { create: { body: message, authorName: body.name } },
    },
    select: { id: true },
  });

  await notifyStaff({
    type: "SYSTEM",
    title: "Neue Kontaktanfrage",
    body: `${body.name} (${body.email}): ${body.subject}`,
    link: `/dashboard/kontaktanfragen/${contact.id}`,
  });
  await sendTemplateToStaff("contact_staff", {
    contactName: body.name,
    contactEmail: body.email,
    subject: body.subject,
    message,
    dashboardUrl: absoluteUrl(`/dashboard/kontaktanfragen/${contact.id}`),
  });
  return jsonOk({ received: true }, 201);
});
