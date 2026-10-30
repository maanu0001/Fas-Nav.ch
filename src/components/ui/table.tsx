import * as React from "react";
import { cn } from "@/lib/utils";

/** Tabellen bleiben auf kleinen Bildschirmen in einem eigenen, gut bedienbaren Scrollbereich. */
export function TableWrapper({className,...props}:React.HTMLAttributes<HTMLDivElement>){return <div className={cn("relative w-full max-w-full overflow-x-auto overscroll-x-contain rounded-xl border border-border bg-card [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]",className)} {...props}/>;}
export function Table({className,...props}:React.TableHTMLAttributes<HTMLTableElement>){return <table className={cn("w-full min-w-[640px] text-sm",className)} {...props}/>;}
export function Thead({className,...props}:React.HTMLAttributes<HTMLTableSectionElement>){return <thead className={cn("bg-muted/60",className)} {...props}/>;}
export function Th({className,...props}:React.ThHTMLAttributes<HTMLTableCellElement>){return <th scope="col" className={cn("whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:px-4",className)} {...props}/>;}
export function Tr({className,...props}:React.HTMLAttributes<HTMLTableRowElement>){return <tr className={cn("border-t border-border transition-colors hover:bg-muted/40",className)} {...props}/>;}
export function Td({className,...props}:React.TdHTMLAttributes<HTMLTableCellElement>){return <td className={cn("px-3 py-3 align-middle sm:px-4",className)} {...props}/>;}
