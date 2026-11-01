"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, LogOut } from "lucide-react";
import { apiRequest, errorMessage } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";

export function StartOrganizationTestMode({ organizationId }: { organizationId: string }) {
 const router=useRouter();const{toast}=useToast();const[pending,setPending]=React.useState(false);
 async function start(){setPending(true);try{await apiRequest("/api/admin/testmodus",{method:"POST",body:{organizationId}});router.push("/dashboard");router.refresh()}catch(e){toast(errorMessage(e),"error")}finally{setPending(false)}}
 return <button type="button" onClick={start} disabled={pending} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted disabled:opacity-50"><Eye className="h-4 w-4"/>{pending?"Wird geöffnet …":"Als Organisation testen"}</button>;
}
export function AdminTestModeBanner({ organizationName }: { organizationName: string }) {
 const router=useRouter();const{toast}=useToast();const[pending,setPending]=React.useState(false);
 async function stop(){setPending(true);try{await apiRequest("/api/admin/testmodus",{method:"DELETE"});router.push("/dashboard/organisationen");router.refresh()}catch(e){toast(errorMessage(e),"error")}finally{setPending(false)}}
 return <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-950"><div className="flex items-center gap-2"><Eye className="h-4 w-4"/><strong>Testmodus</strong><span>Du nutzt Fas-Nav als „{organizationName}“.</span></div><button type="button" onClick={stop} disabled={pending} className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-amber-950 px-3 font-semibold text-white disabled:opacity-50"><LogOut className="h-4 w-4"/>{pending?"Wird beendet …":"Testmodus beenden"}</button></div>;
}
