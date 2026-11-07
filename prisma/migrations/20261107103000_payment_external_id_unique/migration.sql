DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "payments" WHERE "externalId" IS NOT NULL GROUP BY "externalId" HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate external payment IDs exist. Reconcile records before enabling unique Stripe invoice IDs.';
  END IF;
END $$;
CREATE UNIQUE INDEX "payments_externalId_key" ON "payments"("externalId");
