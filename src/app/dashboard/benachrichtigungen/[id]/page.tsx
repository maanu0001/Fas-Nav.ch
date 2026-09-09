import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

import { requireUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * Öffnet eine Benachrichtigung und markiert sie dabei als gelesen.
 *
 * Bewusst als Serverseite statt als Klick-Handler: So greift die Markierung
 * auch ohne JavaScript, und die Berechtigung wird an derselben Stelle geprüft,
 * an der geschrieben wird. Die Bedingung `userId` in `updateMany` sorgt dafür,
 * dass fremde Benachrichtigungen selbst bei erratener Kennung unberührt
 * bleiben – es wird schlicht kein Datensatz getroffen.
 */
export default async function OpenNotificationPage({ params }: Params) {
  const { id } = await params;
  const user = await requireUser();

  const notification = await prisma.notification.findFirst({
    where: { id, userId: user.id },
    select: { id: true, link: true, readAt: true },
  });

  if (!notification) notFound();

  if (!notification.readAt) {
    const geaendert = await prisma.notification.updateMany({
      where: { id: notification.id, userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });

    // Verwirft den zwischengespeicherten Stand der Umrahmung, in der der
    // Zähler steht. Das greift für den Weg ohne JavaScript und für einen
    // direkten Aufruf dieser Adresse. Beim gewöhnlichen Klick in der Liste
    // sorgt NotificationLink dafür, dass der Zähler sofort stimmt – dort ist
    // die Reihenfolge entscheidend, siehe Kommentar in der Komponente.
    if (geaendert.count > 0) revalidatePath("/dashboard", "layout");
  }

  // Nur anwendungsinterne Ziele weiterverfolgen: Ein von aussen gesetzter
  // Link dürfte sonst zu einer fremden Adresse führen.
  const ziel =
    notification.link && notification.link.startsWith("/")
      ? notification.link
      : "/dashboard/benachrichtigungen";

  redirect(ziel);
}
