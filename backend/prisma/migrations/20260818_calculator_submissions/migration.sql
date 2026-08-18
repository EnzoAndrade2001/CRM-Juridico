-- Submissões públicas da calculadora revisional e status das notificações.

CREATE TABLE "CalculatorSubmission" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "financing" DOUBLE PRECISION,
    "installment" DOUBLE PRECISION NOT NULL,
    "totalInstallments" INTEGER NOT NULL,
    "paidInstallments" INTEGER NOT NULL DEFAULT 0,
    "bank" TEXT,
    "contractType" TEXT,
    "estimatedInstallment" DOUBLE PRECISION NOT NULL,
    "monthlySavings" DOUBLE PRECISION NOT NULL,
    "totalSavings" DOUBLE PRECISION NOT NULL,
    "remainingInstallments" INTEGER NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consentEvidence" TEXT,
    "status" TEXT NOT NULL DEFAULT 'received',
    "whatsappSentAt" TIMESTAMP(3),
    "emailSentAt" TIMESTAMP(3),
    "notificationError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalculatorSubmission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CalculatorSubmission_tenantId_createdAt_idx" ON "CalculatorSubmission"("tenantId", "createdAt");
CREATE INDEX "CalculatorSubmission_tenantId_email_idx" ON "CalculatorSubmission"("tenantId", "email");
CREATE INDEX "CalculatorSubmission_tenantId_phone_idx" ON "CalculatorSubmission"("tenantId", "phone");
CREATE INDEX "CalculatorSubmission_tenantId_status_idx" ON "CalculatorSubmission"("tenantId", "status");

ALTER TABLE "CalculatorSubmission" ADD CONSTRAINT "CalculatorSubmission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
