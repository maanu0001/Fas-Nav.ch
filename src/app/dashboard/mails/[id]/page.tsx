import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";
import { mailboxConfiguration } from "@/lib/mail-center-imap";
import { MailCenter } from "@/components/dashboard/mail-center";

export const dynamic="force-dynamic";
type Props={params:Promise<{id:string}>};

/** Separate message route: the mobile view shows the full conversation instead of stacking below the list. */
export default async function MailConversationPage({params}:Props){
 await requireAdminPage();
 const {id}=await params;
 const [conversations,configuration]=await Promise.all([
  prisma.mailConversation.findMany({orderBy:{lastMessageAt:"desc"},take:100,include:{messages:{orderBy:{receivedAt:"asc"},select:{id:true,providerId:true,sender:true,recipients:true,subject:true,textBody:true,direction:true,receivedAt:true,attachmentInfo:true}}}}),
  mailboxConfiguration()
 ]);
 if(!conversations.some(c=>c.id===id)){const conversation=await prisma.mailConversation.findUnique({where:{id},include:{messages:{orderBy:{receivedAt:"asc"},select:{id:true,providerId:true,sender:true,recipients:true,subject:true,textBody:true,direction:true,receivedAt:true,attachmentInfo:true}}}});if(!conversation)notFound();conversations.unshift(conversation);}
 return <div className="space-y-5"><div><h1 className="font-display text-2xl font-bold">Mails</h1><p className="mt-1 text-sm text-muted-foreground">Konversationen · {configuration.mailbox||"info@fas-nav.ch"}</p></div><MailCenter initial={JSON.parse(JSON.stringify(conversations))} connected={configuration.configured} mailbox={configuration.mailbox} initialSelected={id}/></div>;
}
