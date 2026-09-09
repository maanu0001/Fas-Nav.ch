-- Additive Migration: keine Spalte wird entfernt oder umbenannt.
--
-- ticketEmails steuert, ob ein Konto bei neuen Ticketantworten zusätzlich
-- eine E-Mail erhält. Der Standard ist true, damit bestehende Konten sich
-- genauso verhalten wie bisher: Die Antwort an eine Organisation wurde schon
-- vorher per E-Mail begleitet.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ticketEmails" BOOLEAN NOT NULL DEFAULT true;
