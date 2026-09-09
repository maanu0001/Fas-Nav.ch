import type { Metadata } from "next";
import { Bell } from "lucide-react";

import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { MarkAllReadButton } from "@/components/dashboard/mark-all-read";
import { NotificationLink } from "@/components/dashboard/notification-link";
import { PageHeader } from "@/components/dashboard/page-header";
import { getDashboardContext } from "@/lib/dashboard-context";
import { relativeTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Benachrichtigungen" };

export default async function NotificationsPage() {
  const context = await getDashboardContext();

  const notifications = await prisma.notification.findMany({
    where: { userId: context.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, type: true, title: true, body: true, link: true, readAt: true, createdAt: true },
  });

  const unread = notifications.filter((n) => !n.readAt).length;

  return (
    <>
      <PageHeader
        title="Benachrichtigungen"
        description={unread ? `${unread} ungelesen` : "Alles gelesen."}
        actions={unread ? <MarkAllReadButton /> : undefined}
      />

      {notifications.length ? (
        <ul className="space-y-2">
          {notifications.map((notification) => {
            const content = (
              <Card
                className={cn(
                  "p-4 transition-colors",
                  !notification.readAt && "border-primary-200 bg-primary-50/40",
                )}
              >
                <div className="flex items-start gap-3">
                  {!notification.readAt ? (
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-500"
                      aria-label="ungelesen"
                    />
                  ) : (
                    <span className="mt-1.5 h-2 w-2 shrink-0" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    {/*
                      Lange Titel – etwa ein Ticketbetreff über mehrere Zeilen –
                      werden auf zwei Zeilen begrenzt, damit die Liste
                      überschaubar bleibt. Gekürzt wird nur die Darstellung:
                      Der vollständige Text steht im Titelattribut und, wohin
                      der Verweis führt, im Ticket selbst.
                    */}
                    <p
                      className="line-clamp-2 text-sm font-semibold text-primary-900"
                      title={notification.title}
                    >
                      {notification.title}
                    </p>
                    {notification.body ? (
                      <p className="line-clamp-2 mt-0.5 text-sm text-slate-600" title={notification.body}>
                        {notification.body}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {relativeTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </Card>
            );

            // Jede Benachrichtigung führt über die Öffnen-Seite, die sie
            // serverseitig als gelesen markiert und danach weiterleitet.
            return (
              <li key={notification.id}>
                <NotificationLink
                  id={notification.id}
                  href={
                    notification.link && notification.link.startsWith("/")
                      ? notification.link
                      : "/dashboard/benachrichtigungen"
                  }
                  unread={!notification.readAt}
                  label={
                    notification.readAt
                      ? notification.title
                      : `${notification.title} (ungelesen)`
                  }
                >
                  {content}
                </NotificationLink>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          icon={Bell}
          title="Keine Benachrichtigungen"
          description="Hier informieren wir dich über Antworten auf Tickets, ablaufende Abos und Änderungen an deiner Seite."
        />
      )}
    </>
  );
}
