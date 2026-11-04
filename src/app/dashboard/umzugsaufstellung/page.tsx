import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrganizationContext } from "@/lib/dashboard-context";
import { PageHeader } from "@/components/dashboard/page-header";

export const dynamic = "force-dynamic";

async function saveEntry(form: FormData) {
  "use server";
  const ctx = await requireOrganizationContext();
  if (ctx.organization.type !== "CARNIVAL" || !ctx.can("edit")) throw new Error("Kein Zugriff");
  const number = Number(form.get("number"));
  const groupName = String(form.get("groupName") ?? "").trim();
  const startTime = String(form.get("startTime") ?? "").trim();
  const notes = String(form.get("notes") ?? "").trim();
  if (!Number.isSafeInteger(number) || number < 1 || number > 9999 || !groupName || groupName.length > 160 || startTime.length > 20 || notes.length > 500) {
    throw new Error("Ungültige Eingabe");
  }
  await prisma.paradeEntry.upsert({
    where: { organizationId_number: { organizationId: ctx.organization.id, number } },
    create: { organizationId: ctx.organization.id, number, groupName, startTime: startTime || null, notes: notes || null },
    update: { groupName, startTime: startTime || null, notes: notes || null },
  });
  revalidatePath("/fasnacht/" + ctx.organization.slug);
  revalidatePath("/dashboard/umzugsaufstellung");
}

async function removeEntry(form: FormData) {
  "use server";
  const ctx = await requireOrganizationContext();
  if (ctx.organization.type !== "CARNIVAL" || !ctx.can("edit")) throw new Error("Kein Zugriff");
  const id = String(form.get("id") ?? "");
  await prisma.paradeEntry.deleteMany({ where: { id, organizationId: ctx.organization.id } });
  revalidatePath("/fasnacht/" + ctx.organization.slug);
  revalidatePath("/dashboard/umzugsaufstellung");
}

export default async function ParadePage() {
  const ctx = await requireOrganizationContext();
  if (ctx.organization.type !== "CARNIVAL") redirect("/dashboard");
  const entries = await prisma.paradeEntry.findMany({
    where: { organizationId: ctx.organization.id }, orderBy: { number: "asc" },
  });
  return (
    <>
      <PageHeader title="Umzugsaufstellung" description="Verwalte die Startnummern und Gruppen deines Fasnachtsumzugs. Die Aufstellung erscheint auf deiner öffentlichen Fasnachtsseite." />
      {ctx.can("edit") ? (
        <form action={saveEntry} className="mb-8 grid gap-3 rounded-xl border border-border bg-card p-5 sm:grid-cols-2">
          <label className="text-sm font-medium">Startnummer
            <input name="number" type="number" min="1" max="9999" required className="mt-1 block h-10 w-full rounded-lg border border-input bg-background px-3" />
          </label>
          <label className="text-sm font-medium">Gruppe / Gugge
            <input name="groupName" maxLength={160} required className="mt-1 block h-10 w-full rounded-lg border border-input bg-background px-3" />
          </label>
          <label className="text-sm font-medium">Startzeit (optional)
            <input name="startTime" type="time" className="mt-1 block h-10 w-full rounded-lg border border-input bg-background px-3" />
          </label>
          <label className="text-sm font-medium">Hinweis (optional)
            <input name="notes" maxLength={500} className="mt-1 block h-10 w-full rounded-lg border border-input bg-background px-3" />
          </label>
          <p className="text-xs text-muted-foreground sm:col-span-2">Eine bereits vorhandene Startnummer wird beim Speichern aktualisiert.</p>
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground sm:col-span-2">Gruppe speichern</button>
        </form>
      ) : null}
      <div className="space-y-2">
        {entries.length === 0 ? <p className="text-sm text-muted-foreground">Noch keine Gruppen erfasst.</p> : null}
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary font-bold">{entry.number}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{entry.groupName}</p>
              <p className="text-sm text-muted-foreground">{[entry.startTime ? entry.startTime + " Uhr" : "", entry.notes].filter(Boolean).join(" · ")}</p>
            </div>
            {ctx.can("edit") ? <form action={removeEntry}><input type="hidden" name="id" value={entry.id} /><button type="submit" className="rounded-lg border border-input px-3 py-2 text-sm hover:bg-secondary">Entfernen</button></form> : null}
          </div>
        ))}
      </div>
    </>
  );
}
