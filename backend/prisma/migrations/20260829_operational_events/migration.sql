CREATE TABLE "OperationalEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "source" TEXT NOT NULL,
    "channel" TEXT,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "severity" TEXT NOT NULL DEFAULT 'error',
    "summary" TEXT NOT NULL,
    "details" TEXT,
    "externalId" TEXT,
    "requestId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "lastAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OperationalEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OperationalEvent_tenantId_status_createdAt_idx" ON "OperationalEvent"("tenantId", "status", "createdAt");
CREATE INDEX "OperationalEvent_source_status_createdAt_idx" ON "OperationalEvent"("source", "status", "createdAt");
CREATE INDEX "OperationalEvent_status_createdAt_idx" ON "OperationalEvent"("status", "createdAt");
CREATE INDEX "OperationalEvent_tenantId_externalId_idx" ON "OperationalEvent"("tenantId", "externalId");

ALTER TABLE "OperationalEvent" ADD CONSTRAINT "OperationalEvent_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
