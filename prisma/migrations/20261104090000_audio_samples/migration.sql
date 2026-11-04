CREATE TABLE "audio_samples" (
 "id" TEXT NOT NULL,
 "organizationId" TEXT NOT NULL,
 "title" TEXT NOT NULL,
 "key" TEXT NOT NULL,
 "url" TEXT NOT NULL,
 "durationSeconds" DOUBLE PRECISION NOT NULL,
 "sortOrder" INTEGER NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "audio_samples_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audio_samples_organizationId_sortOrder_idx" ON "audio_samples"("organizationId","sortOrder");
ALTER TABLE "audio_samples" ADD CONSTRAINT "audio_samples_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
