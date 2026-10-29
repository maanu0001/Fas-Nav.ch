"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";

type Canton = { code: string; name: string; slug: string; organizationCount: number; eventCount: number };

// Relative canton-centre positions on the stylised Switzerland silhouette.
// These follow the actual geographic arrangement of all 26 cantons rather
// than distributing labels for visual convenience.
const POS: Record<string, [number, number]> = {
  GE: [8, 69],
  VD: [20, 58],
  VS: [39, 76],
  NE: [27, 42],
  JU: [28, 25],
  FR: [33, 52],
  BE: [45, 54],
  SO: [45, 35],
  BS: [47, 20],
  BL: [49, 25],
  AG: [56, 34],
  LU: [57, 48],
  OW: [59, 57],
  NW: [62, 51],
  UR: [64, 62],
  ZG: [64, 42],
  ZH: [69, 32],
  SH: [70, 18],
  SZ: [70, 49],
  GL: [76, 52],
  SG: [82, 39],
  AR: [86, 34],
  AI: [87, 39],
  TG: [80, 25],
  GR: [82, 65],
  TI: [70, 81],
};

export function SwitzerlandMap({ cantons }: { cantons: Canton[] }) {
  const [active, setActive] = React.useState<string | null>(null);
  const selected = cantons.find((canton) => canton.code === active) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="relative aspect-[16/10] min-h-[420px] overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary-50 via-card to-sky-50 shadow-subtle">
        <svg viewBox="0 0 900 560" className="absolute inset-[5%] h-[90%] w-[90%] text-primary-100" aria-hidden>
          <path d="M83 355L123 302 190 290 215 224 289 207 323 152 394 168 438 121 506 154 574 118 637 153 707 148 741 190 814 213 797 270 838 310 789 345 800 399 732 410 695 462 620 444 573 487 507 452 448 478 390 442 330 458 284 415 214 429 181 382 119 394Z" fill="currentColor" stroke="hsl(var(--primary-200))" strokeWidth="3" />
        </svg>

        <div className="absolute left-5 top-5 rounded-xl border border-border/80 bg-card/90 px-4 py-3 shadow-subtle backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-700">Schweiz entdecken</p>
          <p className="mt-1 text-sm text-muted-foreground">Kanton auswählen</p>
        </div>

        {cantons.map((canton) => {
          const position = POS[canton.code];
          if (!position) return null;
          const total = canton.organizationCount + canton.eventCount;
          return (
            <button
              key={canton.code}
              type="button"
              onClick={() => setActive(canton.code)}
              onMouseEnter={() => setActive(canton.code)}
              style={{ left: `${position[0]}%`, top: `${position[1]}%` }}
              className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border px-2.5 py-1.5 text-xs font-bold shadow-subtle transition-all hover:z-20 hover:scale-110 ${active === canton.code ? "border-primary-600 bg-primary-600 text-white ring-4 ring-primary-200/50" : "border-border bg-card/95 text-primary-900 hover:border-primary-300"}`}
              aria-label={`${canton.name}: ${canton.organizationCount} Organisationen, ${canton.eventCount} Termine`}
            >
              {canton.code}<span className="ml-1 text-[9px] font-medium opacity-60">{total}</span>
            </button>
          );
        })}
      </div>

      <aside className="rounded-2xl border border-border bg-card p-6 shadow-subtle">
        {selected ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent-700">{selected.code}</p>
            <h2 className="mt-1 font-display text-2xl font-bold">{selected.name}</h2>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-secondary p-4"><Users className="h-4 w-4 text-primary-600" aria-hidden /><p className="mt-2 font-display text-2xl font-bold">{selected.organizationCount}</p><p className="text-xs text-muted-foreground">Organisationen</p></div>
              <div className="rounded-xl bg-secondary p-4"><CalendarDays className="h-4 w-4 text-accent-600" aria-hidden /><p className="mt-2 font-display text-2xl font-bold">{selected.eventCount}</p><p className="text-xs text-muted-foreground">Termine</p></div>
            </div>
            <Link href={`/kanton/${selected.slug}`} className="mt-6 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-800"><MapPin className="h-4 w-4" aria-hidden />{selected.name} entdecken</Link>
            <Link href={`/agenda?canton=${selected.slug}`} className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-lg border border-border text-sm font-semibold text-primary-800 transition-colors hover:bg-secondary">Agenda im Kanton</Link>
          </>
        ) : (
          <div className="flex h-full min-h-64 flex-col items-center justify-center text-center">
            <MapPin className="h-8 w-8 text-primary-500" aria-hidden />
            <h2 className="mt-4 font-display text-xl font-bold">Wo ist Fasnacht?</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Fahre mit der Maus über einen Kanton oder tippe ihn an. Die Zahl zeigt dir, wie viele Inhalte dort bereits auf Fas-Nav verfügbar sind.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
