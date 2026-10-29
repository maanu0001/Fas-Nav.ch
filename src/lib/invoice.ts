import QRCode from "qrcode";
import sharp from "sharp";

import { prisma } from "@/lib/prisma";

const SETTING_KEYS=["billing.senderName","billing.senderStreet","billing.senderZip","billing.senderCity","billing.senderCountry","billing.senderEmail","billing.senderPhone","billing.uid","billing.vatNumber","billing.iban","billing.bankName","billing.accountHolder","billing.twintQrPayload"];

type InvoiceSettings={senderName:string;senderStreet:string;senderZip:string;senderCity:string;senderCountry:string;senderEmail:string;senderPhone:string;uid:string;vatNumber:string;iban:string;bankName:string;accountHolder:string;twintQrPayload:string};
export type InvoiceData={id:string;invoiceNumber:string;amountChf:number;issuedAt:Date;dueAt:Date|null;periodStart:Date|null;periodEnd:Date|null;reference:string|null;notes:string|null;organization:{name:string;street:string|null;zip:string|null;city:string;contactName:string|null;contactEmail:string|null}};

export async function loadInvoice(paymentId:string):Promise<{invoice:InvoiceData;settings:InvoiceSettings}|null>{
 const[invoice,settings]=await Promise.all([
  prisma.payment.findUnique({where:{id:paymentId},select:{id:true,invoiceNumber:true,amountChf:true,issuedAt:true,dueAt:true,periodStart:true,periodEnd:true,reference:true,notes:true,organization:{select:{name:true,street:true,zip:true,city:true,contactName:true,contactEmail:true}}}}),
  prisma.siteSetting.findMany({where:{key:{in:SETTING_KEYS}},select:{key:true,value:true}}),
 ]);
 if(!invoice)return null;const m=new Map(settings.map(s=>[s.key,s.value]));const v=(key:string)=>String(m.get(key)??"");
 return{invoice:{...invoice,amountChf:Number(invoice.amountChf)},settings:{senderName:v("billing.senderName")||"Fas-Nav.ch",senderStreet:v("billing.senderStreet"),senderZip:v("billing.senderZip"),senderCity:v("billing.senderCity"),senderCountry:v("billing.senderCountry")||"Schweiz",senderEmail:v("billing.senderEmail"),senderPhone:v("billing.senderPhone"),uid:v("billing.uid"),vatNumber:v("billing.vatNumber"),iban:v("billing.iban"),bankName:v("billing.bankName"),accountHolder:v("billing.accountHolder"),twintQrPayload:v("billing.twintQrPayload")}};
}

