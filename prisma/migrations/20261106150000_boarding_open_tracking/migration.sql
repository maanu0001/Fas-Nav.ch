ALTER TABLE "boarding_invitations" ADD COLUMN "openedAt" TIMESTAMP(3);
ALTER TABLE "boarding_invitations" ADD COLUMN "openCount" INTEGER NOT NULL DEFAULT 0;
