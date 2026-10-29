"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, MapPin, Sparkles, Users } from "lucide-react";

type Canton = { code: string; name: string; slug: string; organizationCount: number; eventCount: number };

/*
 * Kantonszentren in einer gemeinsamen, geografisch plausiblen Schweiz-Zeichenfläche.
 * Die Silhouette und Marker verwenden exakt dieselbe viewBox (0 0 1000 620).
 */
const POS: Record<string, [number, number]> = {
  GE: [100, 475], VD: [210, 405], VS: [405, 500], NE: [280, 315], JU: [295, 220],
  FR: [350, 385], BE: [465, 375], SO: [470, 285], BS: [485, 215], BL: [500, 245],
  AG: [565, 280], LU: [575, 355], OW: [590, 405], NW: [620, 375], UR: [650, 430],
  ZG: [650, 330], ZH: [705, 270], SH: [720, 190], SZ: [715, 365], GL: [770, 380],
  SG: [830, 305], AR: [875, 285], AI: [875, 320], TG: [815, 225], GR: [825, 445], TI: [700, 535],
};

/* Vereinfachte, aber geografisch erkennbare Schweizer Landesgrenze. */
const SWISS_PATH = "M92 430 L125 392 L145 350 L205 338 L224 286 L274 274 L305 225 L363 240 L398 205 L452 220 L488 180 L535 205 L584 168 L628 198 L690 190 L724 222 L784 220 L812 252 L868 266 L854 310 L890 342 L858 372 L870 420 L820 430 L790 470 L738 462 L706 516 L658 488 L612 530 L565 498 L515 522 L466 490 L420 506 L380 472 L326 484 L292 445 L238 456 L210 420 L150 438 L122 412 Z";

