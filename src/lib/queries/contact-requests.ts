import { Prisma } from "@prisma/client";

import {
  OPEN_CLAIM_REQUEST_STATUSES,
  type ClaimRequestStatus,
} from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { normalizeSearchTerm } from "@/lib/search";

export const CONTACT_TICKET_WHERE: Prisma.TicketWhereInput = { category: "CONTACT" };

export function contactTicketWhere(params: { q?: string; status?: string }): Prisma.TicketWhereInput {
  const bedingungen: Prisma.TicketWhereInput[] = [CONTACT_TICKET_WHERE];
  if (params.status) bedingungen.push({ status: params.status as never });
  const term = normalizeSearchTerm(params.q);
  if (term) bedingungen.push({ OR: [
    { subject: { contains: term, mode: "insensitive" } }, { guestName: { contains: term, mode: "insensitive" } },
    { guestEmail: { contains: term, mode: "insensitive" } }, { author: { name: { contains: term, mode: "insensitive" } } },
    { author: { email: { contains: term, mode: "insensitive" } } }, { messages: { some: { body: { contains: term, mode: "insensitive" } } } },
  ] });
  return { AND: bedingungen };
}

export function claimRequestWhere(params: { q?: string; status?: string }): Prisma.ClaimRequestWhereInput {
  const bedingungen: Prisma.ClaimRequestWhereInput[] = [];
  if (params.status) bedingungen.push({ status: params.status });
  const term = normalizeSearchTerm(params.q);
  if (term) bedingungen.push({ OR: [
    { contactName: { contains: term, mode: "insensitive" } }, { contactEmail: { contains: term, mode: "insensitive" } },
    { message: { contains: term, mode: "insensitive" } }, { organization: { name: { contains: term, mode: "insensitive" } } },
    { organization: { slug: { contains: term, mode: "insensitive" } } }, { organization: { city: { contains: term, mode: "insensitive" } } },
  ] });
  return bedingungen.length ? { AND: bedingungen } : {};
}

export const CLAIM_REQUEST_LIST_SELECT = {
  id: true, contactName: true, contactEmail: true, status: true, createdAt: true, handledAt: true,
  organization: { select: { id: true, name: true, slug: true, type: true, city: true } },
} satisfies Prisma.ClaimRequestSelect;

/** Nur Zustände zählen, bei denen Fas-Nav selbst noch handeln muss. */
export async function openContactRequestCounts(): Promise<{ contact: number; claims: number; total: number }> {
  const [contact, claims] = await Promise.all([
    prisma.ticket.count({ where: { ...CONTACT_TICKET_WHERE, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.claimRequest.count({ where: { status: { in: OPEN_CLAIM_REQUEST_STATUSES } } }),
  ]);
  return { contact, claims, total: contact + claims };
}

export function isOpenClaimRequest(status: string): boolean {
  return OPEN_CLAIM_REQUEST_STATUSES.includes(status as ClaimRequestStatus);
}
