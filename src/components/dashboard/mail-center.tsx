"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AcquisitionComposer } from "@/components/dashboard/acquisition-composer";
import { BoardingManagement } from "@/components/dashboard/boarding-management";
import { Archive, ArrowLeft, FileText, Inbox, Mail, MailOpen, Paperclip, Send, Trash2 } from "lucide-react";

type Message = {
  id:string;providerId:string;sender:string;
  recipients:{to?:string;cc?:string;bcc?:string};
  subject:string;textBody:string;direction:string;receivedAt:string;
  attachmentInfo:unknown;
};
type Conversation = {
  id:string;subject:string;status:string;unread:boolean;folder:string;
  lastMessageAt:string;messages:Message[];
};
type Attachment = {name:string;type:string;data:string};
type FileInfo = {id:string;name:string;size:number;type?:string};
type Folder = "INBOX"|"SENT"|"ARCHIVE"|"TRASH"|"ALL";
const FOLDERS:{id:Folder;label:string;icon:typeof Inbox}[]=[
  {id:"INBOX",label:"Posteingang",icon:Inbox},
  {id:"SENT",label:"Gesendet",icon:Send},
  {id:"ARCHIVE",label:"Archiv",icon:Archive},
  {id:"TRASH",label:"Papierkorb",icon:Trash2},
  {id:"ALL",label:"Alle Konversationen",icon:Mail},
];
function formatDate(date:string){return new Date(date).toLocaleString("de-CH",{dateStyle:"short",timeStyle:"short"});}
function attachmentCount(value:unknown):number {
  if(value&&typeof value==="object"&&"count" in value&&typeof value.count==="number")return value.count;
  return 0;
}
export function MailCenter({initial,connected,mailbox,initialSelected}:{initial:Conversation[];connected:boolean;mailbox:string;initialSelected?:string}){
 const router=useRouter();
 const [conversations,setConversations]=React.useState(initial);
 const [folder,setFolder]=React.useState<Folder>("INBOX");
 const [selected,setSelected]=React.useState(initialSelected||"");
 const [newMail,setNewMail]=React.useState(false);
 const [newAcquisition,setNewAcquisition]=React.useState(false);
 const [newBoarding,setNewBoarding]=React.useState(false);
 const [replying,setReplying]=React.useState(false);
 const [to,setTo]=React.useState("");const [cc,setCc]=React.useState("");const [bcc,setBcc]=React.useState("");
 const [subject,setSubject]=React.useState("");const [body,setBody]=React.useState("");
 const [files,setFiles]=React.useState<Attachment[]>([]);
 const [contacts,setContacts]=React.useState<string[]>([]);
 const [focused,setFocused]=React.useState<"to"|"cc"|"bcc"|null>(null);
 const [attachments,setAttachments]=React.useState<Record<string,FileInfo[]>>({});
 const [busy,setBusy]=React.useState(false);const [error,setError]=React.useState("");const [notice,setNotice]=React.useState("");
 const [search,setSearch]=React.useState("");
 const polling=React.useRef(false);
 const [syncWarning,setSyncWarning]=React.useState("");
 const active=conversations.find(c=>c.id===selected);
 const lastIncoming=active?.messages.filter(m=>m.direction==="IN").at(-1);
 const shown=conversations.filter(c=>(folder==="ALL" ? c.folder!=="TRASH" : c.folder===folder)
   &&(c.subject+" "+c.messages.map(m=>m.sender+" "+m.recipients?.to+" "+m.textBody).join(" ")).toLowerCase().includes(search.toLowerCase()));
 async function api(data:Record<string,unknown>){
  const response=await fetch("/api/mail-center",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
  const json=await response.json();
  if(!response.ok)throw new Error(json.error||"Aktion fehlgeschlagen.");
  return json;
 }
 async function refresh(){
  const res=await fetch("/api/mail-center",{cache:"no-store"});
  if(!res.ok)throw new Error("Aktualisieren fehlgeschlagen.");
  const result=await res.json();
  setConversations(result.conversations);
  setContacts(result.contacts||[]);
  return result as {conversations:Conversation[];contacts:string[]};
 }
 React.useEffect(()=>{
  let alive=true;
  async function poll(){
   if(!alive||polling.current||document.visibilityState==="hidden")return;
   polling.current=true;
   try{
    if(connected)await api({action:"sync"});
    if(alive){await refresh();setSyncWarning("");}
   }catch(error){
    if(alive){
     await refresh().catch(()=>{});
     setSyncWarning(error instanceof Error?error.message:"Postfach kann momentan nicht synchronisiert werden.");
    }
   }finally{polling.current=false;}
  }
  void poll();
  const interval=window.setInterval(()=>void poll(),3000);
  const visible=()=>{if(document.visibilityState==="visible")void poll();};
  document.addEventListener("visibilitychange",visible);
  return ()=>{alive=false;window.clearInterval(interval);document.removeEventListener("visibilitychange",visible);};
 },[connected]);
 React.useEffect(()=>{
  if(!active)return;
  for(const message of active.messages){
   if(!attachmentCount(message.attachmentInfo)||attachments[message.id])continue;
   fetch("/api/mail-center/attachments/"+encodeURIComponent(message.id),{cache:"no-store"})
    .then(res=>{if(!res.ok)throw new Error();return res.json() as Promise<FileInfo[]>;})
    .then(info=>setAttachments(prev=>({...prev,[message.id]:info}))).catch(()=>{});
  }
 },[selected,conversations]);
 async function action(payload:Record<string,unknown>,onSuccess?:(result:any,data:{conversations:Conversation[]})=>void){
  setBusy(true);setError("");setNotice("");
  try{
   const result=await api(payload);
   const refreshed=await refresh();
   onSuccess?.(result,refreshed);
   setNotice(result.warning||(payload.action==="send"?"E-Mail versendet und unter Konversationen gespeichert.":payload.action==="sync"||payload.action==="resync"?`${result.processed} Nachrichten synchronisiert.`:"Änderung gespeichert."));
  }catch(e){setError(e instanceof Error?e.message:"Unbekannter Fehler");}
  finally{setBusy(false);}
 }
 function openConversation(c:Conversation){
  setSelected(c.id);setNewMail(false);setReplying(false);setFiles([]);setCc("");setBcc("");
  if(window.matchMedia("(max-width: 1023px)").matches)router.push("/dashboard/mails/"+encodeURIComponent(c.id));
  if(c.unread)void api({action:"read",id:c.id,unread:false}).then(()=>setConversations(prev=>prev.map(item=>item.id===c.id?{...item,unread:false}:item))).catch(()=>{});
 }
 async function move(target:Folder){
  if(!active||target==="ALL")return;
  await action({action:"folder",id:active.id,folder:target},()=>{setSelected("");setReplying(false);});
 }
 async function markUnread(){
  if(!active)return;
  await action({action:"read",id:active.id,unread:!active.unread},()=>{setSelected("");});
 }
 function recipientInput(field:"to"|"cc"|"bcc",value:string,setValue:(v:string)=>void,label:string){
  const token=value.split(",").at(-1)?.trim().toLowerCase()||"";
  const matches=focused===field&&token?contacts.filter(address=>address.includes(token)&&!value.split(",").slice(0,-1).map(v=>v.trim()).includes(address)).slice(0,8):[];
  return <div className="relative"><label className="mb-1 block text-xs font-semibold">{label}</label>
   <input type="text" autoComplete="off" value={value} onFocus={()=>setFocused(field)} onBlur={()=>setTimeout(()=>setFocused(null),180)} onChange={e=>setValue(e.target.value)} placeholder={label==="An"?"empfaenger@beispiel.ch":"Optional (mehrere mit Komma trennen)"} className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm"/>
   {matches.length>0?<div className="absolute z-30 mt-1 w-full rounded-lg border bg-card shadow-lg">{matches.map(address=><div key={address} className="flex items-center gap-1 border-b p-1"><button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>{setValue([...value.split(",").slice(0,-1).filter(Boolean),address].join(", "));setFocused(null);}} className="min-w-0 flex-1 truncate p-2 text-left text-xs hover:bg-muted">{address}</button><button type="button" title="Vorschlag entfernen" onMouseDown={e=>e.preventDefault()} onClick={()=>void action({action:"hide-contact",email:address})} className="rounded px-2 py-1 text-red-600">×</button></div>)}</div>:null}
  </div>;
 }
 async function addFiles(input:FileList|null){
  if(!input)return;
  try{
   const next=[...files];
   for(const file of Array.from(input)){
    if(file.size>5_000_000)throw new Error("Pro Anhang maximal 5 MB.");
    if(next.length>=5)throw new Error("Maximal fünf Anhänge.");
    const bytes=new Uint8Array(await file.arrayBuffer());
    let binary="";for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    next.push({name:file.name.slice(0,160),type:file.type||"application/octet-stream",data:btoa(binary)});
   }
   if(next.reduce((size,file)=>size+file.data.length,0)>13_500_000)throw new Error("Anhänge insgesamt zu gross.");
   setFiles(next);
  }catch(e){setError(e instanceof Error?e.message:"Datei konnte nicht gelesen werden.");}
 }
 async function submit(e:React.FormEvent){
  e.preventDefault();
  const recipient=newMail?to:lastIncoming?.sender||"";
  await action({action:"send",to:recipient,cc,bcc,subject:newMail?subject:active?.subject||"",text:body,attachments:files,...(!newMail&&lastIncoming?{replyToId:lastIncoming.providerId}:{})},(result,data)=>{
   setBody("");setCc("");setBcc("");setFiles([]);setNewMail(false);setReplying(false);
   const conv=data.conversations.find(c=>c.messages.some(m=>m.providerId==="local:"+result.messageId||m.providerId===result.messageId));
   if(conv){setFolder(conv.folder as Folder);setSelected(conv.id);}
  });
 }
 const button="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:bg-muted disabled:opacity-50";
 return <div className="space-y-4">
  {notice?<p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>:null}
  {error?<p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>:null}
  {syncWarning?<p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900" role="status">Automatische Synchronisierung: {syncWarning}</p>:null}
  <div className="flex flex-wrap items-center justify-between gap-3">
   <button type="button" onClick={()=>{setNewMail(true);setSelected("");setReplying(false);setBody("");setTo("");setSubject("");setCc("");setBcc("");setFiles([]);}} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm">+ Neue E-Mail</button>
   <button type="button" onClick={()=>{setNewAcquisition(true);setNewMail(false);setSelected("");}} className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted">+ Neue Akquise</button>
   <button type="button" onClick={()=>{setNewBoarding(true);setNewAcquisition(false);setNewMail(false);setSelected("");}} className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted">Boarding Mail</button>
   <Link href="/dashboard/e-mails" className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition hover:bg-muted">E-Mail Templates bearbeiten</Link>
  </div>
  {newAcquisition?<AcquisitionComposer onClose={()=>setNewAcquisition(false)} onSent={async()=>{await refresh();}}/>:null}
  {newBoarding?<BoardingManagement compact onClose={()=>setNewBoarding(false)} onSent={async()=>{await refresh();}}/>:null}
  <div className={newAcquisition||newBoarding?"hidden":""}>
  <div className="grid min-h-[600px] min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:grid-cols-[174px_minmax(220px,32%)_1fr]">
   <nav aria-label="E-Mail-Ordner" className={"flex flex-wrap content-start gap-1 border-b bg-muted/30 p-3 lg:flex-col lg:border-b-0 lg:border-r "+((selected||newMail)?"hidden lg:flex":"")}>
    {FOLDERS.map(item=>{const Icon=item.icon;const count=conversations.filter(c=>item.id==="ALL"?c.folder!=="TRASH":c.folder===item.id).length;const unread=conversations.filter(c=>c.unread&&(item.id==="ALL"?c.folder!=="TRASH":c.folder===item.id)).length;return <button type="button" key={item.id} onClick={()=>{setFolder(item.id);setSelected("");setNewMail(false);setReplying(false);}} className={"flex min-h-10 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition "+(folder===item.id?"bg-primary text-white":"hover:bg-muted")}><Icon className="h-4 w-4 shrink-0"/><span className="flex-1">{item.label}</span><span className="tabular-nums opacity-70">{unread?unread+" / ":""}{count}</span></button>})}
   </nav>
   <section aria-label="Konversationen" className={"min-w-0 border-b lg:border-b-0 lg:border-r "+((selected||newMail)?"hidden lg:block":"")}>
    <div className="border-b p-3"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Konversationen durchsuchen …" className="w-full rounded-lg border bg-background p-2.5 text-sm"/></div>
    <div className="max-h-[680px] overflow-y-auto">{shown.map(c=><button key={c.id} type="button" onClick={()=>openConversation(c)} className={"block w-full border-b p-3 text-left transition hover:bg-muted "+(selected===c.id?"bg-muted":"")}><div className="flex items-center justify-between gap-2"><strong className={"min-w-0 truncate text-sm "+(c.unread?"font-extrabold text-primary":"font-medium")}>{c.subject}</strong>{c.unread?<span aria-label="Ungelesen" className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600"/>:null}</div><p className={"mt-1 truncate text-xs "+(c.unread?"font-bold":"text-muted-foreground")}>{c.messages.at(-1)?.sender||"Unbekannter Absender"}</p><p className="mt-1 truncate text-xs text-muted-foreground">{c.messages.at(-1)?.textBody}</p><p className="mt-1 text-[10px] text-muted-foreground">{formatDate(c.lastMessageAt)}</p></button>)}{!shown.length?<p className="p-5 text-sm text-muted-foreground">Keine Nachrichten in diesem Ordner.</p>:null}</div>
   </section>
   <section aria-label="Nachrichten" className={"min-w-0 flex-col "+((selected||newMail)?"flex":"hidden lg:flex")}>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3 sm:p-4"><button type="button" onClick={()=>{setSelected("");setNewMail(false);setReplying(false);router.push("/dashboard/mails");}} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background lg:hidden" aria-label="Zurück zur Mailübersicht"><ArrowLeft className="h-5 w-5"/></button><h2 className="min-w-0 flex-1 truncate font-semibold">{newMail?"Neue E-Mail":active?.subject||"Konversation auswählen"}</h2>{active&&!newMail?<div className="flex flex-wrap gap-1">
     <button type="button" className={button} disabled={busy} onClick={()=>void markUnread()}>{active.unread?<MailOpen className="h-3.5 w-3.5"/>:<Mail className="h-3.5 w-3.5"/>}{active.unread?"Gelesen":"Ungelesen"}</button>
     <button type="button" className={button} disabled={busy} onClick={()=>void move("ARCHIVE")}><Archive className="h-3.5 w-3.5"/>Archivieren</button>
     {active.folder==="TRASH"?<button type="button" className={button} disabled={busy} onClick={()=>void move("INBOX")}>Wiederherstellen</button>:<button type="button" className={button} disabled={busy} onClick={()=>void move("TRASH")}><Trash2 className="h-3.5 w-3.5"/>Löschen</button>}
     <select value={active.folder} disabled={busy} onChange={e=>void move(e.target.value as Folder)} className="rounded-lg border bg-background px-2 py-2 text-xs" aria-label="Konversation in Ordner verschieben"><option value="INBOX">Posteingang</option><option value="SENT">Gesendet</option><option value="ARCHIVE">Archiv</option><option value="TRASH">Papierkorb</option></select>
    </div>:null}</div>
    {active&&!newMail?<div className="min-w-0 flex-1 space-y-4 overflow-visible p-3 sm:p-4 lg:max-h-[75vh] lg:overflow-y-auto">{active.messages.map(m=><article key={m.id} className={"overflow-hidden rounded-xl border "+(m.direction==="OUT"?"border-primary/30":"border-border")}>
     <header className="space-y-1 bg-muted/40 px-4 py-3"><div className="flex justify-between gap-2 text-xs"><strong>{m.direction==="OUT"?"Gesendet":"Empfangen"} · {m.sender}</strong><time className="shrink-0 text-muted-foreground">{formatDate(m.receivedAt)}</time></div><p className="break-all text-xs text-muted-foreground">An: {m.recipients?.to||"–"}{m.recipients?.cc?" · CC: "+m.recipients.cc:""}{m.recipients?.bcc?" · BCC: "+m.recipients.bcc:""}</p></header>
     {attachmentCount(m.attachmentInfo)>0?<div className="border-b px-4 py-3"><p className="mb-2 flex items-center gap-1 text-xs font-semibold"><Paperclip className="h-3.5 w-3.5"/>Anhänge ({attachmentCount(m.attachmentInfo)})</p><div className="flex flex-wrap gap-2">{attachments[m.id]?.map(file=><React.Fragment key={file.id}><a className="flex max-w-full items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs hover:bg-muted" href={"/api/mail-center/attachments/"+encodeURIComponent(m.id)+"?attachment="+encodeURIComponent(file.id)} download><FileText className="h-4 w-4 shrink-0"/><span className="truncate">{file.name}</span><span className="text-muted-foreground">{Math.ceil(file.size/1024)} KB</span></a>{file.type&&["application/pdf","image/jpeg","image/png","image/webp","image/gif","text/plain"].includes(file.type.toLowerCase())?<a href={"/api/mail-center/attachments/"+encodeURIComponent(m.id)+"?attachment="+encodeURIComponent(file.id)+"&preview=1"} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-primary/25 px-3 py-2 text-xs font-semibold text-primary hover:bg-muted">Vorschau öffnen</a>:null}</React.Fragment>)||<p className="text-xs text-muted-foreground">Anhänge werden geladen …</p>}</div></div>:null}
     <iframe title={"E-Mail-Inhalt: "+m.subject} sandbox="" loading="lazy" src={"/api/mail-center/attachments/"+encodeURIComponent(m.id)+"?format=html"} className="h-[400px] min-h-[250px] w-full rounded-b-xl bg-white sm:h-[460px]" referrerPolicy="no-referrer"/>
    </article>)}</div>:null}
    {active&&!newMail&&!replying&&active.folder!=="TRASH"?<div className="border-t p-3"><button type="button" className={button} onClick={()=>{setReplying(true);setBody("");setFiles([]);}}>Antworten</button></div>:null}
    {(newMail||replying&&active)?<form onSubmit={submit} className="mt-auto space-y-4 border-t bg-muted/20 p-3 sm:p-5">
     {newMail?<>{recipientInput("to",to,setTo,"An")}<label className="block text-xs font-semibold">Betreff<input required maxLength={250} value={subject} onChange={e=>setSubject(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm"/></label></>:<p className="text-xs text-muted-foreground">Antwort an {lastIncoming?.sender||"keine eingegangene Nachricht"}</p>}
     {recipientInput("cc",cc,setCc,"CC")}{recipientInput("bcc",bcc,setBcc,"BCC")}
     <label className="block text-xs font-semibold">Nachricht<textarea required rows={5} value={body} onChange={e=>setBody(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm" placeholder="Nachricht verfassen …"/></label>
     <label className="block text-xs font-semibold">Anhänge (bis 5 Dateien, je 5 MB)<input type="file" multiple disabled={busy} onChange={e=>{void addFiles(e.target.files);e.target.value="";}} className="mt-2 w-full text-xs"/></label>
     {files.length?<div className="flex flex-wrap gap-2">{files.map((file,index)=><button type="button" key={index} onClick={()=>setFiles(prev=>prev.filter((_,i)=>i!==index))} className="rounded-lg border px-3 py-2 text-xs"><Paperclip className="mr-1 inline h-3.5 w-3.5"/>{file.name} ×</button>)}</div>:null}
     <div className="flex justify-end gap-2"><button type="button" className={button} onClick={()=>{setNewMail(false);setReplying(false);}}>Abbrechen</button><button type="submit" disabled={busy||!body.trim()||(!newMail&&!lastIncoming)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?"Bitte warten …":"Senden"}</button></div>
    </form>:null}
   </section>
  </div>
  </div>
  <p className="text-xs text-muted-foreground">Die Ansicht aktualisiert sich bei geöffnetem Tab alle 3 Sekunden. Die Ordner und Gelesen-Markierungen werden im Fas-Nav Mail Center gespeichert; die IMAP-Ordner anderer Mailprogramme bleiben unverändert. Formatierte E-Mails werden isoliert angezeigt, damit fremde Mail-Inhalte keinen Dashboard-Code ausführen können.</p>
 </div>;
}
