"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Bell, LogOut, Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { NavIcon } from "@/components/dashboard/nav-icon";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  OrganizationSwitcher,
  type SwitcherOrganization,
} from "@/components/dashboard/organization-switcher";
import type { NavGroup } from "@/lib/navigation";
import { cn, initials } from "@/lib/utils";

export type SidebarUser = {
  name: string;
  email: string;
  roleLabel: string;
};

export type SidebarOrganizations = {
  items: SwitcherOrganization[];
  activeId: string;
} | null;

export function DashboardShell({ navigation, user, organizations, unreadNotifications, badges, children }: {
  navigation: NavGroup[];
  user: SidebarUser;
  organizations: SidebarOrganizations;
  unreadNotifications: number;
  badges: Record<string, number>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => { setOpen(false); }, [pathname]);

  const nav = (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4" aria-label="Dashboard-Navigation">
      {navigation.map((group, index) => (
        <div key={group.title ?? index}>
          {group.title ? <p className="mb-2 px-3 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-white/60">{group.title}</p> : null}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const anzahl = badges[item.href] ?? 0;
              const badge = anzahl > 0 ? anzahl : null;
              return (
                <li key={item.href}>
                  <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors", active ? "bg-primary text-primary-foreground" : "text-white/75 hover:bg-white/10 hover:text-white")}>
                    <NavIcon name={item.icon} className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {badge ? <span className="rounded-full bg-accent px-1.5 py-0.5 text-[0.65rem] font-bold text-accent-foreground" aria-label={`${badge} unerledigt`}>{badge}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const sidebarContent = (
    <>
      <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-5"><Logo variant="light" href="/dashboard" /></div>
      {organizations ? <OrganizationSwitcher organizations={organizations.items} activeId={organizations.activeId} /> : null}
      {nav}
      <div className="shrink-0 border-t border-white/10 p-3">
        <Link href="/dashboard/benachrichtigungen" className="mb-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white">
          <Bell className="h-4 w-4 shrink-0" aria-hidden /><span className="flex-1">Benachrichtigungen</span>
          {unreadNotifications > 0 ? <span className="rounded-full bg-accent px-1.5 py-0.5 text-[0.65rem] font-bold text-accent-foreground">{unreadNotifications}</span> : null}
        </Link>
        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg px-3 py-1.5"><span className="text-xs text-white/60">Farbschema</span><ThemeToggle tone="dark" /></div>
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground" aria-hidden>{initials(user.name)}</span>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{user.name}</p><p className="truncate text-xs text-white/60">{user.roleLabel}</p></div>
          <button type="button" onClick={() => signOut({ callbackUrl: "/" })} className="shrink-0 rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white" aria-label="Abmelden" title="Abmelden"><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-dvh bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-brand-strong lg:flex">{sidebarContent}</aside>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-brand-strong/60 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-brand-strong">{sidebarContent}</aside>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur lg:hidden">
          <Logo showWordmark={false} href="/dashboard" />
          <span className="font-display text-sm font-semibold">Dashboard</span>
          <div className="ml-auto flex items-center gap-1">
            {unreadNotifications > 0 ? (
              <Link href="/dashboard/benachrichtigungen" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground" aria-label={`${unreadNotifications} ungelesene Benachrichtigungen`}>
                <span className="relative"><Bell className="h-5 w-5" aria-hidden /><span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent-500" /></span>
              </Link>
            ) : null}
            <Button variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Menü öffnen" aria-expanded={open}><Menu /></Button>
          </div>
        </header>
        <main id="inhalt" className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      {open ? (
        <button type="button" onClick={() => setOpen(false)} className="fixed right-4 top-4 z-[60] rounded-lg bg-card p-2 shadow-lift lg:hidden" aria-label="Menü schliessen"><X className="h-5 w-5" /></button>
      ) : null}
    </div>
  );
}
