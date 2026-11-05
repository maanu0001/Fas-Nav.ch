import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

type GraphAddress={emailAddress?:{address?:string;name?:string}};
type GraphMessage={id:string;conversationId?:string;internetMessageId?:string;subject?:string;from?:GraphAddress;toRecipients?:GraphAddress[];ccRecipients?:GraphAddress[];bccRecipients?:GraphAddress[];receivedDateTime?:string;sentDateTime?:string;isRead?:boolean;hasAttachments?:boolean;body?:{contentType?:string;content?:string};bodyPreview?:string;parentFolderId?:string};
const BASE="https://graph.microsoft.com/v1.0";
const setting="mailcenter.graph";
type GraphConfig={tenant:string;clientId:string;secret:string;mailbox:string};
export async function graphConfiguration():Promise<{configured:boolean;mailbox:string}>{
 const r=await prisma.siteSetting.findUnique({where:{key:setting}});
 const v=r?.value as Record<string,unknown>|undefined;
 return {configured:!!(v?.tenant&&v?.clientId&&v?.secret&&v?.mailbox),mailbox:typeof v?.mailbox==="string"?v.mailbox:""};
}
async function config():Promise<GraphConfig>{
 const r=await prisma.siteSetting.findUnique({where:{key:setting}});
 const v=r?.value as Record<string,unknown>|undefined;
 const secret=typeof v?.secret==="string"?decryptSecret(v.secret):null;
 if(!secret||typeof v?.tenant!=="string"||typeof v?.clientId!=="string"||typeof v?.mailbox!=="string")throw new Error("Microsoft Graph ist noch nicht verbunden.");
 return {tenant:v.tenant,clientId:v.clientId,secret,mailbox:v.mailbox};
}
export async function saveGraphConfiguration(input:{tenant:string;clientId:string;secret?:string;mailbox:string}){
 const old=await prisma.siteSetting.findUnique({where:{key:setting}});
 const previous=(old?.value??{}) as Record<string,unknown>;
 const secret=input.secret?encryptSecret(input.secret):previous.secret;
 if(!secret)throw new Error("Client Secret fehlt.");
 const value={tenant:input.tenant,clientId:input.clientId,mailbox:input.mailbox,secret};
 await prisma.siteSetting.upsert({where:{key:setting},create:{key:setting,group:"mail",value},update:{value}});
}
async function token(c:GraphConfig){
 const body=new URLSearchParams({client_id:c.clientId,client_secret:c.secret,scope:"https://graph.microsoft.com/.default",grant_type:"client_credentials"});
 const r=await fetch("https://login.microsoftonline.com/"+encodeURIComponent(c.tenant)+"/oauth2/v2.0/token",{method:"POST",body,cache:"no-store"});
 if(!r.ok)throw new Error("Microsoft-Authentifizierung fehlgeschlagen ("+r.status+").");
 const json=await r.json() as {access_token:string};return json.access_token;
}
export async function graphRequest(path:string,init:RequestInit={}):Promise<Response>{
 const c=await config();const access=await token(c);
 const prefix=BASE+"/users/"+encodeURIComponent(c.mailbox);
 if(!path.startsWith("/")||path.includes(".."))throw new Error("Ungültiger Graph-Pfad.");
 return fetch(prefix+path,{...init,cache:"no-store",headers:{Authorization:"Bearer "+access,...(init.body?{"Content-Type":"application/json"}:{}),...init.headers}});
}
export async function syncMailCenter(){
 const c=await config();const access=await token(c);const base=BASE+"/users/"+encodeURIComponent(c.mailbox);
 let saved=0;
 for(const folder of ["inbox","sentitems"]){
  const cursorKey="mailcenter.cursor."+folder;
  const cursor=await prisma.siteSetting.findUnique({where:{key:cursorKey}});
  let url=typeof cursor?.value==="string"&&cursor.value.startsWith(base+"/mailFolders/")?cursor.value:base+"/mailFolders/"+folder+"/messages/delta?$top=50&$select=id,conversationId,internetMessageId,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments,body,bodyPreview";
  for(let page=0;page<100;page++){
   const response=await fetch(url,{headers:{Authorization:"Bearer "+access,Prefer:'IdType="ImmutableId"'},cache:"no-store"});
   if(!response.ok)throw new Error("Synchronisierung fehlgeschlagen ("+response.status+").");
   const data=await response.json() as {value:(GraphMessage&{"@removed"?:unknown})[];"@odata.nextLink"?:string;"@odata.deltaLink"?:string};
   for(const delta of data.value){
    if(!delta.id||delta["@removed"])continue;
    const detailResponse=await fetch(base+"/messages/"+encodeURIComponent(delta.id)+"?$select=id,conversationId,internetMessageId,subject,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,sentDateTime,isRead,hasAttachments,body,bodyPreview",{headers:{Authorization:"Bearer "+access,Prefer:'IdType="ImmutableId"'},cache:"no-store"});
    if(!detailResponse.ok)throw new Error("Nachricht konnte nicht vollständig geladen werden ("+detailResponse.status+").");
    const m=await detailResponse.json() as GraphMessage;
    const thread=m.conversationId||m.id;
    const at=new Date(m.receivedDateTime||m.sentDateTime||Date.now());const date=Number.isNaN(at.getTime())?new Date():at;
    const direction=folder==="sentitems"?"OUT":"IN";
    const from=m.from?.emailAddress?.address||"";
    const recipient={to:m.toRecipients||[],cc:m.ccRecipients||[],bcc:m.bccRecipients||[]};
    const raw=m.body?.content||m.bodyPreview||"";
    const textBody=m.body?.contentType==="html"?raw.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi,"").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&"):raw;
    await prisma.$transaction(async tx=>{
     const conv=await tx.mailConversation.upsert({where:{providerThreadId:thread},create:{providerThreadId:thread,subject:m.subject||"(Ohne Betreff)",lastMessageAt:date,unread:direction==="IN"&&!m.isRead},update:{}});
     const existing=await tx.mailCenterMessage.findUnique({where:{providerId:m.id},select:{id:true}});
     await tx.mailCenterMessage.upsert({where:{providerId:m.id},create:{providerId:m.id,conversationId:conv.id,internetMessageId:m.internetMessageId,sender:from,recipients:recipient,subject:m.subject||"",textBody,htmlBody:m.body?.contentType==="html"?raw:null,attachmentInfo:m.hasAttachments?{hasAttachments:true}:undefined,direction,receivedAt:date},update:{textBody,htmlBody:m.body?.contentType==="html"?raw:null,attachmentInfo:m.hasAttachments?{hasAttachments:true}:undefined}});
     if(!existing){await tx.mailConversation.update({where:{id:conv.id},data:{lastMessageAt:date,subject:m.subject||conv.subject,...(direction==="IN"&&!m.isRead?{unread:true}:{})}});}
    });saved++;
   }
   const next=data["@odata.nextLink"];const delta=data["@odata.deltaLink"];
   if(delta){await prisma.siteSetting.upsert({where:{key:cursorKey},create:{key:cursorKey,group:"mail",value:delta},update:{value:delta}});break;}
   if(!next)break;
   if(!next.startsWith(base+"/mailFolders/"))throw new Error("Ungültiger Synchronisierungs-Cursor.");
   url=next;
   if(page===99)throw new Error("Synchronisierung erfordert weitere Seiten; Cursor wurde nicht vorgerückt.");
  }
 }
 return {processed:saved};
}
export async function sendGraphMail(input:{to:string;subject:string;text:string;replyToId?:string}){
 const body=input.replyToId?{comment:input.text}:{message:{subject:input.subject,body:{contentType:"Text",content:input.text},toRecipients:[{emailAddress:{address:input.to}}]},saveToSentItems:true};
 const path=input.replyToId?"/messages/"+encodeURIComponent(input.replyToId)+"/reply":"/sendMail";
 const response=await graphRequest(path,{method:"POST",body:JSON.stringify(body),headers:{Prefer:'IdType="ImmutableId"'}});
 if(!response.ok)throw new Error("E-Mail wurde nicht gesendet (Graph "+response.status+").");
}

export async function graphAttachments(messageId:string){
 const r=await graphRequest("/messages/"+encodeURIComponent(messageId)+"/attachments?$select=id,name,size,contentType,isInline");
 if(!r.ok)throw new Error("Anhänge konnten nicht geladen werden.");
 const data=await r.json() as {value:Array<{id:string;name:string;size:number;contentType?:string;isInline?:boolean}>};
 return data.value.filter(a=>!a.isInline).map(a=>({id:a.id,name:a.name,size:a.size,contentType:a.contentType||"application/octet-stream"}));
}
export async function graphAttachment(messageId:string,attachmentId:string){
 const r=await graphRequest("/messages/"+encodeURIComponent(messageId)+"/attachments/"+encodeURIComponent(attachmentId));
 if(!r.ok)throw new Error("Anhang nicht verfügbar.");
 const data=await r.json() as {name:string;size:number;contentBytes?:string;contentType?:string};
 if(!data.contentBytes||data.size>10*1024*1024)throw new Error("Anhang ist zu gross oder nicht herunterladbar.");
 return {name:data.name,content:Buffer.from(data.contentBytes,"base64"),type:data.contentType||"application/octet-stream"};
}
