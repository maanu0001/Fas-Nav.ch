import tls from "node:tls";
import { randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import { mailboxProviderId } from "@/lib/mail-center-identity";
import { brandedHtml } from "@/lib/mail";
import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

const KEY="mailcenter.imap";
const HOST="mail.fas-nav.ch";
const MAX_MESSAGE=20*1024*1024;
export type OutgoingAttachment = { name: string; type: string; data: string };
type Config={host:string;port:number;user:string;password:string;mailbox:string;smtpPort:number};
type Saved={host?:string;port?:number;user?:string;password?:string;mailbox?:string;smtpPort?:number};
export async function mailboxConfiguration(){
 const row=await prisma.siteSetting.findUnique({where:{key:KEY}});
 const v=(row?.value||{}) as Saved;
 return {configured:!!(v.user&&v.password),host:HOST,port:993,smtpPort:587,mailbox:v.mailbox||"info@fas-nav.ch",user:v.user||""};
}
async function config():Promise<Config>{
 const row=await prisma.siteSetting.findUnique({where:{key:KEY}});
 const v=(row?.value||{}) as Saved;
 const password=decryptSecret(v.password);
 if(!password||!v.user)throw new Error("Postfach noch nicht verbunden.");
 return {host:HOST,port:993,smtpPort:587,user:v.user,password,mailbox:v.mailbox||"info@fas-nav.ch"};
}
export async function saveMailboxConfiguration(input:{user:string;password?:string}){
 const previous=await prisma.siteSetting.findUnique({where:{key:KEY}});
 const old=(previous?.value||{}) as Saved;
 const password=input.password?encryptSecret(input.password):old.password;
 if(!password)throw new Error("Postfachpasswort fehlt.");
 if(/[\r\n]/.test(input.user)||/[\r\n]/.test(input.password||""))throw new Error("Ungültige Zugangsdaten.");
 if(old.user&&old.user!==input.user&&await prisma.mailCenterMessage.count()>0)throw new Error("Postfachwechsel nach Import erfordert eine gesonderte Migration.");
 const value={host:HOST,port:993,smtpPort:587,mailbox:"info@fas-nav.ch",user:input.user,password};
 await prisma.siteSetting.upsert({where:{key:KEY},create:{key:KEY,group:"mail",value},update:{value}});
}
const quote=(s:string)=>'"'+s.replace(/\\/g,"\\\\").replace(/"/g,'\\"')+'"';
type Reply={lines:string[];literals:Buffer[]};
class Imap {
 private socket!:tls.TLSSocket;
 private data=Buffer.alloc(0);
 private waiting:(()=>void)|null=null;
 private counter=0;
 private closed=false;
 async connect(c:Config){
  this.socket=tls.connect({host:c.host,port:c.port,servername:c.host,rejectUnauthorized:true});
  this.socket.on("data",(chunk:Buffer)=>{this.data=Buffer.concat([this.data,chunk]);this.waiting?.();});
  this.socket.on("close",()=>{this.closed=true;this.waiting?.();});
  this.socket.on("error",()=>{this.closed=true;this.waiting?.();});
  await new Promise<void>((resolve,reject)=>{this.socket.once("secureConnect",resolve);this.socket.once("error",reject);this.socket.setTimeout(20000,()=>{this.socket.destroy();reject(new Error("IMAP-Zeitüberschreitung."));});});
  const greeting=await this.line();if(!greeting.startsWith("* OK"))throw new Error("IMAP-Server hat die Verbindung abgelehnt.");
  await this.command("LOGIN "+quote(c.user)+" "+quote(c.password));
 }
 private async enough(n:number){while(this.data.length<n){if(this.closed)throw new Error("IMAP-Verbindung unterbrochen.");await new Promise<void>(resolve=>{this.waiting=resolve;});this.waiting=null;}}
 private async line(){let pos=this.data.indexOf("\r\n");while(pos<0){await this.enough(this.data.length+1);pos=this.data.indexOf("\r\n");}const line=this.data.subarray(0,pos).toString("utf8");this.data=this.data.subarray(pos+2);return line;}
 private async bytes(n:number){if(n>MAX_MESSAGE)throw new Error("E-Mail überschreitet die erlaubte Grösse.");await this.enough(n);const bytes=Buffer.from(this.data.subarray(0,n));this.data=this.data.subarray(n);return bytes;}
 async command(command:string):Promise<Reply>{
  const tag="A"+(++this.counter).toString().padStart(5,"0");
  this.socket.write(tag+" "+command+"\r\n");
  const lines:string[]=[],literals:Buffer[]=[];
  for(let i=0;i<20000;i++){
   const line=await this.line();
   if(line.startsWith(tag+" ")){if(!line.startsWith(tag+" OK"))throw new Error("IMAP-Befehl fehlgeschlagen: "+command.split(" ")[0]);return {lines,literals};}
   lines.push(line);
   const match=line.match(/\{(\d+)\}$/);
   if(match)literals.push(await this.bytes(Number(match[1])));
  }
  throw new Error("Zu viele IMAP-Antwortzeilen.");
 }
 async append(folder:string,raw:Buffer){
  if(raw.length>MAX_MESSAGE)throw new Error("E-Mail zu gross.");
  const tag="A"+(++this.counter).toString().padStart(5,"0");
  this.socket.write(tag+" APPEND "+quote(folder)+" {"+raw.length+"}\r\n");
  const response=await this.line();
  if(!response.startsWith("+"))throw new Error("IMAP APPEND wurde abgelehnt.");
  this.socket.write(raw);this.socket.write("\r\n");
  for(let i=0;i<100;i++){const line=await this.line();if(line.startsWith(tag+" ")){if(!line.startsWith(tag+" OK"))throw new Error("Gesendet-Kopie konnte nicht gespeichert werden.");return;}}
  throw new Error("IMAP APPEND unvollständig.");
 }
 async close(){try{await this.command("LOGOUT");}catch{}this.socket.destroy();}
}
async function withImap<T>(fn:(client:Imap)=>Promise<T>){const c=await config(),client=new Imap();await client.connect(c);try{return await fn(client);}finally{await client.close();}}
function decodeWord(s:string){return s.replace(/=\?([^?]+)\?([bqBQ])\?([^?]+)\?=/g,(_,charset,enc,value)=>{try{const b=enc.toLowerCase()==="b"?Buffer.from(value,"base64"):Buffer.from(value.replace(/_/g," ").replace(/=([0-9A-F]{2})/gi,(_m:string,h:string)=>String.fromCharCode(parseInt(h,16))),"binary");return new TextDecoder(charset).decode(b);}catch{return value;}});}
function headers(raw:string){const result:Record<string,string>={};let current="";for(const line of raw.split(/\r?\n/)){if(/^[ \t]/.test(line)&&current){result[current]+=" "+line.trim();continue;}const m=line.match(/^([^:]+):\s*(.*)$/);if(m){current=m[1].toLowerCase();result[current]=m[2];}}return result;}
function headerBody(raw:Buffer){const pos=raw.indexOf("\r\n\r\n");const alt=pos<0?raw.indexOf("\n\n"):-1;const cut=pos>=0?pos:alt;return cut<0?{header:headers(raw.toString("latin1")),body:Buffer.alloc(0)}:{header:headers(raw.subarray(0,cut).toString("latin1")),body:raw.subarray(cut+(pos>=0?4:2))};}
function decodePart(body:Buffer,h:Record<string,string>){const encoding=(h["content-transfer-encoding"]||"").toLowerCase();let data=body;if(encoding==="base64")data=Buffer.from(body.toString("ascii").replace(/\s/g,""),"base64");else if(encoding==="quoted-printable")data=Buffer.from(body.toString("latin1").replace(/=\r?\n/g,"").replace(/=([0-9A-F]{2})/gi,(_m,hx)=>String.fromCharCode(parseInt(hx,16))),"latin1");const charset=h["content-type"]?.match(/charset="?([^";\s]+)/i)?.[1]||"utf-8";try{return new TextDecoder(charset).decode(data);}catch{return data.toString("utf8");}}
type Part={name:string;content:Buffer;type:string};
function parseMime(raw:Buffer){
 const attachments:Part[]=[];let plain="",html="";
 function visit(buffer:Buffer,depth:number){if(depth>12)return;const {header,body}=headerBody(buffer);const type=header["content-type"]||"text/plain";const boundary=type.match(/boundary="?([^";\r\n]+)/i)?.[1];if(/^multipart\//i.test(type)&&boundary){const source=body.toString("latin1");const segments=source.split("--"+boundary);for(const section of segments.slice(1)){if(section.startsWith("--"))break;const trimmed=section.replace(/^\r?\n/,"").replace(/\r?\n$/,"");visit(Buffer.from(trimmed,"latin1"),depth+1);}return;}
 const disp=header["content-disposition"]||"";const filename=disp.match(/filename="?([^";\r\n]+)/i)?.[1]||type.match(/name="?([^";\r\n]+)/i)?.[1];const transfer=(header["content-transfer-encoding"]||"").toLowerCase();let content=body;if(transfer==="base64")content=Buffer.from(body.toString("ascii").replace(/\s/g,""),"base64");else if(transfer==="quoted-printable")content=Buffer.from(body.toString("latin1").replace(/=\r?\n/g,"").replace(/=([0-9A-F]{2})/gi,(_m,hx)=>String.fromCharCode(parseInt(hx,16))),"latin1");
 if(filename||/^attachment/i.test(disp)){attachments.push({name:decodeWord(filename||"Anhang"),content,type:type.split(";")[0]});return;}
 if(/^text\/plain/i.test(type))plain+=decodePart(body,header)+"\n";else if(/^text\/html/i.test(type))html+=decodePart(body,header)+"\n";
 }
 visit(raw,0);
 const clean=html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi,"").replace(/<[^>]*>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
 return {plain:plain.trim()||clean,html:html||null,attachments};
}
function address(value:string){return decodeWord(value.match(/<([^>]+)>/)?.[1]||value).trim();}
function threadKey(h:Record<string,string>){const refs=(h.references||"").match(/<[^>]+>/g);return refs?.[0]||h["in-reply-to"]?.match(/<[^>]+>/)?.[0]||h["message-id"]?.match(/<[^>]+>/)?.[0]||"subject:"+((h.subject||"").replace(/^(re|fw|fwd):\s*/gi,"").toLowerCase());}
async function folders(client:Imap){const result=await client.command('LIST "" "*"');const names=result.lines.filter(l=>l.startsWith("* LIST")).map(l=>l.match(/"([^"]+)"$/)?.[1]||l.split(" ").at(-1)?.replace(/^"|"$/g,"")||"");const sent=names.find(n=>/^(sent|sent items|gesendet|sent messages)$/i.test(n))||"Sent";return ["INBOX",sent];}
export async function testMailboxConnection(){return withImap(async client=>{await client.command('SELECT "INBOX"');return {ok:true};});}
async function performMailCenterSync(options:{full?:boolean}={}){
 return withImap(async client=>{
  let processed=0;for(const folder of await folders(client)){
   const selection=await client.command("EXAMINE "+quote(folder));
   const uidvalidity=selection.lines.find(l=>/UIDVALIDITY/i.test(l))?.match(/UIDVALIDITY\s+(\d+)/i)?.[1]||"0";
   const cursorKey="mailcenter.imap.cursor."+folder;
   const old=await prisma.siteSetting.findUnique({where:{key:cursorKey}});
   const oldCursor=(old?.value||{}) as {uidvalidity?:string;uid?:number};
   const start=options.full?1:oldCursor.uidvalidity===uidvalidity?Math.max(1,(oldCursor.uid||0)+1):1;
   const search=await client.command("UID SEARCH UID "+start+":*");
   const uids=search.lines.filter(l=>l.startsWith("* SEARCH")).flatMap(l=>l.slice(8).trim().split(/\s+/).map(Number).filter(n=>n>=start));
   for(const uid of uids){
    const result=await client.command("UID FETCH "+uid+" (UID FLAGS BODY.PEEK[])");
    const raw=result.literals[0];if(!raw)throw new Error("Nachricht konnte nicht vollständig geladen werden.");
    const {header}=headerBody(raw);const parsed=parseMime(raw);
    const existingByMessageId=folder.toUpperCase()!=="INBOX"&&header["message-id"]?await prisma.mailCenterMessage.findFirst({where:{internetMessageId:header["message-id"],direction:"OUT"},select:{providerId:true}}):null;const providerId=mailboxProviderId(folder,uidvalidity,uid,existingByMessageId?.providerId);
    const date=new Date(header.date||Date.now());const receivedAt=Number.isNaN(date.getTime())?new Date():date;
    const direction=folder==="INBOX"?"IN":"OUT";
    const unread=direction==="IN"&&!result.lines.some(l=>/\\Seen/i.test(l));
    const thread=threadKey(header);
    const recipient={to:header.to||"",cc:header.cc||"",bcc:header.bcc||""};
    await prisma.$transaction(async tx=>{
     const conversation=await tx.mailConversation.upsert({where:{providerThreadId:thread},create:{providerThreadId:thread,subject:decodeWord(header.subject||"(Ohne Betreff)"),lastMessageAt:receivedAt,unread,folder:direction==="IN"?"INBOX":"SENT"},update:{}});
     const exists=await tx.mailCenterMessage.findUnique({where:{providerId},select:{id:true}});
     await tx.mailCenterMessage.upsert({where:{providerId},create:{providerId,conversationId:conversation.id,internetMessageId:header["message-id"],sender:address(header.from||""),recipients:recipient,subject:decodeWord(header.subject||""),textBody:parsed.plain,htmlBody:raw.toString("base64"),attachmentInfo:parsed.attachments.length?{count:parsed.attachments.length}:undefined,direction,receivedAt},update:{}});
     if(!exists){await tx.mailConversation.update({where:{id:conversation.id},data:{...(receivedAt>conversation.lastMessageAt?{lastMessageAt:receivedAt,subject:decodeWord(header.subject||conversation.subject)}:{}),...(unread?{unread:true}:{}),...(direction==="IN"&&conversation.folder==="SENT"?{folder:"INBOX"}:{})}});}
    });
    await prisma.siteSetting.upsert({where:{key:cursorKey},create:{key:cursorKey,group:"mail",value:{uidvalidity,uid}},update:{value:{uidvalidity,uid}}});
    processed++;
   }
  }
  return {processed};
 });
}
/** Display the MIME HTML in a separately sandboxed iframe; never inject into dashboard DOM. */
// Coalesce simultaneous browser polling and scheduled cron requests in one server process.
// A minimum interval prevents repeated full IMAP roundtrips from several open tabs.
let activeSync:Promise<{processed:number}>|null=null;
let lastSyncStartedAt=0;
export async function syncMailCenter(options:{full?:boolean}={}):Promise<{processed:number}>{
 if(activeSync)return activeSync;
 if(!options.full&&Date.now()-lastSyncStartedAt<2500)return {processed:0};
 lastSyncStartedAt=Date.now();
 const work=performMailCenterSync(options);
 activeSync=work;
 try{return await work;}finally{if(activeSync===work)activeSync=null;}
}
export async function mailboxMessageHtml(providerId:string){
 const message=await prisma.mailCenterMessage.findUnique({where:{providerId},select:{htmlBody:true,textBody:true}});
 if(!message)throw new Error("Nachricht nicht gefunden.");
 if(message.htmlBody){
  const parsed=parseMime(Buffer.from(message.htmlBody,"base64"));
  if(parsed.html){const fontStyle="<style>body,body p,body div,body td,body span,body li,body a{font-family:Arial,Helvetica,sans-serif !important}</style>";return /<head[^>]*>/i.test(parsed.html)?parsed.html.replace(/<head[^>]*>/i,match=>match+fontStyle):fontStyle+parsed.html;}
 }
 const text=message.textBody.replace(/[&<>"]/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[character]||character));
 return '<!doctype html><html><body style="font:15px/1.65 Arial,sans-serif;white-space:pre-wrap;overflow-wrap:anywhere;">'+text+'</body></html>';
}
export async function mailboxAttachments(providerId:string){
 const m=await prisma.mailCenterMessage.findUnique({where:{providerId},select:{htmlBody:true}});
 if(!m?.htmlBody)throw new Error("Nachricht nicht gefunden.");
 return parseMime(Buffer.from(m.htmlBody,"base64")).attachments;
}
export async function sendMailboxMail(input:{to:string;cc?:string;bcc?:string;subject:string;text:string;html?:string;replyToId?:string;attachments?:OutgoingAttachment[]}){
  const c=await config();let replyHeaders:Record<string,string>={};
  let replyConversationId:string|undefined;
  if(input.replyToId){
    const source=await prisma.mailCenterMessage.findUnique({where:{providerId:input.replyToId}});
    if(!source?.htmlBody||source.direction!=="IN")throw new Error("Antwortnachricht nicht gefunden.");
    replyHeaders=headerBody(Buffer.from(source.htmlBody,"base64")).header;
    replyConversationId=source.conversationId;
  }
  const files=(input.attachments||[]).map(a=>({filename:a.name,content:Buffer.from(a.data,"base64"),contentType:a.type||"application/octet-stream"}));
  if(files.some(f=>f.content.length>5_000_000)||files.reduce((sum,f)=>sum+f.content.length,0)>10_000_000)throw new Error("Anhänge sind zu gross.");
  const messageId="<"+randomBytes(16).toString("hex")+"@fas-nav.ch>";
  const options={from:c.mailbox,to:input.to,cc:input.cc||undefined,bcc:input.bcc||undefined,subject:input.subject,text:input.text,html:input.html||brandedHtml(input.subject,input.text),attachments:files,messageId,...(replyHeaders["message-id"]?{inReplyTo:replyHeaders["message-id"],references:[replyHeaders.references,replyHeaders["message-id"]].filter(Boolean).join(" ")}:{})};
  const generator=nodemailer.createTransport({streamTransport:true,buffer:true});
  const composed=await generator.sendMail(options);
  const raw=Buffer.from(composed.message as Buffer);
  if(raw.length>MAX_MESSAGE)throw new Error("Nachricht überschreitet die zulässige Grösse.");
  const transport=nodemailer.createTransport({host:c.host,port:c.smtpPort,secure:false,requireTLS:true,auth:{user:c.user,pass:c.password},tls:{servername:c.host,rejectUnauthorized:true},connectionTimeout:20000,greetingTimeout:20000,socketTimeout:30000});
  await transport.sendMail({envelope:{from:c.mailbox,to:[...input.to.split(","),...(input.cc?input.cc.split(","):[]),...(input.bcc?input.bcc.split(","):[])].map(a=>a.trim())},raw});
  // SMTP success is definitive; database/IMAP failures must never trigger blind re-sends.
  let warning="";
  try{
    const now=new Date();
    const conversationKey=replyConversationId?null:messageId;
    await prisma.$transaction(async tx=>{
      const conversation=replyConversationId?await tx.mailConversation.findUniqueOrThrow({where:{id:replyConversationId}}):await tx.mailConversation.upsert({where:{providerThreadId:conversationKey!},create:{providerThreadId:conversationKey!,subject:input.subject,lastMessageAt:now,folder:"SENT"},update:{lastMessageAt:now}});
      await tx.mailCenterMessage.create({data:{providerId:"local:"+messageId,conversationId:conversation.id,internetMessageId:messageId,sender:c.mailbox,recipients:{to:input.to,cc:input.cc||"",bcc:input.bcc||""},subject:input.subject,textBody:input.text,htmlBody:raw.toString("base64"),attachmentInfo:files.length?{count:files.length}:undefined,direction:"OUT",receivedAt:now}});
      await tx.mailConversation.update({where:{id:conversation.id},data:{lastMessageAt:now}});
    });
  }catch{warning="SMTP hat die Nachricht angenommen, aber das Speichern in der Konversationsliste ist fehlgeschlagen. Bitte nicht erneut senden.";}
  try{await withImap(async client=>{const available=await folders(client);await client.append(available[1],raw);});}
  catch{warning+=(warning?" ":"")+"Die Kopie in «Gesendet» konnte nicht gespeichert werden. Bitte nicht erneut senden.";}
  return {sent:true,warning:warning||undefined,messageId};
}