export function SwitzerlandMap({ cantons }: { cantons: Canton[] }) {
  const [active, setActive] = React.useState<string | null>(null);
  const selected = cantons.find((canton) => canton.code === active) ?? null;
  const totalOrganizations = cantons.reduce((sum, canton) => sum + canton.organizationCount, 0);
  const totalEvents = cantons.reduce((sum, canton) => sum + canton.eventCount, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
      <div className="relative min-h-[520px] overflow-hidden rounded-[28px] border border-white/10 bg-[#09162a] shadow-lift sm:min-h-[570px]">
        <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-primary-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-accent-500/15 blur-3xl" />

        <div className="relative z-20 flex flex-wrap items-start justify-between gap-3 p-5 sm:p-7">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-gold-400" aria-hidden /> Schweiz entdecken
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/55">Wähle deinen Kanton und sieh direkt, wo auf Fas-Nav schon Fasnacht läuft.</p>
          </div>
          <div className="flex gap-2 text-xs text-white/65">
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5"><strong className="text-white">{totalOrganizations}</strong> Organisationen</span>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5"><strong className="text-white">{totalEvents}</strong> Termine</span>
          </div>
        </div>

        <div className="absolute inset-x-[2%] bottom-[3%] top-[18%] sm:inset-x-[4%] sm:bottom-[4%] sm:top-[17%]">
          <svg viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" aria-hidden>
            <defs>
              <linearGradient id="fasnav-map-fill" x1="150" y1="170" x2="850" y2="510" gradientUnits="userSpaceOnUse">
                <stop stopColor="#124363" /><stop offset="0.55" stopColor="#0d304b" /><stop offset="1" stopColor="#10243d" />
              </linearGradient>
              <filter id="fasnav-map-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10" /></filter>
            </defs>
            <path d={SWISS_PATH} fill="#0279ad" opacity=".2" filter="url(#fasnav-map-glow)" transform="translate(0 8)" />
            <path d={SWISS_PATH} fill="url(#fasnav-map-fill)" stroke="rgba(91,192,235,.62)" strokeWidth="3" />
            <path d="M145 350 C250 335 335 350 420 315 C520 273 620 292 710 260 C770 238 820 245 866 266" fill="none" stroke="rgba(255,255,255,.055)" strokeWidth="2" strokeDasharray="7 12" />
            <path d="M210 420 C315 392 390 430 490 385 C585 342 680 370 820 318" fill="none" stroke="rgba(254,170,25,.09)" strokeWidth="2" strokeDasharray="4 14" />
          </svg>

          <div className="pointer-events-none absolute left-[13%] top-[31%] h-2 w-2 rotate-45 bg-gold-400/80" />
          <div className="pointer-events-none absolute right-[8%] top-[28%] h-2.5 w-1.5 rotate-[28deg] rounded-full bg-accent-400/80" />
          <div className="pointer-events-none absolute bottom-[15%] left-[25%] h-1.5 w-3 -rotate-12 rounded-full bg-primary-300/80" />

          {cantons.map((canton) => {
            const position = POS[canton.code];
            if (!position) return null;
            const total = canton.organizationCount + canton.eventCount;
            const isActive = active === canton.code;
            return (
              <button
                key={canton.code}
                type="button"
                onClick={() => setActive(canton.code)}
                onMouseEnter={() => setActive(canton.code)}
                style={{ left: `${position[0] / 10}%`, top: `${position[1] / 6.2}%` }}
                className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-bold shadow-lg backdrop-blur-md transition-all duration-200 sm:px-2.5 sm:py-1.5 sm:text-xs ${isActive ? "z-30 scale-110 border-primary-300 bg-primary-500 text-white ring-4 ring-primary-400/20" : "border-white/15 bg-[#0d2037]/90 text-white/90 hover:z-20 hover:scale-110 hover:border-primary-300/70 hover:bg-primary-700"}`}
                aria-label={`${canton.name}: ${canton.organizationCount} Organisationen, ${canton.eventCount} Termine`}
              >
                {canton.code}<span className={`ml-1 text-[8px] font-medium sm:text-[9px] ${isActive ? "text-white/80" : "text-white/45"}`}>{total}</span>
              </button>
            );
          })}
        </div>

        <div className="pointer-events-none absolute bottom-5 left-5 z-20 hidden items-center gap-2 text-[11px] text-white/40 sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-primary-400" /> Hover oder tippen, um einen Kanton zu entdecken</div>
      </div>

      <aside className="relative overflow-hidden rounded-[28px] border border-border bg-card p-6 shadow-subtle sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary-100/70 blur-3xl" />
        {selected ? (
          <div className="relative">
            <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-700">{selected.code}</p><span className="rounded-full bg-primary-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-700">Kanton gewählt</span></div>
            <h2 className="mt-2 font-display text-3xl font-bold text-primary-950">{selected.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">Entdecke die Fasnacht in {selected.name} auf einen Blick.</p>
            <div className="mt-7 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-primary-100 bg-primary-50/70 p-4"><Users className="h-4 w-4 text-primary-600" aria-hidden /><p className="mt-3 font-display text-2xl font-bold">{selected.organizationCount}</p><p className="mt-0.5 text-xs text-muted-foreground">Organisationen</p></div>
              <div className="rounded-2xl border border-accent-100 bg-accent-50/60 p-4"><CalendarDays className="h-4 w-4 text-accent-600" aria-hidden /><p className="mt-3 font-display text-2xl font-bold">{selected.eventCount}</p><p className="mt-0.5 text-xs text-muted-foreground">Termine</p></div>
            </div>
            <Link href={`/kanton/${selected.slug}`} className="mt-7 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary-800 hover:shadow-md"><MapPin className="h-4 w-4" aria-hidden />{selected.name} entdecken</Link>
            <Link href={`/agenda?canton=${selected.slug}`} className="mt-2.5 inline-flex h-11 w-full items-center justify-center rounded-xl border border-border bg-card text-sm font-semibold text-primary-800 transition-colors hover:bg-secondary">Agenda im Kanton</Link>
          </div>
        ) : (
          <div className="relative flex h-full min-h-64 flex-col justify-center lg:min-h-[450px]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600"><MapPin className="h-5 w-5" aria-hidden /></div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-accent-700">Deine Fasnacht beginnt hier</p>
            <h2 className="mt-2 font-display text-2xl font-bold">Wähle einen Kanton</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Fahre über die Karte oder tippe einen Kanton an. Du siehst sofort Organisationen, Veranstaltungen und den direkten Einstieg in die regionale Fasnacht.</p>
            <div className="mt-7 flex gap-5 border-t border-border pt-5 text-sm"><div><strong className="block font-display text-xl text-primary-950">26</strong><span className="text-xs text-muted-foreground">Kantone</span></div><div><strong className="block font-display text-xl text-primary-950">{totalOrganizations + totalEvents}</strong><span className="text-xs text-muted-foreground">Inhalte</span></div></div>
          </div>
        )}
      </aside>
    </div>
  );
}
