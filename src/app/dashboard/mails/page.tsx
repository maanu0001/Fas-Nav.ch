import Link from "next/link";
import { requireAdminPage } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";
import { mailboxConfiguration } from "@/lib/mail-center-imap";
import { MailCenter } from "@/components/dashboard/mail-center";
export const dynamic="force-dynamic";
export default async function MailCenterPage(){
 await requireAdminPage();
 const [conversations,configuration]=await Promise.all([
  prisma.mailConversation.findMany({orderBy:{lastMessageAt:"desc"},take:100,include:{messages:{orderBy:{receivedAt:"asc"},select:{id:true,providerId:true,sender:true,recipients:true,subject:true,textBody:true,direction:true,receivedAt:true,attachmentInfo:true}}}}),
  mailboxConfiguration()
 ]);
 return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-display text-2xl font-bold">Mails</h1><p className="mt-1 text-sm text-muted-foreground">Postfach {configuration.mailbox||"info@fas-nav.ch"} · Konversationen und Antworten</p></div><Link href="/dashboard/e-mails" className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted">E-Mail Templates bearbeiten</Link></div><MailCenter initial={JSON.parse(JSON.stringify(conversations))} connected={configuration.configured} mailbox={configuration.mailbox}/></div>;
}
