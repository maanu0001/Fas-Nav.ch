import { auth } from "@/lib/auth";
import { jsonError, jsonOk, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { roadmapDue, parseRoadmap, ROADMAP_GROUP, ROADMAP_PREFIX } from "@/lib/admin-roadmap";
import { reconcileRoadmapCases } from "@/lib/admin-roadmap-reconcile";
import { sendTemplate } from "@/lib/email-templates";
import { getAdminPreferences } from "@/lib/admin-preferences";

export const dynamic = "force-dynamic";

/** Dashboard-only reminders. Idempotent per organization, due date and staff member. */
export async function POST(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    const authorizedJob = Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
    if (!authorizedJob) {
      const session = await auth();
      if (!session?.user?.isActive) return jsonError("Nicht angemeldet.", 401);
      if (session.user.role !== "ADMIN") return jsonError("Keine Berechtigung.", 403);
    }
    const reconciliation = await reconcileRoadmapCases();
    // Transaction-scoped advisory lock serializes parallel runs across all app instances.
    // The same database transaction owns both the deduplication check and inserts.
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(814270031)::text AS lock_result`;
    const [settings, staff] = await Promise.all([
      tx.siteSetting.findMany({ where: { group: ROADMAP_GROUP, key: { startsWith: ROADMAP_PREFIX } }, select: { key: true, value: true } }),
      tx.user.findMany({ where: { role: { in: ["ADMIN","TEAM"] }, isActive: true }, select: { id: true } }),
    ]);
    let created = 0;
    let checked = 0;
    for (const setting of settings) {
      const state = parseRoadmap(setting.value);
      if (!roadmapDue(state)) continue;
      const orgId = setting.key.slice(ROADMAP_PREFIX.length);
      const org = await tx.organization.findUnique({ where: { id: orgId }, select: { id: true, name: true } });
      if (!org) continue;
      checked++;
      const link = `/dashboard/admin-roadmap/${encodeURIComponent(orgId)}`;
      const marker = `[Roadmap:${orgId}:${state.due}]`;
      for (const member of staff) {
        const exists = await tx.notification.findFirst({ where: { userId: member.id, type: "SYSTEM", body: { startsWith: marker } }, select: { id: true } });
        if (exists) continue;
        await tx.notification.create({ data: { userId: member.id, organizationId: org.id, type: "SYSTEM", title: "Roadmap-Wiedervorlage: " + org.name, body: marker + " Interne Aufgabe fällig seit " + state.due, link } });
        created++;
      }
    }
      return { checked, created };
    }, { timeout: 120000, maxWait: 120000 });
    const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Zurich",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
    const [cases,recipients]=await Promise.all([
      prisma.siteSetting.findMany({where:{group:ROADMAP_GROUP,key:{startsWith:ROADMAP_PREFIX}},select:{key:true,value:true}}),
      prisma.user.findMany({where:{role:{in:["ADMIN","TEAM"]},isActive:true},select:{id:true,name:true,email:true,role:true}})
    ]);
    let mailsSent=0;
    for(const entry of cases){
      const state=parseRoadmap(entry.value);
      if(state.due!==today||!roadmapDue(state))continue;
      const organizationId=entry.key.slice(ROADMAP_PREFIX.length);
      const org=await prisma.organization.findUnique({where:{id:organizationId},select:{name:true}});
      if(!org)continue;
      for(const recipient of recipients){
        if(!recipient.email)continue;
        const marker="crm.followup.email."+organizationId+"."+today+"."+recipient.id;
        if(await prisma.siteSetting.findUnique({where:{key:marker},select:{id:true}}))continue;
        let address=recipient.email;
        if(recipient.role==="ADMIN"){const preferences=await getAdminPreferences(recipient.id,recipient.email);address=preferences.notificationEmail||recipient.email;}
        const sent=await sendTemplate("crm_followup",address,{
          recipientName:recipient.name||"Fas-Nav.ch Team",organizationName:org.name,dueDate:today,
          crmUrl:(process.env.NEXT_PUBLIC_APP_URL||"https://fas-nav.ch")+"/dashboard/admin-roadmap/"+encodeURIComponent(organizationId)
        });
        if(sent.sent){await prisma.siteSetting.upsert({where:{key:marker},create:{key:marker,group:"crm_followup_delivery",value:{sentAt:new Date().toISOString()}},update:{}});mailsSent++;}
        else if(sent.reason!=="disabled")console.warn("[crm-followup] E-Mail nicht zugestellt",{organizationId,recipientId:recipient.id,reason:sent.reason,message:sent.message});
      }
    }
    return jsonOk({ ...result, reconciliation, mailsSent });
  } catch (error) { return handleApiError(error); }
}
