import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { relativeTime } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage() {
  await requirePermission("viewAllTickets");
  const [contacts, tickets, claims, pendingOrgs] = await Promise.all([
    prisma.ticket.findMany({ where: { category: "CONTACT", status: { in: ["OPEN", "IN_PROGRESS"] } }, orderBy: { lastReplyAt: "desc" }, take: 100, select: { id: true, subject: true, guestName: true, guestEmail: true, lastReplyAt: true, status: true } }),
    prisma.ticket.findMany({ where: { category: { not: "CONTACT" }, status: { in: ["OPEN", "IN_PROGRESS"] } }, orderBy: { lastReplyAt: "desc" }, take: 100, select: { id: true, number: true, subject: true, lastReplyAt: true, author: { select: { name: true, email: true } }, guestName: true, guestEmail: true, status: true } }),
    prisma.claimRequest.findMany({ where: { status: { in: ["PENDING", "IN_REVIEW"] } }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, contactName: true, contactEmail: true, createdAt: true, status: true, organization: { select: { name: true } } } }),
    prisma.organization.findMany({ where: { OR: [{ status: "PENDING_REVIEW" }, { needsManualReview: true }] }, orderBy: { updatedAt: "desc" }, take: 100, select: { id: true, name: true, updatedAt: true, memberships: { take: 1, orderBy: { createdAt: "desc" }, select: { user: { select: { name: true, email: true } } } } } }),
  ]);

  const rows = [
    ...contacts.map((x) => ({ href: `/dashboard/inbox/contact/${x.id}`, title: x.subject, meta: `${x.guestName ?? x.guestEmail ?? "Extern"} · ${relativeTime(x.lastReplyAt)}`, type: "Kontakt", date: x.lastReplyAt })),
    ...tickets.map((x) => ({ href: `/dashboard/inbox/ticket/${x.id}`, title: `#${x.number} ${x.subject}`, meta: `${x.author?.name ?? x.guestName ?? x.guestEmail ?? "Extern"} · ${relativeTime(x.lastReplyAt)}`, type: "Ticket", date: x.lastReplyAt })),
    ...claims.map((x) => ({ href: `/dashboard/inbox/claim/${x.id}`, title: x.organization.name, meta: `${x.contactName} · ${relativeTime(x.createdAt)}`, type: "Übernahme", date: x.createdAt })),
    ...pendingOrgs.map((x) => ({ href: `/dashboard/inbox/review/${x.id}`, title: x.name, meta: `${x.memberships[0]?.user?.name ? `Eingereicht von ${x.memberships[0].user.name}` : "Profil wartet auf Prüfung"} · ${relativeTime(x.updatedAt)}`, type: "Prüfung", date: x.updatedAt })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return <>
    <PageHeader title="Inbox" description="Deine Arbeitsliste. Hier erscheint nur, was tatsächlich noch eine Aktion von dir braucht." />
    <div className="mb-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
      <span>{rows.length} offen</span><span>·</span><span>{contacts.length} Kontakt</span><span>·</span><span>{tickets.length} Tickets</span><span>·</span><span>{claims.length + pendingOrgs.length} Prüfungen</span>
    </div>
    <Card className="overflow-hidden">
      {rows.length === 0 ? <div className="flex flex-col items-center gap-2 px-5 py-12 text-center"><CheckCircle2 className="h-6 w-6 text-emerald-600"/><p className="text-sm font-semibold">Alles erledigt</p><p className="max-w-md text-xs text-muted-foreground">Aktuell braucht nichts deine Aufmerksamkeit.</p></div> : <div className="divide-y divide-border">{rows.map((row) => <Link key={`${row.type}-${row.href}`} href={row.href} className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/50 sm:px-5"><div className="min-w-0 flex-1"><div className="mb-1 flex items-center gap-2"><Badge variant="muted">{row.type}</Badge><p className="truncate text-sm font-semibold text-primary-900">{row.title}</p></div><p className="truncate text-xs text-muted-foreground">{row.meta}</p></div><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"/></Link>)}</div>}
    </Card>
  </>;
}
