import { prisma } from "@/lib/prisma";
export const dynamic="force-dynamic";
const pixel=Buffer.from("R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=","base64");
export async function GET(_request:Request,{params}:{params:Promise<{token:string}>}){
 const {token:raw}=await params;
 const token=raw.replace(/\.png$/,"");
 if(/^[a-f0-9]{64}$/.test(token)){
  try{await prisma.acquisitionOpen.update({where:{token},data:{openCount:{increment:1},lastOpenedAt:new Date()}});}
  catch{/* Tracking is best-effort; never reveal whether a token exists. */}
 }
 return new Response(new Uint8Array(pixel),{headers:{"Content-Type":"image/gif","Cache-Control":"no-store, private","X-Content-Type-Options":"nosniff","Cross-Origin-Resource-Policy":"cross-origin"}});
}
