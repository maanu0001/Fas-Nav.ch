CREATE TABLE "acquisition_opens" ("id" TEXT NOT NULL,"token" TEXT NOT NULL,"messageId" TEXT NOT NULL,"openCount" INTEGER NOT NULL DEFAULT 0,"lastOpenedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "acquisition_opens_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "acquisition_opens_token_key" ON "acquisition_opens"("token");
CREATE UNIQUE INDEX "acquisition_opens_messageId_key" ON "acquisition_opens"("messageId");
CREATE TABLE "deleted_mail_threads" ("threadKey" TEXT NOT NULL,"deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "deleted_mail_threads_pkey" PRIMARY KEY ("threadKey"));
