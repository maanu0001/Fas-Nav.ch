import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({title,description,actions,breadcrumbs,className}:{title:string;description?:string;actions?:React.ReactNode;breadcrumbs?:{href?:string;label:string}[];className?:string}) {
 return <div className={cn("mb-5 min-w-0 sm:mb-6",className)}>
  {breadcrumbs?.length?<nav aria-label="Brotkrumen" className="-mx-1 mb-2 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><ol className="flex w-max items-center gap-1 whitespace-nowrap text-xs text-muted-foreground sm:flex-wrap sm:text-sm">{breadcrumbs.map((crumb,index)=><li key={`${crumb.label}-${index}`} className="flex items-center gap-1">{index>0?<ChevronRight className="h-3.5 w-3.5" aria-hidden/>:null}{crumb.href?<Link href={crumb.href} className="transition-colors hover:text-foreground">{crumb.label}</Link>:<span className="text-foreground">{crumb.label}</span>}</li>)}</ol></nav>:null}
  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><h1 className="break-words font-display text-xl font-bold leading-tight sm:text-2xl">{title}</h1>{description?<p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>:null}</div>{actions?<div className="grid w-full grid-cols-1 gap-2 [&>*]:w-full sm:flex sm:w-auto sm:shrink-0 sm:flex-wrap sm:[&>*]:w-auto">{actions}</div>:null}</div>
 </div>;
}
