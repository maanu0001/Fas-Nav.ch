CREATE TABLE "parade_entries" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "groupName" TEXT NOT NULL,
  "startTime" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "parade_entries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "parade_entries_organizationId_number_key" ON "parade_entries"("organizationId", "number");
CREATE INDEX "parade_entries_organizationId_idx" ON "parade_entries"("organizationId");
ALTER TABLE "parade_entries" ADD CONSTRAINT "parade_entries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
