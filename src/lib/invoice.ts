import { readFile } from "node:fs/promises";
import path from "node:path";

import QRCode from "qrcode";
import sharp from "sharp";

import { prisma } from "@/lib/prisma";

const SETTING_KEYS=["billing.senderName","billing.senderStreet","billing.senderZip","billing.senderCity","billing.senderCountry","billing.senderEmail","billing.senderPhone","billing.uid","billing.vatNumber","billing.vatRate","billing.iban","billing.bankName","billing.accountHolder","billing.twintQrPayload"];

type InvoiceSettings={senderName:string;senderStreet:string;senderZip:string;senderCity:string;senderCountry:string;senderEmail:string;senderPhone:string;uid:string;vatNumber:string;vatRate:number;iban:string;bankName:string;accountHolder:string;twintQrPayload:string};
export type InvoiceData={id:string;invoiceNumber:string;amountChf:number;issuedAt:Date;dueAt:Date|null;periodStart:Date|null;periodEnd:Date|null;reference:string|null;notes:string|null;organization:{name:string;street:string|null;zip:string|null;city:string;contactName:string|null;contactEmail:string|null}};

type PdfImage={data:Buffer;width:number;height:number};

export async function loadInvoice(paymentId:string):Promise<{invoice:InvoiceData;settings:InvoiceSettings}|null>{
 const[invoice,settings]=await Promise.all([
  prisma.payment.findUnique({where:{id:paymentId},select:{id:true,invoiceNumber:true,amountChf:true,issuedAt:true,dueAt:true,periodStart:true,periodEnd:true,reference:true,notes:true,organization:{select:{name:true,street:true,zip:true,city:true,contactName:true,contactEmail:true}}}}),
  prisma.siteSetting.findMany({where:{key:{in:SETTING_KEYS}},select:{key:true,value:true}}),
 ]);
 if(!invoice)return null;const m=new Map(settings.map(s=>[s.key,s.value]));const v=(key:string)=>String(m.get(key)??"");
 return{invoice:{...invoice,amountChf:Number(invoice.amountChf)},settings:{senderName:v("billing.senderName")||"Fas-Nav.ch",senderStreet:v("billing.senderStreet"),senderZip:v("billing.senderZip"),senderCity:v("billing.senderCity"),senderCountry:v("billing.senderCountry")||"Schweiz",senderEmail:v("billing.senderEmail"),senderPhone:v("billing.senderPhone"),uid:v("billing.uid"),vatNumber:v("billing.vatNumber"),vatRate:Number(m.get("billing.vatRate")??0),iban:v("billing.iban"),bankName:v("billing.bankName"),accountHolder:v("billing.accountHolder"),twintQrPayload:v("billing.twintQrPayload")}};
}

const latin=(value:string)=>value.replace(/[–—]/g,"-").replace(/[’‘]/g,"'").replace(/…/g,"...").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^\x20-\xFF]/g,"?");
const esc=(value:string)=>latin(value).replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");
const date=(d:Date|null)=>d?new Intl.DateTimeFormat("de-CH",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Europe/Zurich"}).format(d):"-";
const money=(n:number)=>`CHF ${n.toLocaleString("de-CH",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

async function toJpegImage(input:Buffer,width:number):Promise<PdfImage>{
 const converted=await sharp(input).flatten({background:"#ffffff"}).resize({width,withoutEnlargement:true}).jpeg({quality:92}).toBuffer({resolveWithObject:true});
 return{data:converted.data,width:converted.info.width,height:converted.info.height};
}

async function loadBrandLogo():Promise<PdfImage|null>{
 try{
  const source=await readFile(path.join(process.cwd(),"public","brand","fas-nav-logo-transparent.png"));
  return await toJpegImage(source,520);
 }catch{return null}
}

function imageObject(image:PdfImage):Buffer{
 return Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.data.length} >>\nstream\n`),image.data,Buffer.from("\nendstream")]);
}

