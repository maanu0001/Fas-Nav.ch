import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendMailboxMail, syncMailCenter } from "@/lib/mail-center-imap";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Geschützter End-to-End-Test: SMTP -> reales Postfach -> IMAP -> Datenbank. */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const expected = Buffer.from(secret || "");
  const provided = Buffer.from(supplied);
  if (!secret || expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return NextResponse.json({error:"Nicht autorisiert."},{status:403});
  }
  if (!checkRateLimit("mail-center:self-test",1,5*60*1000).ok) {
    return NextResponse.json({error:"Test wurde kürzlich bereits durchgeführt."},{status:429});
  }
  try {
    const result = await sendMailboxMail({
      to:"info@fas-nav.ch",
      subject:"[Fas-Nav] Posteingang-Systemtest",
      text:"Dies ist ein automatisch ausgelöster Funktionstest für die Verbindung SMTP → IMAP → Fas-Nav-Mail-Center.",
    });
    if (!result.sent) return NextResponse.json({sent:false,received:false},{status:502});
    let received = false;
    for (let attempt=0;attempt<10;attempt++) {
      await new Promise(resolve=>setTimeout(resolve,3000));
      await syncMailCenter();
      const match=await prisma.mailCenterMessage.findFirst({where:{internetMessageId:result.messageId,direction:"IN"},select:{id:true}});
      if (match) { received=true;break; }
    }
    return NextResponse.json({sent:true,received,stored:received},{status:received?200:502});
  } catch {
    return NextResponse.json({sent:false,received:false,error:"SMTP/IMAP-Test fehlgeschlagen."},{status:502});
  }
}
