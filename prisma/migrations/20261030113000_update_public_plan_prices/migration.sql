-- Verbindliche Fas-Nav Jahrespreise für die öffentlichen Tarife.
UPDATE "plans" SET "priceChf" = 49.00, "billingInterval" = 'YEARLY' WHERE "key" = 'basic';
UPDATE "plans" SET "priceChf" = 99.00, "billingInterval" = 'YEARLY' WHERE "key" = 'premium';