function buildPdf(objects:Array<Buffer|string>):Buffer{
 const parts:Buffer[]=[Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n","binary")];const offsets=[0];let offset=parts[0].length;
 objects.forEach((obj,index)=>{offsets[index+1]=offset;const body=Buffer.isBuffer(obj)?obj:Buffer.from(obj,"binary");const header=Buffer.from(`${index+1} 0 obj\n`,`binary`);const footer=Buffer.from("\nendobj\n","binary");parts.push(header,body,footer);offset+=header.length+body.length+footer.length});
 const xref=offset;let table=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(let i=1;i<=objects.length;i++)table+=`${String(offsets[i]).padStart(10,"0")} 00000 n \n`;table+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
 parts.push(Buffer.from(table,"binary"));return Buffer.concat(parts);
}

export async function generateInvoicePdf(invoice:InvoiceData,settings:InvoiceSettings):Promise<Buffer>{
 const required=[settings.senderName,settings.senderStreet,settings.senderZip,settings.senderCity];if(required.some(v=>!v.trim()))throw new Error("Rechnungssteller unvollständig. Bitte Name, Strasse, PLZ und Ort in den Rechnungseinstellungen ergänzen.");
 if(settings.vatRate>0&&!settings.vatNumber.trim())throw new Error("Für einen MWST-Ausweis muss in den Rechnungseinstellungen eine MWST-Nummer hinterlegt sein.");
 const logo=await loadBrandLogo();
 let qr:PdfImage|null=null;if(settings.twintQrPayload){const png=await QRCode.toBuffer(settings.twintQrPayload,{errorCorrectionLevel:"M",margin:2,width:360});qr=await toJpegImage(png,360)}
 const logoObjectId=logo?7:null;const qrObjectId=qr?(logo?8:7):null;
 const xObjects=[logoObjectId?`/Logo ${logoObjectId} 0 R`:"",qrObjectId?`/Twint ${qrObjectId} 0 R`:""].filter(Boolean).join(" ");
 const cmd:string[]=[];const text=(x:number,y:number,size:number,value:string,bold=false)=>cmd.push(`BT /F${bold?2:1} ${size} Tf ${x} ${y} Td (${esc(value)}) Tj ET`);const line=(x1:number,y1:number,x2:number,y2:number)=>cmd.push(`${x1} ${y1} m ${x2} ${y2} l S`);
 if(logo){const displayWidth=155;const displayHeight=Math.min(58,displayWidth*(logo.height/logo.width));cmd.push(`q ${displayWidth} 0 0 ${displayHeight.toFixed(1)} 48 ${(804-displayHeight).toFixed(1)} cm /Logo Do Q`)}else{text(48,790,16,"Fas-Nav.ch",true)}
 text(48,742,10,settings.senderName,true);text(48,728,8,settings.senderStreet);text(48,716,8,`${settings.senderZip} ${settings.senderCity}`);text(48,704,8,settings.senderCountry);if(settings.senderEmail)text(48,692,8,settings.senderEmail);if(settings.senderPhone)text(48,680,8,settings.senderPhone);
 text(390,790,24,"RECHNUNG",true);text(390,765,9,invoice.invoiceNumber,true);text(390,751,8,`Datum: ${date(invoice.issuedAt)}`);text(390,739,8,`Fällig: ${date(invoice.dueAt)}`);
 line(48,655,547,655);text(48,634,8,"Rechnung an",true);text(48,616,11,invoice.organization.name,true);let ry=600;if(invoice.organization.street){text(48,ry,9,invoice.organization.street);ry-=14}text(48,ry,9,[invoice.organization.zip,invoice.organization.city].filter(Boolean).join(" "));
 text(48,540,10,"Leistung",true);text(390,540,10,"Betrag",true);line(48,530,547,530);text(48,510,9,invoice.periodStart||invoice.periodEnd?`Fas-Nav.ch Abonnement ${date(invoice.periodStart)} - ${date(invoice.periodEnd)}`:"Fas-Nav.ch Leistung");text(390,510,10,money(invoice.amountChf),true);line(48,492,547,492);
 const vatRate=Number.isFinite(settings.vatRate)?Math.max(0,settings.vatRate):0;const vatAmount=vatRate>0?invoice.amountChf*vatRate/(100+vatRate):0;
 if(vatRate>0){text(345,476,8,`inkl. ${vatRate.toLocaleString("de-CH",{maximumFractionDigits:2})}% MWST`);text(440,476,8,money(vatAmount))}
 text(345,458,10,"Total",true);text(440,458,12,money(invoice.amountChf),true);
 let y=418;text(48,y,10,"Zahlungsinformationen",true);y-=20;if(settings.accountHolder){text(48,y,9,`Kontoinhaber: ${settings.accountHolder}`);y-=14}if(settings.iban){text(48,y,9,`IBAN: ${settings.iban}`,true);y-=14}if(settings.bankName){text(48,y,9,`Bank: ${settings.bankName}`);y-=14}if(invoice.reference){text(48,y,9,`Referenz: ${invoice.reference}`,true);y-=14}if(invoice.dueAt){text(48,y,9,`Zahlbar bis: ${date(invoice.dueAt)}`);y-=14}
 if(qr){text(410,418,8,"TWINT",true);cmd.push("q 105 0 0 105 410 293 cm /Twint Do Q")}
 if(invoice.notes){y=Math.min(y-14,318);text(48,y,9,"Hinweis",true);y-=16;for(const row of invoice.notes.split(/\r?\n/).slice(0,6)){text(48,y,8,row.slice(0,95));y-=12}}
 line(48,105,547,105);const footer=[settings.uid?`UID: ${settings.uid}`:"",settings.vatNumber?`MWST-Nr.: ${settings.vatNumber}`:""].filter(Boolean).join(" · ");if(footer)text(48,88,8,footer);text(48,73,8,"Fas-Nav.ch · Schweizer Fasnachts-Navigator");
 const stream=Buffer.from(cmd.join("\n"),"binary");const resources=xObjects?` /XObject << ${xObjects} >>`:"";const objects:Array<Buffer|string>=["<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [3 0 R] /Count 1 >>",`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >>${resources} >> /Contents 6 0 R >>`,`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`,`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`,Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`),stream,Buffer.from("\nendstream")])];
 if(logo)objects.push(imageObject(logo));if(qr)objects.push(imageObject(qr));
 return buildPdf(objects);
}
