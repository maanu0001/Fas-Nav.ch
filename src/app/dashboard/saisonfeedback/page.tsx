import { requireAdmin } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { SeasonFeedbackAdmin } from "@/components/dashboard/season-feedback-admin";
export const dynamic="force-dynamic";
export default async function Page(){await requireAdmin();const surveys=await prisma.seasonSurvey.findMany({orderBy:{createdAt:"desc"},include:{_count:{select:{invitations:true}}}});return <main className="space-y-6"><h1 className="text-2xl font-bold">Saisonfeedback</h1><p className="text-muted-foreground">Umfragen vorbereiten, versenden und auswerten.</p><SeasonFeedbackAdmin initial={surveys as never}/></main>;}