const latin=(value:string)=>value.replace(/[–—]/g,"-").replace(/[’‘]/g,"'").replace(/…/g,"...").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^\x20-\xFF]/g,"?");
const esc=(value:string)=>latin(value).replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");
const date=(d:Date|null)=>d?new Intl.DateTimeFormat("de-CH",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Europe/Zurich"}).format(d):"-";
const money=(n:number)=>`CHF ${n.toLocaleString("de-CH",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

function buildPdf(objects:Array<Buffer|string>):Buffer{
 const parts:Buffer[]=[Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n","binary")];const offsets=[0];let offset=parts[0].length;
 objects.forEach((obj,index)=>{offsets[index+1]=offset;const body=Buffer.isBuffer(obj)?obj:Buffer.from(obj,"binary");const header=Buffer.from(`${index+1} 0 obj\n`,`binary`);const footer=Buffer.from("\nendobj\n","binary");parts.push(header,body,footer);offset+=header.length+body.length+footer.length});
 const xref=offset;let table=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(let i=1;i<=objects.length;i++)table+=`${String(offsets[i]).padStart(10,"0")} 00000 n \n`;table+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
 parts.push(Buffer.from(table,"binary"));return Buffer.concat(parts);
}

export async function generateInvoicePdf(invoice:InvoiceData,settings:InvoiceSettings):Promise<Buffer>{
 const required=[settings.senderName,settings.senderStreet,settings.senderZip,settings.senderCity];if(required.some(v=>!v.trim()))throw new Error("Rechnungssteller unvollständig. Bitte Name, Strasse, PLZ und Ort in den Rechnungseinstellungen ergänzen.");
 let qrJpeg:Buffer|null=null;if(settings.twintQrPayload){const png=await QRCode.toBuffer(settings.twintQrPayload,{errorCorrectionLevel:"M",margin:2,width:360});qrJpeg=await sharp(png).jpeg({quality:90}).toBuffer()}
 const cmd:string[]=[];const text=(x:number,y:number,size:number,value:string,bold=false)=>cmd.push(`BT /F${bold?2:1} ${size} Tf ${x} ${y} Td (${esc(value)}) Tj ET`);const line=(x1:number,y1:number,x2:number,y2:number)=>cmd.push(`${x1} ${y1} m ${x2} ${y2} l S`);
 text(48,790,11,settings.senderName,true);text(48,774,9,settings.senderStreet);text(48,761,9,`${settings.senderZip} ${settings.senderCity}`);text(48,748,9,settings.senderCountry);if(settings.senderEmail)text(48,735,8,settings.senderEmail);if(settings.senderPhone)text(48,723,8,settings.senderPhone);
 text(390,790,24,"RECHNUNG",true);text(390,765,9,invoice.invoiceNumber,true);text(390,751,8,`Datum: ${date(invoice.issuedAt)}`);text(390,739,8,`Fällig: ${date(invoice.dueAt)}`);
 line(48,705,547,705);text(48,684,8,"Rechnung an",true);text(48,666,11,invoice.organization.name,true);let ry=650;if(invoice.organization.street){text(48,ry,9,invoice.organization.street);ry-=14}text(48,ry,9,[invoice.organization.zip,invoice.organization.city].filter(Boolean).join(" "));
 text(48,600,10,"Leistung",true);text(390,600,10,"Betrag",true);line(48,590,547,590);text(48,570,9,invoice.periodStart||invoice.periodEnd?`Fas-Nav.ch Abonnement ${date(invoice.periodStart)} - ${date(invoice.periodEnd)}`:"Fas-Nav.ch Leistung");text(390,570,10,money(invoice.amountChf),true);line(48,552,547,552);text(345,530,10,"Total",true);text(440,530,12,money(invoice.amountChf),true);
 let y=490;text(48,y,10,"Zahlungsinformationen",true);y-=20;if(settings.accountHolder){text(48,y,9,`Kontoinhaber: ${settings.accountHolder}`);y-=14}if(settings.iban){text(48,y,9,`IBAN: ${settings.iban}`,true);y-=14}if(settings.bankName){text(48,y,9,`Bank: ${settings.bankName}`);y-=14}if(invoice.reference){text(48,y,9,`Referenz: ${invoice.reference}`,true);y-=14}if(invoice.dueAt){text(48,y,9,`Zahlbar bis: ${date(invoice.dueAt)}`);y-=14}
 if(qrJpeg){text(410,490,8,"TWINT",true);cmd.push("q 105 0 0 105 410 365 cm /Im1 Do Q")}
 if(invoice.notes){y=Math.min(y-14,390);text(48,y,9,"Hinweis",true);y-=16;for(const row of invoice.notes.split(/\r?\n/).slice(0,6)){text(48,y,8,row.slice(0,95));y-=12}}
 line(48,105,547,105);const footer=[settings.uid?`UID: ${settings.uid}`:"",settings.vatNumber?`MWST-Nr.: ${settings.vatNumber}`:""].filter(Boolean).join(" · ");if(footer)text(48,88,8,footer);text(48,73,8,"Fas-Nav.ch · Schweizer Fasnachts-Navigator");
 const stream=Buffer.from(cmd.join("\n"),"binary");const objects:Array<Buffer|string>=["<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [3 0 R] /Count 1 >>",`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >>${qrJpeg?" /XObject << /Im1 7 0 R >>":""} >> /Contents 6 0 R >>`,`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`,`<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`,Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`),stream,Buffer.from("\nendstream")])];
 if(qrJpeg)objects.push(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width 360 /Height 360 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${qrJpeg.length} >>\nstream\n`),qrJpeg,Buffer.from("\nendstream")]));
 return buildPdf(objects);
}
