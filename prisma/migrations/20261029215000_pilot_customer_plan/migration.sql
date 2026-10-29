-- Pilot-Kunden erhalten denselben Funktionsumfang wie Premium, bleiben aber
-- als eigener interner Tarif klar erkennbar und erscheinen nicht öffentlich.
INSERT INTO "plans" ("id", "key", "tier", "name", "description", "priceChf", "currency", "billingInterval", "isActive", "isPublic", "isRecommended", "trialDays", "sortOrder", "createdAt", "updatedAt")
SELECT 'plan_pilot_customer', 'pilot', 'CUSTOM'::"PlanTier", 'Pilot-Kunde', 'Interner Pilotstatus mit vollständigem Premium-Funktionsumfang.', 0, "currency", "billingInterval", true, false, false, 0, 25, NOW(), NOW()
FROM "plans" WHERE "key" = 'premium'
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "plan_features" ("id", "planId", "featureId", "enabled", "limit", "note", "value")
SELECT 'pilot_' || pf."featureId", 'plan_pilot_customer', pf."featureId", pf."enabled", pf."limit", pf."note", pf."value"
FROM "plan_features" pf
JOIN "plans" p ON p."id" = pf."planId"
WHERE p."key" = 'premium'
ON CONFLICT ("planId", "featureId") DO UPDATE SET
  "enabled" = EXCLUDED."enabled",
  "limit" = EXCLUDED."limit",
  "note" = EXCLUDED."note",
  "value" = EXCLUDED."value";
