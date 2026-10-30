"use client";
import * as React from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { apiRequest,errorMessage } from "@/lib/client-api";
import { useToast } from "@/components/ui/toast";
export function DeleteNotificationButton({id}:{id:string}){const router=useRouter();const{toast}=useToast();const[pending,setPending]=React.useState(false);async function remove(e:React.MouseEvent){e.preventDefault();e.stopPropagation();if(!window.confirm("Benachrichtigung endgültig löschen?"))return;setPending(true);try{await apiRequest("/api/notifications",{method:"DELETE",body:{ids:[id]}});toast("Benachrichtigung gelöscht.","success");router.refresh();}catch(error){toast(errorMessage(error),"error");}finally{setPending(false)}}return <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={remove} aria-label="Benachrichtigung löschen" title="Benachrichtigung löschen"><Trash2 className="h-4 w-4"/></Button>}
