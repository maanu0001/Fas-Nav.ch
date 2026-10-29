import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { requirePermissionPage } from "@/lib/dashboard-context";
import { formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Kontaktanfrage" };

type Params = { params: Promise<{ id: string }> };

/**
 * Eine externe Kontaktanfrage der Website.
 *
 * Sie wird bewusst nicht als Support-Thread dargestellt: Der Absender hat
 * keinen Fas-Nav-Account und kann deshalb keinen Ticketverlauf im Dashboard
 * einsehen oder dort antworten. Die Antwort erfolgt direkt per E-Mail.
 * Bestehende CONTACT-Datensätze bleiben migrationssicher erhalten.
 */
export default async function ContactRequestDetailPage({ params }: Params) {
  const { id } = await params;
  await requirePermissionPage("handleContactRequests");

  const anfrage = await prisma.ticket.findFirst({
    where: { id, category: "CONTACT" },
    include: {
      author: { select: { name: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, body: true, createdAt: true },
      },
    },
  });

  if (!anfrage) notFound();

  const name = anfrage.guestName ?? anfrage.author?.name ?? "Unbekannt";
  const email = anfrage.guestEmail ?? anfrage.author?.email ?? null;
  const ersteNachricht = anfrage.messages[0]?.body ?? "Keine Nachricht vorhanden.";

  return (
    <>
      <PageHeader
        title={anfrage.subject}
        breadcrumbs={[
          { href: "/dashboard/kontaktanfragen", label: "Kontaktanfragen" },
          { label: `Anfrage #${anfrage.number}` },
        ]}
        actions={
          email ? (
            <ButtonLink href={`mailto:${email}?subject=${encodeURIComponent(`Re: ${anfrage.subject}`)}`}>
              <Mail />
              Per E-Mail antworten
            </ButtonLink>
          ) : undefined
        }
      />

      <Card className="mb-6 p-5">
        <h2 className="mb-4 font-display text-base font-semibold">Angaben aus dem Formular</h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Name</dt>
            <dd className="mt-0.5 font-medium">{name}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">E-Mail</dt>
            <dd className="mt-0.5 break-all">
              {email ? (
                <a href={`mailto:${email}`} className="text-primary-800 hover:underline">
                  {email}
                </a>
              ) : (
                "–"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Betreff</dt>
            <dd className="mt-0.5">{anfrage.subject}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Eingang</dt>
            <dd className="mt-0.5">{formatDateTime(anfrage.createdAt)}</dd>
          </div>
        </dl>
      </Card>

      <Card className="p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold">Nachricht</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Externe Kontaktanfrage – Antworten werden per E-Mail geführt, nicht im Ticket-System.
            </p>
          </div>
        </div>
        <div className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-4 text-sm leading-6">
          {ersteNachricht}
        </div>
      </Card>
    </>
  );
}
