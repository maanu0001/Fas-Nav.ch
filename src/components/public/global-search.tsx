"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Suggestion = { id: string; kind: string; title: string; subtitle: string; href: string };

export function GlobalSearch({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<Suggestion[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setItems([]); setLoading(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/public/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (response.ok) setItems((await response.json()).items ?? []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setItems([]);
      } finally { setLoading(false); }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (q.length >= 2) router.push(`/suche?q=${encodeURIComponent(q)}`);
  }

  const show = focused && query.trim().length >= 2;

  return (
    <div className={cn("relative", className)} onFocus={() => setFocused(true)} onBlur={() => window.setTimeout(() => setFocused(false), 120)}>
      <form onSubmit={submit} role="search" className="relative">
        <Search className={cn("pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2", inverse ? "text-white/55" : "text-muted-foreground")} aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Fasnacht, Gugge, Veranstaltung oder Ort …"
          aria-label="Fas-Nav durchsuchen"
          className={cn("h-11 w-full rounded-xl border pl-10 pr-10 text-sm outline-none transition-all focus:ring-2", inverse ? "border-white/20 bg-white/10 text-white placeholder:text-white/50 focus:border-white/35 focus:ring-white/15" : "border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/15")}
        />
        {loading ? <Loader2 className={cn("absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin", inverse ? "text-white/60" : "text-muted-foreground")} aria-hidden /> : null}
      </form>

      {show ? (
        <div className="absolute left-0 right-0 top-[calc(100%+.45rem)] z-50 overflow-hidden rounded-xl border border-border bg-card text-foreground shadow-lift">
          {items.length ? (
            <>
              <ul className="divide-y divide-border">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link href={item.href} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary">
                      <span className="w-24 shrink-0 text-[10px] font-bold uppercase tracking-wider text-accent-700">{item.kind}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-primary-900">{item.title}</span><span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => router.push(`/suche?q=${encodeURIComponent(query.trim())}`)} className="w-full border-t border-border px-4 py-3 text-left text-xs font-semibold text-primary-700 hover:bg-secondary">Alle Suchergebnisse anzeigen →</button>
            </>
          ) : !loading ? <p className="px-4 py-4 text-sm text-muted-foreground">Keine direkten Treffer. Enter zeigt die vollständige Suche.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
