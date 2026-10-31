"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Heart, LayoutDashboard, Map, MapPinned, Menu, PartyPopper, Sparkles, UsersRound, X } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { GlobalSearch } from "@/components/public/global-search";
import { cn } from "@/lib/utils";

const NAV=[
 {href:"/agenda",label:"Agenda",icon:CalendarDays},
 {href:"/fasnachten",label:"Fasnachten",icon:PartyPopper},
 {href:"/guggen",label:"Guggen",icon:UsersRound},
 {href:"/karte",label:"Karte",icon:MapPinned},
 {href:"/preise",label:"Für Organisationen",icon:Sparkles},
];
export function SiteHeader({isAuthenticated}:{isAuthenticated:boolean}){const pathname=usePathname();const[open,setOpen]=React.useState(false);React.useEffect(()=>setOpen(false),[pathname]);return <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75"><div className="container flex h-16 items-center gap-3"><Logo/><nav className="ml-3 hidden items-center gap-1 xl:flex" aria-label="Hauptnavigation">{NAV.map(item=>{const active=pathname===item.href||pathname.startsWith(`${item.href}/`);return <Link key={item.href} href={item.href} aria-current={active?"page":undefined} className={cn("rounded-lg px-3 py-2 text-sm font-medium transition-colors",active?"bg-secondary text-primary-900":"text-slate-600 hover:bg-secondary hover:text-primary-900")}>{item.label}</Link>})}</nav><div className="ml-auto flex items-center gap-2"><GlobalSearch className="hidden w-56 lg:block 2xl:w-72"/><ButtonLink href="/meine-fasnacht" variant="ghost" size="md" className="hidden lg:inline-flex" aria-label="Meine Fasnacht"><Heart/><span className="hidden 2xl:inline">Meine Fasnacht</span></ButtonLink>{isAuthenticated?<ButtonLink href="/dashboard" variant="primary" size="md" className="hidden sm:inline-flex"><LayoutDashboard/>Dashboard</ButtonLink>:<ButtonLink href="/login" variant="outline" size="md" className="hidden sm:inline-flex">Anmelden</ButtonLink>}<Button variant="ghost" size="icon" className="xl:hidden" onClick={()=>setOpen(v=>!v)} aria-expanded={open} aria-controls="mobile-nav" aria-label={open?"Menü schliessen":"Menü öffnen"}>{open?<X/>:<Menu/>}</Button></div></div>{open?<div id="mobile-nav" className="border-t border-border bg-background xl:hidden"><div className="container space-y-3 py-4"><GlobalSearch/><nav className="grid gap-1" aria-label="Hauptnavigation mobil">{NAV.map(item=>{const Icon=item.icon;const active=pathname===item.href||pathname.startsWith(`${item.href}/`);return <Link key={item.href} href={item.href} aria-current={active?"page":undefined} className={cn("flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",active?"bg-secondary text-primary-900":"text-slate-700 hover:bg-secondary")}><Icon className="h-5 w-5 shrink-0" aria-hidden="true"/><span>{item.label}</span></Link>})}<Link href="/meine-fasnacht" className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-secondary"><Heart className="h-5 w-5 shrink-0" aria-hidden="true"/>Meine Fasnacht</Link><Link href="/kantone" className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-secondary"><Map className="h-5 w-5 shrink-0" aria-hidden="true"/>Alle Kantone</Link></nav><ButtonLink href={isAuthenticated?"/dashboard":"/login"} variant="primary" block size="lg">{isAuthenticated?<><LayoutDashboard className="h-5 w-5"/>Zum Dashboard</>:<>Anmelden</>}</ButtonLink></div></div>:null}</header>}
