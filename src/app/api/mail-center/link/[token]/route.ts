import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Individual links in outbound acquisition emails. Only same-site targets allowed. */
export async function GET(request:Request,{params}:{params:Promise<{token:string}>}){
  const {token}=await params;
  const destination=new URL(request.url).searchParams.get("to") || "https://fas-nav.ch/";
  let target:URL;
  try{
    target=new URL(destination);
    if(target.protocol!=="https:"||!["fas-nav.ch","www.fas-nav.ch"].includes(target.hostname)||target.username||target.password)
      return new Response("Ungültige Zieladresse.",{status:400});
  }catch{return new Response("Ungültige Zieladresse.",{status:400});}
  if(!/^[a-f0-9]{64}$/.test(token))return new Response("Link ungültig.",{status:404});
  try{
    await prisma.acquisitionOpen.update({where:{token},data:{clickCount:{increment:1},lastClickedAt:new Date()}});
  }catch{/* Even if a tracking row is missing, the customer-facing Fas-Nav link must remain usable. */}
  const response=NextResponse.redirect(target.toString(),{status:302});
  response.headers.set("Cache-Control","private, no-store, max-age=0");
  response.headers.set("Referrer-Policy","no-referrer");
  return response;
}
