import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { mailboxAttachments } from "@/lib/mail-center-imap";
import { handleApiError,jsonError,jsonOk } from "@/lib/api";
type Params={params:Promise<{id:string}>};
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:Params){try{await requireAdmin();const {id}=await params;const m=await prisma.mailCenterMessage.findUnique({where:{id}});if(!m)return jsonError("Nachricht nicht gefunden.",404);
 const attachmentId=new URL(request.url).searchParams.get("attachment");
 const files=await mailboxAttachments(m.providerId);
 if(!attachmentId)return jsonOk(files.map((a,i)=>({id:String(i),name:a.name,size:a.content.length})));
 const index=Number(attachmentId);if(!Number.isSafeInteger(index)||index<0||index>=files.length)return jsonError("Anhang nicht gefunden.",404);
 const a=files[index];
 const filename=a.name.replace(/[\r\n"\\]/g,"_").slice(0,160)||"anhang";
 return new Response(new Uint8Array(a.content),{headers:{"Content-Type":"application/octet-stream","Content-Disposition":'attachment; filename="'+filename+'"',"X-Content-Type-Options":"nosniff","Cache-Control":"private, no-store"}});
 }catch(e){return handleApiError(e);}}
