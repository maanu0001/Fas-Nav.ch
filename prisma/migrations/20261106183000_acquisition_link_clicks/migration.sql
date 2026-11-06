ALTER TABLE "acquisition_opens" ADD COLUMN "clickCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "acquisition_opens" ADD COLUMN "lastClickedAt" TIMESTAMP(3);
