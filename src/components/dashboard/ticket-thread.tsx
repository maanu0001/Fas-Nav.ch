"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock, Send, Trash2 } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, Select, Textarea } from "@/components/ui/input";
import { Spinner } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS } from "@/lib/constants";
import { apiRequest, errorMessage } from "@/lib/client-api";
import { formatDateTime } from "@/lib/dates";
import { cn, initials } from "@/lib/utils";
import type { TicketPriority, TicketStatus } from "@prisma/client";

export type ThreadMessage = { id: string; body: string; isInternal: boolean; createdAt: Date; authorName: string | null; author: { id: string; name: string; role: string } | null };

export function TicketThread({ ticketId, messages: initialMessages, status, priority, isStaff, canDelete = false, closed }: {
  ticketId: string;
  messages: ThreadMessage[];
  status: TicketStatus;
  priority: TicketPriority;
  isStaff: boolean;
  canDelete?: boolean;
  closed: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [body, setBody] = React.useState("");
  const [isInternal, setIsInternal] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = React.useState(status);
  const [currentPriority, setCurrentPriority] = React.useState(priority);

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setPending(true); setError(null);
    try {
      await apiRequest(`/api/tickets/${ticketId}/messages`, { method: "POST", body: { body, isInternal } });
      setBody(""); setIsInternal(false); toast("Nachricht gesendet.", "success"); router.refresh();
    } catch (err) { setError(errorMessage(err)); } finally { setPending(false); }
  }

  async function updateTicket(patch: { status?: TicketStatus; priority?: TicketPriority }) {
    try {
      await apiRequest(`/api/tickets/${ticketId}`, { method: "PATCH", body: patch });
      if (patch.status) setCurrentStatus(patch.status);
      if (patch.priority) setCurrentPriority(patch.priority);
      toast("Ticket aktualisiert.", "success"); router.refresh();
    } catch (err) { toast(errorMessage(err), "error"); }
  }

  async function deleteTicket() {
    if (!window.confirm("Ticket endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden und entfernt auch den Nachrichtenverlauf.")) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/tickets/${ticketId}`, { method: "DELETE" });
      toast("Ticket endgültig gelöscht.", "success");
      router.push("/dashboard/tickets");
      router.refresh();
    } catch (err) { toast(errorMessage(err), "error"); setDeleting(false); }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <ol className="space-y-4">
          {initialMessages.map((message) => {
            const authorLabel = message.author?.name ?? message.authorName ?? "Unbekannt";
            const fromStaff = message.author?.role === "ADMIN" || message.author?.role === "TEAM";
            return <li key={message.id}><Card className={cn("p-4", message.isInternal && "border-amber-200 bg-amber-50", fromStaff && !message.isInternal && "border-primary-200 bg-primary-50/40")}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-800" aria-hidden>{initials(authorLabel)}</span>
                <span className="text-sm font-medium text-primary-900">{authorLabel}</span>
                {fromStaff ? <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-primary-800">Fas-Nav Team</span> : null}
                {message.isInternal ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-amber-900"><Lock className="h-2.5 w-2.5" aria-hidden />Interne Notiz</span> : null}
                <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(message.createdAt)}</span>
              </div>
              <div className="space-y-2 text-sm leading-relaxed text-slate-700">{message.body.split(/\n{2,}/).map((paragraph, i) => <p key={i} className="whitespace-pre-line">{paragraph}</p>)}</div>
            </Card></li>;
          })}
        </ol>

        {closed && !isStaff ? <Alert variant="info">Dieses Ticket ist geschlossen. Für ein neues Anliegen erstelle bitte ein neues Ticket.</Alert> : <Card className="p-4"><form onSubmit={sendMessage} className="space-y-3">
          {error ? <Alert variant="error">{error}</Alert> : null}
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={5000} placeholder="Deine Antwort …" aria-label="Antwort" required />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending || !body.trim()}>{pending ? <Spinner /> : <Send />}{pending ? "Wird gesendet …" : "Antworten"}</Button>
            {isStaff ? <label className="flex items-center gap-2 text-sm text-slate-700"><Checkbox checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />Interne Notiz (für die Organisation nicht sichtbar)</label> : null}
          </div>
        </form></Card>}
      </div>

      <aside><Card className="p-5">
        <h2 className="mb-4 font-display text-base font-semibold">Ticketverwaltung</h2>
        {isStaff ? <div className="space-y-4">
          <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Status</span><Select value={currentStatus} onChange={(e) => updateTicket({ status: e.target.value as TicketStatus })}>{Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
          <label className="block"><span className="mb-1 block text-sm font-medium text-slate-700">Priorität</span><Select value={currentPriority} onChange={(e) => updateTicket({ priority: e.target.value as TicketPriority })}>{Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
          {canDelete ? <div className="border-t border-border pt-4"><p className="mb-3 text-xs text-muted-foreground">Nur Administration: Das Löschen entfernt das Ticket und seinen Nachrichtenverlauf dauerhaft.</p><Button type="button" variant="destructive" block disabled={deleting} onClick={deleteTicket}>{deleting ? <Spinner /> : <Trash2 />}{deleting ? "Wird gelöscht …" : "Ticket endgültig löschen"}</Button></div> : null}
        </div> : <dl className="space-y-3 text-sm"><div><dt className="text-muted-foreground">Status</dt><dd className="font-medium text-primary-900">{TICKET_STATUS_LABELS[currentStatus]}</dd></div><div><dt className="text-muted-foreground">Priorität</dt><dd className="font-medium text-primary-900">{TICKET_PRIORITY_LABELS[currentPriority]}</dd></div></dl>}
      </Card></aside>
    </div>
  );
}
