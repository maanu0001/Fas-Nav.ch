"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Menu, Search, X, CalendarDays, Tag, PartyPopper, Music2, MapPinned, Building2 } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/boerse", label: "Inserate", icon: Tag },
  { href: "/fasnachten", label: "Fasnachten", icon: PartyPopper },
  { href: "/guggen", label: "Guggen", icon: Music2 },
  { href: "/kantone", label: "Kantone", icon: MapPinned },
  { href: "/preise", label: "Für Organisationen", icon: Building2 },
];

export function SiteHeader({ isAuthenticated }: { isAuthenticated: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  // Menü bei Navigation schliessen.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function onSearch(event: React.FormEvent) {
    event.preventDefault();
    const term = query.trim();
    if (term.length < 2) return;
    router.push(`/suche?q=${encodeURIComponent(term)}`);
    setOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="container flex h-16 items-center gap-4">
        <Logo />

        <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="Hauptnavigation">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-primary-900"
                    : "text-foreground/80 hover:bg-secondary hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <form onSubmit={onSearch} className="relative hidden md:block" role="search">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Fasnacht, Gugge, Ort …"
              aria-label="Suche"
              className="h-10 w-48 rounded-lg border border-input bg-background pl-9 pr-3 text-sm transition-all placeholder:text-muted-foreground focus-visible:w-64 focus-visible:border-ring xl:w-56"
            />
          </form>

          <ThemeToggle className="hidden sm:inline-flex" />

          {isAuthenticated ? (
            <ButtonLink href="/dashboard" variant="primary" size="md" className="hidden sm:inline-flex">
              <LayoutDashboard />
              Dashboard
            </ButtonLink>
          ) : (
            <ButtonLink href="/login" variant="outline" size="md" className="hidden sm:inline-flex">
              Anmelden
            </ButtonLink>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Menü schliessen" : "Menü öffnen"}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {open ? (
        <div id="mobile-nav" className="border-t border-border bg-background lg:hidden">
          <div className="container space-y-3 py-4">
            <form onSubmit={onSearch} className="relative" role="search">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Fasnacht, Gugge, Ort …"
                aria-label="Suche"
                className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm"
              />
            </form>
            <nav className="grid gap-1" aria-label="Hauptnavigation mobil">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground/85 transition-colors hover:bg-secondary"
                >
                  <item.icon className="h-5 w-5 shrink-0" aria-hidden />{item.label}
                </Link>
              ))}
            </nav>
            <ButtonLink
              href={isAuthenticated ? "/dashboard" : "/login"}
              variant="primary"
              block
              size="lg"
            >
              {isAuthenticated ? "Zum Dashboard" : "Anmelden"}
            </ButtonLink>

            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              <span className="text-sm text-muted-foreground">Farbschema</span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
