"use client";
import * as React from "react";
import { FileText, Paperclip } from "lucide-react";

type Attachment = {id:string;name:string;size:number;type?:string};
export function MailAttachmentCards({messageId}:{messageId:string}){
 const [files,setFiles]=React.useState<Attachment[]>([]);
 const [error,setError]=React.useState(false);
 React.useEffect(()=>{
  const controller=new AbortController();
  fetch("/api/mail-center/attachments/"+encodeURIComponent(messageId),{signal:controller.signal})
   .then(response=>{if(!response.ok)throw new Error();return response.json() as Promise<Attachment[]>;})
   .then(setFiles).catch(()=>{if(!controller.signal.aborted)setError(true);});
  return()=>controller.abort();
 },[messageId]);
 if(error)return <p className="text-xs text-red-600">Anhänge konnten nicht geladen werden.</p>;
 if(!files.length)return <p className="text-xs text-muted-foreground">Anhänge werden geladen …</p>;
 return <div className="flex flex-wrap gap-2">{files.map(file=><React.Fragment key={file.id}><a href={"/api/mail-center/attachments/"+encodeURIComponent(messageId)+"?attachment="+encodeURIComponent(file.id)} className="inline-flex max-w-full items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs hover:bg-muted" download><FileText className="h-4 w-4 shrink-0"/><span className="truncate">{file.name}</span><span className="text-muted-foreground">{Math.ceil(file.size/1024)} KB</span><Paperclip className="h-3 w-3"/></a>{file.type&&["application/pdf","image/jpeg","image/png","image/webp","image/gif","text/plain"].includes(file.type.toLowerCase())?<a target="_blank" rel="noopener noreferrer" href={"/api/mail-center/attachments/"+encodeURIComponent(messageId)+"?attachment="+encodeURIComponent(file.id)+"&preview=1"} className="rounded-lg border px-3 py-2 text-xs text-primary">Vorschau</a>:null}</React.Fragment>)}</div>;
}
