import { spawn } from "node:child_process";
import { revalidatePath } from "next/cache";
import { jsonError, jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { requireOrgAccess } from "@/lib/rbac";
import { getStorage, buildStorageKey } from "@/lib/storage";
import { audioLimits } from "@/lib/audio-limits";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Params = {params:Promise<{id:string}>};
function runFfmpeg(input:Buffer, start:number, seconds:number):Promise<Buffer> {
 return new Promise((resolve,reject)=>{
  const args=["-hide_banner","-loglevel","error","-i","pipe:0","-ss",String(start),"-t",String(seconds),"-vn","-map","0:a:0","-ac","2","-ar","44100","-b:a","128k","-f","mp3","pipe:1"];
  const proc=spawn("ffmpeg",args,{stdio:["pipe","pipe","pipe"]});
  const chunks:Buffer[]=[];let stderr="";let size=0;
  proc.stdout.on("data",(chunk:Buffer)=>{size+=chunk.length;if(size>5_000_000){proc.kill();return;}chunks.push(chunk);});
  proc.stderr.on("data",(chunk:Buffer)=>{stderr+=chunk.toString().slice(0,200);});
  proc.on("error",reject);
  proc.on("close",code=>code===0&&size>1000?resolve(Buffer.concat(chunks)):reject(new Error("MP3 konnte nicht verarbeitet werden. "+stderr.slice(0,120))));
  proc.stdin.on("error",()=>{});
  proc.stdin.end(input);
 });
}
export async function GET(_request:Request,{params}:Params) {
 try {const {id}=await params;await requireOrgAccess(id);const items=await prisma.audioSample.findMany({where:{organizationId:id},orderBy:[{sortOrder:"asc"},{createdAt:"asc"}]});return jsonOk({items,limits:await audioLimits(id)});}catch(e){return handleApiError(e);}
}
export async function POST(request:Request,{params}:Params) {
 try {
  const {id}=await params;const access=await requireOrgAccess(id,{write:true});
  const org=await prisma.organization.findUnique({where:{id},select:{type:true,slug:true}});
  if(!org||org.type!=="GUGGE")return jsonError("Nur für Guggen verfügbar.",403);
  if(!checkRateLimit("audio:"+access.user.id,10,600000).ok)return jsonError("Zu viele Uploads.",429);
  const limits=await audioLimits(id);
  const count=await prisma.audioSample.count({where:{organizationId:id}});
  if(count>=limits.count)return jsonError("Maximale Anzahl Hörproben erreicht.",403);
  const form=await request.formData();
  if(form.get("rights")!=="true")return jsonError("Bitte bestätige die Nutzungsrechte.",400);
  const file=form.get("file");
  if(!(file instanceof File)||file.size===0||file.size>25_000_000)return jsonError("MP3 fehlt oder ist grösser als 25 MB.",413);
  if(!file.name.toLowerCase().endsWith(".mp3")||!["audio/mpeg","audio/mp3","application/octet-stream"].includes(file.type))return jsonError("Nur MP3-Dateien erlaubt.",415);
  const title=String(form.get("title")??"").trim();
  const start=Number(form.get("start")??0),seconds=Number(form.get("seconds")??limits.seconds);
  if(!title||title.length>120||!Number.isFinite(start)||start<0||!Number.isFinite(seconds)||seconds<1||seconds>limits.seconds)return jsonError("Ungültiger Titel oder Ausschnitt.",400);
  const buffer=Buffer.from(await file.arrayBuffer());
  if(buffer.subarray(0,3).toString()!=="ID3" && buffer[0]!==0xff)return jsonError("Datei ist keine gültige MP3.",415);
  const encoded=await runFfmpeg(buffer,start,seconds);
  const key=buildStorageKey("sample.mp3","org/"+id+"/audio");
  const stored=await getStorage().save(key,encoded,"audio/mpeg");
  try {
   const sample=await prisma.audioSample.create({data:{organizationId:id,title,key,url:stored.url,durationSeconds:seconds,sortOrder:count}});
   revalidatePath("/gugge/"+org.slug);return jsonOk(sample,201);
  }catch(e){await getStorage().delete(key);throw e;}
 }catch(e){return handleApiError(e);}
}
