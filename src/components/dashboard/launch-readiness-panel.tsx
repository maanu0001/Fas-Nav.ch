import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardCheck } from "lucide-react";
import { Card } from "@/components/ui/card";

type Check = { label: string; ok: boolean; note: string };
export function LaunchReadinessPanel({operatorAddress,operatorName,mailConnected,onlinePayments}:{operatorAddress:boolean;operatorName:boolean;mailConnected:boolean;onlinePayments:boolean}) {
 const checks:Check[]=[
  {label:"Betreiberangaben vollständig",ok:operatorAddress&&operatorName,note:"Betreibername und ladungsfähige Adresse unter Plattform-Einstellungen prüfen"},
  {label:"Mail-Center verbunden",ok:mailConnected,note:"Postfach und Testversand mit realer Empfängeradresse prüfen"},
  {label:"Online-Bezahlung konfiguriert",ok:onlinePayments,note:"Stripe-Testzahlung, Webhook, Kündigung und Rückerstattung vor dem Launch testen"},
 ];
 const green=checks.filter(x=>x.ok).length;
 return <Card className="p-5"><div className="flex flex-wrap items-start justify-between gap-3">
   <div><h2 className="flex items-center gap-2 font-display text-lg font-semibold"><ClipboardCheck className="h-5 w-5 text-primary"/> Launch-Bereitschaft</h2><p className="mt-1 text-sm text-muted-foreground">Technische Voraussetzungen – kein Ersatz für die manuelle Endabnahme.</p></div>
   <span className="rounded-full border px-3 py-1 text-xs font-semibold">{green}/{checks.length} technische Punkte</span>
  </div>
  <div className="mt-4 divide-y rounded-xl border">{checks.map(x=><div key={x.label} className="flex items-start gap-3 p-3.5">
   {x.ok?<CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"/>:<AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"/>}
   <div><p className="text-sm font-semibold">{x.label}</p><p className="mt-0.5 text-xs text-muted-foreground">{x.note}</p></div>
  </div>)}</div>
  <p className="mt-3 text-xs text-muted-foreground">Zusätzlich erforderlich: getestete externe Backups, Restore-Probelauf, Rollen- und Browser-Tests sowie rechtliche Freigabe.</p>
  <Link href="https://github.com/maanu0001/Fas-Nav.ch/blob/main/docs/LAUNCH-READINESS.md" target="_blank" className="mt-3 inline-flex text-sm font-semibold text-primary underline">Vollständige Abnahmecheckliste</Link>
 </Card>;
}
