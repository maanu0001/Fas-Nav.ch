import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmailTemplatesForm } from "@/components/dashboard/email-templates-form";
import { Card } from "@/components/ui/card";
import { getEmailTemplates } from "@/lib/email-templates";
import { getMailSettingsForAdmin } from "@/lib/mail-settings";
import { requirePermission } from "@/lib/rbac";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"E-Mails"};
export default async function EmailsPage(){await requirePermission("manageSettings");const [templates,mail]=await Promise.all([getEmailTemplates(),getMailSettingsForAdmin()]);return <><PageHeader title="E-Mails" description="Transaktionale E-Mails zentral verwalten, bearbeiten und pro Trigger aktivieren."/><div className="space-y-6"><Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display font-semibold">Mailversand</h2><p className="mt-1 text-sm text-muted-foreground">SMTP-Verbindung und Absender werden unter Einstellungen verwaltet.</p></div><div className="text-sm"><span className={mail.enabled&&mail.complete?"text-emerald-700":"text-amber-700"}>{mail.enabled&&mail.complete?"● Aktiv":"● Nicht versandbereit"}</span></div></div></Card><EmailTemplatesForm initial={templates}/></div></>}
