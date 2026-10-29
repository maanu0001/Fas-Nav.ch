import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { BillingSettingsForm } from "@/components/dashboard/billing-settings-form";
import { requirePermissionPage } from "@/lib/dashboard-context";
import { prisma } from "@/lib/prisma";

export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Rechnungseinstellungen"};

const KEYS=["billing.dueDays","billing.referencePrefix","billing.defaultNotes","billing.senderName","billing.senderStreet","billing.senderZip","billing.senderCity","billing.senderCountry","billing.senderEmail","billing.senderPhone","billing.uid","billing.vatNumber","billing.vatRate","billing.iban","billing.bankName","billing.accountHolder","billing.twintQrPayload"];

export default async function Page(){
 await requirePermissionPage("managePayments");
 const settings=await prisma.siteSetting.findMany({where:{key:{in:KEYS}},select:{key:true,value:true}});
 const m=new Map(settings.map(s=>[s.key,s.value]));const s=(key:string,fallback="")=>String(m.get(key)??fallback);
 return <><PageHeader title="Rechnungseinstellungen" description="Rechnungssteller, Zahlungsdaten und Standardwerte zentral verwalten." breadcrumbs={[{href:"/dashboard/zahlungen",label:"Zahlungen"},{label:"Einstellungen"}]}/><Card className="p-5 sm:p-6"><BillingSettingsForm initial={{dueDays:Number(m.get("billing.dueDays")??30),referencePrefix:s("billing.referencePrefix"),defaultNotes:s("billing.defaultNotes"),senderName:s("billing.senderName","Fas-Nav.ch"),senderStreet:s("billing.senderStreet"),senderZip:s("billing.senderZip"),senderCity:s("billing.senderCity"),senderCountry:s("billing.senderCountry","Schweiz"),senderEmail:s("billing.senderEmail"),senderPhone:s("billing.senderPhone"),uid:s("billing.uid"),vatNumber:s("billing.vatNumber"),vatRate:Number(m.get("billing.vatRate")??0),iban:s("billing.iban"),bankName:s("billing.bankName"),accountHolder:s("billing.accountHolder"),twintQrPayload:s("billing.twintQrPayload")}}/></Card></>;
}
