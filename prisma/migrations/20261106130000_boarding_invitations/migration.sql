CREATE TABLE "boarding_invitations" (
"id" TEXT NOT NULL,
"organizationId" TEXT NOT NULL,
"email" TEXT NOT NULL,
"contactName" TEXT,
"tokenHash" TEXT NOT NULL,
"status" TEXT NOT NULL DEFAULT 'SENT',
"userId" TEXT,
"expiresAt" TIMESTAMP(3) NOT NULL,
"sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"acceptedAt" TIMESTAMP(3),
"reviewedAt" TIMESTAMP(3),
"reviewedById" TEXT,
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "boarding_invitations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "boarding_invitations_tokenHash_key" ON "boarding_invitations"("tokenHash");
CREATE INDEX "boarding_invitations_organizationId_status_idx" ON "boarding_invitations"("organizationId","status");
CREATE INDEX "boarding_invitations_status_createdAt_idx" ON "boarding_invitations"("status","createdAt");
ALTER TABLE "boarding_invitations" ADD CONSTRAINT "boarding_invitations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "boarding_invitations" ADD CONSTRAINT "boarding_invitations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
