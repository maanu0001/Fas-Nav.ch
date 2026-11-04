"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, CalendarDays, Users, Tent } from "lucide-react";
const items = [
  { href: "/", label: "Start", Icon: Home },
  { href: "/suche", label: "Suche", Icon: Search },
  { href: "/agenda", label: "Agenda", Icon: CalendarDays },
  { href: "/fasnachten", label: "Fasnachten", Icon: Tent },
  { href: "/guggen", label: "Vereine", Icon: Users },
];
export function MobileBottomNav() {
  const pathname = usePathname();
  return <nav aria-label="Mobile Schnellnavigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 shadow-lg backdrop-blur-xl md:hidden" style={{paddingBottom:"env(safe-area-inset-bottom)"}}>
    <div className="grid grid-cols-5">{items.map(({href,label,Icon}) => {
      const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
      return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={"flex min-h-[60px] flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-semibold " + (active ? "text-primary" : "text-muted-foreground")}>
        <Icon className="h-5 w-5" aria-hidden /><span>{label}</span>
      </Link>;
    })}</div>
  </nav>;
}
