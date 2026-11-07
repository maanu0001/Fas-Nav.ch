CREATE TABLE "stripe_checkout_attempts" ("organizationId" TEXT NOT NULL, "planId" TEXT NOT NULL, "sessionId" TEXT, "url" TEXT, "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "stripe_checkout_attempts_pkey" PRIMARY KEY ("organizationId"));
CREATE INDEX "stripe_checkout_attempts_expiresAt_idx" ON "stripe_checkout_attempts"("expiresAt");
