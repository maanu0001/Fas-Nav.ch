import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { graphAttachments,graphAttachment } from "@/lib/mail-center-graph";
import { handleApiError,jsonError,jsonOk } from "@/lib/api";
type Params={params:Promise<{id:string}>};
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:Params){try{await requireAdmin();const {id}=await params;const m=await prisma.mailCenterMessage.findUnique({where:{id}});if(!m)return jsonError("Nachricht nicht gefunden.",404);
 const attachmentId=new URL(request.url).searchParams.get("attachment");
 if(!attachmentId)return jsonOk(await graphAttachments(m.providerId));
 const a=await graphAttachment(m.providerId,attachmentId);
 const filename=a.name.replace(/[\r\n"\\]/g,"_").slice(0,160)||"anhang";
 return new Response(new Uint8Array(a.content),{headers:{"Content-Type":"application/octet-stream","Content-Disposition":'attachment; filename="'+filename+'"',"X-Content-Type-Options":"nosniff","Cache-Control":"private, no-store"}});
 }catch(e){return handleApiError(e);}}
