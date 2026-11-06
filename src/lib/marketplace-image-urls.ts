import { z } from "zod";

/** Uploaded images use local /uploads URLs, external media may use HTTPS. */
export const marketplaceImageUrlSchema=z.string().max(1000).refine(value=>{
 if(value.startsWith("/uploads/"))return /^\/uploads\/[A-Za-z0-9_./-]+$/.test(value)&&!value.split("/").includes("..");
 try{
  const parsed=new URL(value);
  return parsed.protocol==="https:"&&!parsed.username&&!parsed.password&&!!parsed.hostname;
 }catch{return false;}
},"Bitte eine sichere Bild-URL verwenden.");

export const marketplaceImageUrlsSchema=z.array(marketplaceImageUrlSchema).max(12).default([]);
