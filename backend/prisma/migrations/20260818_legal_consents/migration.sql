-- Registro das bases e manifestações de vontade aplicáveis ao contato do CRM jurídico.

CREATE TYPE "ConsentPurpose" AS ENUM (
    'ATENDIMENTO',
    'CAMPANHA_WHATSAPP',
    'MARKETING',
    'ARMAZENAMENTO_DOCUMENTOS',
    'COMPARTILHAMENTO_PARCEIROS'
);

CREATE TYPE "ConsentStatus" AS ENUM ('CONCEDIDO', 'NEGADO', 'REVOGADO', 'EXPIRADO');

CREATE TYPE "ConsentBasis" AS ENUM (
    'CONSENTIMENTO',
    'EXECUCAO_CONTRATO',
    'OBRIGACAO_LEGAL',
    'EXERCICIO_DIREITOS',
    'LEGITIMO_INTERESSE'
);

CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "purpose" "ConsentPurpose" NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'CONCEDIDO',
    "basis" "ConsentBasis" NOT NULL DEFAULT 'CONSENTIMENTO',
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "evidence" TEXT,
    "documentId" TEXT,
    "recordedById" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ConsentRecord_tenantId_contactId_purpose_grantedAt_idx"
    ON "ConsentRecord"("tenantId", "contactId", "purpose", "grantedAt");
CREATE INDEX "ConsentRecord_tenantId_status_idx" ON "ConsentRecord"("tenantId", "status");
CREATE INDEX "ConsentRecord_tenantId_purpose_status_idx" ON "ConsentRecord"("tenantId", "purpose", "status");

ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_contactId_fkey"
    FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_recordedById_fkey"
    FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
