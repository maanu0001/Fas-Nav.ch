import type { NotificationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { sendMail, type MailMessage } from "@/lib/mail";
import { STAFF_ROLES } from "@/lib/rbac";

/** Empfänger, wie ihn die Vorlage einer Zusatzmail braucht. */
export type NotifyRecipient = {
  id: string;
  name: string;
  email: string;
  ticketEmails: boolean;
};

type NotifyInput = {
  userId: string;
  organizationId?: string | null;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  /** Einfache Zusatzmail aus Titel und Text. */
  email?: boolean;
  /**
   * Vorlage für eine gestaltete Zusatzmail.
   *
   * Als Funktion, weil der Text den Empfänger kennen muss – Anrede,
   * Einstellungen. Gibt sie null zurück, wird nicht versendet; so entscheidet
   * die Vorlage selbst über Abmeldungen und fehlende Adressen, statt dass
   * diese Regel an mehreren Stellen wiederholt wird.
   */
  mail?: (empfaenger: NotifyRecipient) => Omit<MailMessage, "to"> | null;
};

/**
 * Erstellt eine interne Benachrichtigung, optional zusätzlich per E-Mail.
 *
 * Die Meldung wird immer geschrieben, der Mailversand ist der zweite Schritt.
 * Scheitert er, bleibt die Meldung bestehen – sie ist der verlässliche Teil,
 * die E-Mail nur die Zustellung nach draussen. `emailSentAt` hält fest, dass
 * für diese Meldung bereits versendet wurde; ein zweiter Durchlauf über
 * dieselbe Meldung schickt deshalb keine zweite E-Mail.
 */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        organizationId: input.organizationId ?? null,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
      },
    });

    if (!input.email && !input.mail) return;

    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, email: true, name: true, ticketEmails: true },
    });
    if (!user?.email) return;

    const nachricht = input.mail
      ? input.mail(user)
      : {
          subject: input.title,
          text: `Hallo ${user.name}\n\n${input.body ?? input.title}\n\nFreundliche Grüsse\nFas-Nav.ch`,
        };

    if (!nachricht) return;

    const result = await sendMail({ ...nachricht, to: user.email });
    if (result.sent) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { emailSentAt: new Date() },
      });
    }
  } catch (error) {
    // Eine fehlgeschlagene Benachrichtigung darf den auslösenden Vorgang
    // niemals scheitern lassen – die Ticketantwort ist bereits gespeichert.
    console.error("[notify] Benachrichtigung fehlgeschlagen:", error);
  }
}

/**
 * Benachrichtigt alle Mitglieder einer Organisation.
 *
 * `skipUserId` lässt eine Person aus. Gebraucht wird das für die eigene
 * Nachricht: Wer selbst schreibt, soll darüber nicht benachrichtigt werden.
 */
export async function notifyOrganization(
  organizationId: string,
  input: Omit<NotifyInput, "userId" | "organizationId">,
  options?: { skipUserId?: string | null },
): Promise<void> {
  const memberships = await prisma.membership.findMany({
    where: {
      organizationId,
      user: { isActive: true },
      ...(options?.skipUserId ? { userId: { not: options.skipUserId } } : {}),
    },
    select: { userId: true },
  });
  await Promise.all(
    memberships.map((m) => notify({ ...input, userId: m.userId, organizationId })),
  );
}

/** Benachrichtigt alle aktiven Admin-/Team-Accounts. */
export async function notifyStaff(
  input: Omit<NotifyInput, "userId">,
  options?: { skipUserId?: string | null },
): Promise<void> {
  const staff = await prisma.user.findMany({
    where: {
      role: { in: STAFF_ROLES },
      isActive: true,
      ...(options?.skipUserId ? { id: { not: options.skipUserId } } : {}),
    },
    select: { id: true },
  });
  await Promise.all(staff.map((u) => notify({ ...input, userId: u.id })));
}
