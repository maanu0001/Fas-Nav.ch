import { auth } from "@/lib/auth";
import { jsonError,jsonOk,handleApiError } from "@/lib/api";
import { syncMailCenter } from "@/lib/mail-center-imap";
export const dynamic="force-dynamic";
export async function POST(request:Request){try{
 const secret=process.env.CRON_SECRET;
 const authorized=!!secret&&request.headers.get("authorization")==="Bearer "+secret;
 if(!authorized){const session=await auth();if(!session?.user?.isActive||session.user.role!=="ADMIN")return jsonError("Keine Berechtigung.",403);}
 return jsonOk(await syncMailCenter());
 }catch(e){return handleApiError(e);}}
