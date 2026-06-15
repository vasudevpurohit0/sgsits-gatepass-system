-- CreateTable
CREATE TABLE "email_delivery_logs" (
    "id" TEXT NOT NULL,
    "passId" TEXT NOT NULL,
    "passNumber" TEXT NOT NULL,
    "visitorName" TEXT NOT NULL,
    "visitorEmail" TEXT NOT NULL,
    "approvalTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "sentTimestamp" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_delivery_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_delivery_logs_passId_idx" ON "email_delivery_logs"("passId");

-- CreateIndex
CREATE INDEX "email_delivery_logs_status_idx" ON "email_delivery_logs"("status");

-- AddForeignKey
ALTER TABLE "email_delivery_logs" ADD CONSTRAINT "email_delivery_logs_passId_fkey" FOREIGN KEY ("passId") REFERENCES "passes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
