import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/page-header";
import { AccountSettingsForm } from "@/components/dashboard/account-settings-form";
import { MailSettingsForm } from "@/components/dashboard/mail-settings-form";
import { PasswordChangeForm } from "@/components/dashboard/password-change-form";
import { AgendaReminderSettings } from "@/components/dashboard/agenda-reminder-settings";
import { MaintenanceSettings } from "@/components/dashboard/maintenance-settings";
import { PlatformSettingsForm } from "@/components/dashboard/platform-settings-form";
import { ROLE_LABELS } from "@/lib/constants";
import { getDashboardContext } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";
import { getMaintenanceState } from "@/lib/maintenance";
import { getReminderSettings } from "@/lib/agenda-reminder-job";
import { getMailSettingsForAdmin, MAIL_SETTINGS_GROUP } from "@/lib/mail-settings";
import { isAdmin } from "@/lib/rbac";
import type { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Einstellungen" };

export default async function SettingsPage() {
  const context = await getDashboardContext();
  const admin = isAdmin(context.user.role as Role);

  // Die Mailwerte sind bewusst ausgenommen: Sie haben eine eigene Maske, die
  // das Passwort verschlüsselt und nie zurückgibt. In der allgemeinen Liste
  // stünde der gespeicherte Wert im Formular – und liesse sich dort im
  // Klartext überschreiben, an der Verschlüsselung vorbei.
  const settings = admin
    ? await prisma.siteSetting.findMany({
        where: { group: { not: MAIL_SETTINGS_GROUP } },
        orderBy: [{ group: "asc" }, { key: "asc" }],
      })
    : [];

  // Der Wartungsmodus gehört zu den Einstellungen, wird aber als eigener
  // Abschnitt geführt: Er wirkt sofort auf die gesamte Website.
  const maintenance = admin ? await getMaintenanceState() : null;

  // Erinnerung an fehlende Agenda-Einträge – ebenfalls nur für die Administration.
  const reminder = admin ? await getReminderSettings() : null;

  // Die Mailkonfiguration ohne Passwort: Der Klartext verlässt den Server nie.
  const mail = admin ? await getMailSettingsForAdmin() : null;

  // Die Sitzung führt Name und Adresse mit, kann aber älter sein als die
  // letzte Änderung. Für das Formular zählt der Stand in der Datenbank.
  const konto = await prisma.user.findUnique({
    where: { id: context.user.id },
    select: { name: true, email: true, ticketEmails: true },
  });

  return (
    <>
      <PageHeader title="Einstellungen" description="Dein Konto und die Plattform." />

      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="mb-1 font-display text-base font-semibold">Dein Konto</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Rolle: {ROLE_LABELS[context.user.role as Role]}. Deine E-Mail-Adresse ist privat
            und erscheint nicht auf öffentlichen Seiten.
          </p>
          <AccountSettingsForm
            initial={{
              name: konto?.name ?? context.user.name ?? "",
              email: konto?.email ?? context.user.email ?? "",
              ticketEmails: konto?.ticketEmails ?? true,
            }}
          />
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 font-display text-base font-semibold">Passwort ändern</h2>
          <PasswordChangeForm />
        </Card>

        {admin && maintenance ? (
          <MaintenanceSettings enabled={maintenance.enabled} message={maintenance.message} />
        ) : null}

        {admin && reminder ? <AgendaReminderSettings initial={reminder} /> : null}

        {admin && mail ? (
          <div className="space-y-3">
            <div>
              <h2 className="font-display text-base font-semibold">E-Mail / Mailversand</h2>
              <p className="text-sm text-muted-foreground">
                Server, Absender und die Vorlage für Ticketmeldungen. Zugangsdaten werden
                verschlüsselt gespeichert und nie wieder angezeigt.
              </p>
            </div>
            <MailSettingsForm initial={mail} />
          </div>
        ) : null}

        {admin ? (
          <Card className="p-5">
            <h2 className="mb-1 font-display text-base font-semibold">Plattform-Einstellungen</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Diese Angaben erscheinen unter anderem im Impressum, auf der Kontaktseite und der
              Preisseite.
            </p>
            <PlatformSettingsForm
              settings={settings.map((s) => ({
                key: s.key,
                label: s.label ?? s.key,
                group: s.group,
                value: typeof s.value === "string" ? s.value : JSON.stringify(s.value),
              }))}
            />
          </Card>
        ) : null}
      </div>
    </>
  );
}
