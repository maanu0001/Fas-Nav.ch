import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { StatCard, StatGrid } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/ui/states";
import {
  PUBLICATION_STATUS_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  TICKET_STATUS_LABELS,
} from "@/lib/constants";
import { organizationStats } from "@/lib/analytics";
import type { DashboardContext } from "@/lib/dashboard-context";
import { formatDateShort, formatDateTime, startOfToday } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { completenessSelect, profileCompleteness } from "@/lib/profile-completeness";
import { daysUntilExpiry, isExpiringSoon, isSubscriptionUsable } from "@/lib/subscription";

export async function OrganizationDashboard({ context }: { context: DashboardContext }) {
  const org = context.organization;

  if (!org) {
    return (
      <>
        <PageHeader title="Kein Zugriff auf eine Organisation" />
        <EmptyState
          icon={AlertTriangle}
          title="Deinem Konto ist noch keine Organisation zugewiesen"
          description="Bitte melde dich beim Fas-Nav-Team, damit dein Konto mit deiner Fasnacht oder Gugge verknüpft wird."
          action={<ButtonLink href="/dashboard/tickets/neu">Support kontaktieren</ButtonLink>}
        />
      </>
    );
  }

  const publicHref = org.type === "CARNIVAL" ? `/fasnacht/${org.slug}` : `/gugge/${org.slug}`;
  const today = startOfToday();

  const [profile, upcomingEvents, nextEvents, openTickets, stats] = await Promise.all([
    prisma.organization.findUnique({ where: { id: org.id }, select: completenessSelect }),
    prisma.event.count({ where: { organizationId: org.id, startDate: { gte: today } } }),
    prisma.event.findMany({
      where: { organizationId: org.id, startDate: { gte: today } },
      orderBy: { startDate: "asc" },
      take: 5,
      select: { id: true, title: true, slug: true, startDate: true, status: true, city: true },
    }),
    prisma.ticket.findMany({
      where: {
        organizationId: org.id,
        status: { in: ["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"] },
      },
      orderBy: { lastReplyAt: "desc" },
      take: 4,
      select: { id: true, number: true, subject: true, status: true, lastReplyAt: true },
    }),
    organizationStats(org.id),
  ]);

  const completeness = profile ? profileCompleteness(profile) : null;
  const subscription = context.subscription;
  const expiryDays = daysUntilExpiry(subscription?.endDate);
  const expiring = isExpiringSoon(subscription?.endDate);
  const usable = isSubscriptionUsable(subscription);

  return (
    <>
      <PageHeader
        title={`Grüezi, ${context.user.name.split(" ")[0]}`}
        description={`Verwalte hier ${org.name}.`}
        actions={
          <>
            <ButtonLink href="/dashboard/seite" variant="primary">
              Seite bearbeiten
            </ButtonLink>
            <ButtonLink href={publicHref} target="_blank" rel="noopener noreferrer" variant="outline">
              Vorschau
              <ExternalLink />
            </ButtonLink>
          </>
        }
      />

      {!org.onboardingCompleted ? (
        <Alert variant="info" title="Richte deine Seite in wenigen Schritten ein" className="mb-6">
          Wir führen dich durch die wichtigsten Angaben – Grundinformationen, Bilder, Kontakt und
          deine erste Veranstaltung.{" "}
          <Link href="/dashboard/onboarding" className="font-medium underline">
            Einrichtung starten
          </Link>
        </Alert>
      ) : null}

      {org.status !== "PUBLISHED" ? (
        <Alert variant="warning" title="Deine Seite ist noch nicht öffentlich" className="mb-6">
          Status:{" "}
          {PUBLICATION_STATUS_LABELS[org.status as keyof typeof PUBLICATION_STATUS_LABELS] ??
            org.status}
          . Sobald du bereit bist, kannst du sie unter{" "}
          <Link href="/dashboard/seite" className="font-medium underline">
            Meine Seite
          </Link>{" "}
          veröffentlichen.
        </Alert>
      ) : null}

      {subscription && !usable ? (
        <Alert variant="error" title="Dein Abonnement ist nicht aktiv" className="mb-6">
          Deine Seite bleibt als Basiseintrag sichtbar, kostenpflichtige Funktionen sind jedoch
          eingeschränkt.{" "}
          <Link href="/dashboard/abonnement" className="font-medium underline">
            Abonnement ansehen
          </Link>
        </Alert>
      ) : expiring && expiryDays !== null ? (
        <Alert variant="warning" title="Dein Fas-Nav-Abo läuft bald ab" className="mb-6">
          Noch {expiryDays} {expiryDays === 1 ? "Tag" : "Tage"} bis zum{" "}
          {formatDateShort(subscription?.endDate)}.{" "}
          <Link href="/dashboard/abonnement" className="font-medium underline">
            Jetzt verlängern
          </Link>
        </Alert>
      ) : null}

      <section className="mb-8" aria-label="Schnellaktionen">
        <QuickActions
          actions={[
            {
              href: "/dashboard/seite",
              label: "Seite bearbeiten",
              description: "Texte, Bilder, Kontakt",
              icon: "layout",
            },
            {
              href: "/dashboard/veranstaltungen/neu",
              label: "Veranstaltung erstellen",
              description: "In die Agenda aufnehmen",
              icon: "calendar",
            },
            {
              href: publicHref,
              label: "Vorschau öffnen",
              description: "So sehen es Besucher",
              icon: "image",
            },
            {
              href: "/dashboard/tickets/neu",
              label: "Ticket erstellen",
              description: "Support kontaktieren",
              icon: "ticket",
            },
          ]}
        />
      </section>

      <section className="mb-8" aria-label="Kennzahlen">
        <StatGrid>
          <StatCard
            label="Seitenaufrufe (30 Tage)"
            value={stats.last30Days}
            hint={`${stats.total} insgesamt`}
            icon="chart"
            href="/dashboard/statistik"
          />
          <StatCard
            label="Kommende Veranstaltungen"
            value={upcomingEvents}
            icon="calendar"
            href="/dashboard/veranstaltungen"
          />
          <StatCard
            label="Offene Tickets"
            value={openTickets.length}
            icon="ticket"
            href="/dashboard/tickets"
            tone={openTickets.length > 0 ? "warning" : "default"}
          />
          <StatCard
            label="Abonnement"
            value={
              subscription
                ? SUBSCRIPTION_STATUS_LABELS[subscription.status]
                : "Kein Abo"
            }
            hint={subscription?.plan.name ?? "Bitte Team kontaktieren"}
            icon="badge"
            href="/dashboard/abonnement"
            tone={usable ? "success" : "warning"}
          />
        </StatGrid>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {completeness ? (
          <Card className="p-5">
            <h2 className="font-display text-base font-semibold">Profilvollständigkeit</h2>

            <div className="mt-4 flex items-center gap-3">
              <div
                className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={completeness.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Profilvollständigkeit"
              >
                <div
                  className="h-full rounded-full bg-accent-500 transition-all"
                  style={{ width: `${completeness.percent}%` }}
                />
              </div>
              <span className="font-display text-lg font-bold text-primary-900">
                {completeness.percent}%
              </span>
            </div>

            {completeness.missing.length ? (
              <>
                <p className="mt-4 text-sm font-medium text-slate-700">Fehlende Punkte:</p>
                <ul className="mt-2 space-y-1.5">
                  {completeness.missing.map((item) => (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        className="flex items-center gap-2 text-sm text-primary-700 hover:underline"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-accent-500" aria-hidden />
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-4 flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Dein Profil ist vollständig. Schön gemacht!
              </p>
            )}
          </Card>
        ) : null}

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold">Nächste Veranstaltungen</h2>
            <Link
              href="/dashboard/veranstaltungen"
              className="text-sm text-primary-700 hover:underline"
            >
              Alle
            </Link>
          </div>

          {nextEvents.length ? (
            <ul className="divide-y divide-border">
              {nextEvents.map((event) => (
                <li key={event.id}>
                  <Link
                    href={`/dashboard/veranstaltungen/${event.id}`}
                    className="flex items-start justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-primary-900">
                        {event.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDateTime(event.startDate)} · {event.city}
                      </p>
                    </div>
                    <Badge variant={event.status === "PUBLISHED" ? "success" : "muted"}>
                      {PUBLICATION_STATUS_LABELS[event.status]}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Noch keine Veranstaltungen"
              description="Erfasse deine erste Veranstaltung, damit sie in der Fas-Nav-Agenda erscheint."
              action={
                <ButtonLink href="/dashboard/veranstaltungen/neu" variant="primary">
                  Veranstaltung erstellen
                </ButtonLink>
              }
            />
          )}
        </Card>
      </div>

      {openTickets.length ? (
        <Card className="mt-6 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold">Deine offenen Tickets</h2>
            <Link href="/dashboard/tickets" className="text-sm text-primary-700 hover:underline">
              Alle anzeigen
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {openTickets.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  href={`/dashboard/tickets/${ticket.id}`}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <span className="min-w-0 truncate text-sm font-medium text-primary-900">
                    #{ticket.number} {ticket.subject}
                  </span>
                  <Badge variant={ticket.status === "OPEN" ? "warning" : "info"}>
                    {TICKET_STATUS_LABELS[ticket.status]}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  );
}
