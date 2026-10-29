"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { apiRequest, errorMessage } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";

export function DeleteResourceButton({ endpoint, label, confirmText, redirectTo }: { endpoint: string; label: string; confirmText: string; redirectTo?: string }) {
  const router = useRouter(); const { toast } = useToast(); const [open,setOpen]=React.useState(false); const [pending,setPending]=React.useState(false);
  async function remove(){setPending(true);try{await apiRequest(endpoint,{method:"DELETE"});toast(`${label} gelöscht.`,"success");setOpen(false);if(redirectTo)router.push(redirectTo);else router.refresh()}catch(e){toast(errorMessage(e),"error")}finally{setPending(false)}}
  return <><Button type="button" variant="destructive" size="sm" onClick={()=>setOpen(true)}><Trash2/>Löschen</Button><ConfirmDialog open={open} onClose={()=>setOpen(false)} onConfirm={remove} pending={pending} title={`${label} löschen?`} description={confirmText} confirmLabel="Endgültig löschen" destructive/></>;
}
