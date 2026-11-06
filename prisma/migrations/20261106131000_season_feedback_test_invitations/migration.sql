ALTER TABLE "survey_invitations" ALTER COLUMN "organizationId" DROP NOT NULL;
ALTER TABLE "survey_invitations" ADD COLUMN "isTest" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "survey_invitations_surveyId_isTest_idx" ON "survey_invitations"("surveyId","isTest");
