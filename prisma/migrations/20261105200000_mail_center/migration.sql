CREATE TABLE "mail_conversations" ("id" TEXT NOT NULL,"providerThreadId" TEXT NOT NULL,"subject" TEXT NOT NULL,"status" TEXT NOT NULL DEFAULT 'OPEN',"unread" BOOLEAN NOT NULL DEFAULT false,"lastMessageAt" TIMESTAMP(3) NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "mail_conversations_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "mail_conversations_providerThreadId_key" ON "mail_conversations"("providerThreadId");
CREATE INDEX "mail_conversations_unread_lastMessageAt_idx" ON "mail_conversations"("unread","lastMessageAt");
CREATE INDEX "mail_conversations_status_lastMessageAt_idx" ON "mail_conversations"("status","lastMessageAt");
CREATE TABLE "mail_center_messages" ("id" TEXT NOT NULL,"providerId" TEXT NOT NULL,"conversationId" TEXT NOT NULL,"internetMessageId" TEXT,"sender" TEXT NOT NULL,"recipients" JSONB NOT NULL,"subject" TEXT NOT NULL,"textBody" TEXT NOT NULL,"htmlBody" TEXT,"attachmentInfo" JSONB,"direction" TEXT NOT NULL,"receivedAt" TIMESTAMP(3) NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "mail_center_messages_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "mail_center_messages_providerId_key" ON "mail_center_messages"("providerId");
CREATE INDEX "mail_center_messages_conversationId_receivedAt_idx" ON "mail_center_messages"("conversationId","receivedAt");
ALTER TABLE "mail_center_messages" ADD CONSTRAINT "mail_center_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "mail_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
