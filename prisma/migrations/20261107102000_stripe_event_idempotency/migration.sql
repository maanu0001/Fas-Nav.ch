CREATE TABLE "stripe_webhook_events" ("id" TEXT NOT NULL,"eventType" TEXT NOT NULL,"processedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id"));
CREATE INDEX "stripe_webhook_events_createdAt_idx" ON "stripe_webhook_events"("createdAt");
