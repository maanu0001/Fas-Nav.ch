ALTER TABLE "mail_conversations" ADD COLUMN "folder" TEXT NOT NULL DEFAULT 'INBOX';
CREATE INDEX "mail_conversations_folder_lastMessageAt_idx" ON "mail_conversations"("folder", "lastMessageAt");
UPDATE "mail_conversations" c SET "folder" = 'SENT' WHERE NOT EXISTS (SELECT 1 FROM "mail_center_messages" m WHERE m."conversationId" = c."id" AND m."direction" = 'IN');
