-- Documentos jurídicos: solicitação, recebimento e análise dos arquivos do cliente.
-- O binário nunca fica sob o diretório público de uploads; apenas a chave de armazenamento é persistida.

CREATE TYPE "LegalDocumentKind" AS ENUM (
    'IDENTIDADE',
    'COMPROVANTE_RESIDENCIA',
    'COMPROVANTE_RENDA',
    'CONTRATO',
    'PROCURACAO',
    'RESCISAO',
    'DECISAO_JUDICIAL',
    'LAUDO',
    'COMPROVANTE_PAGAMENTO',
    'OUTRO'
);

CREATE TYPE "LegalDocumentStatus" AS ENUM (
    'SOLICITADO',
    'RECEBIDO',
    'EM_ANALISE',
    'APROVADO',
    'RECUSADO',
    'ARQUIVADO'
);

CREATE TABLE "LegalDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "leadId" TEXT,
    "matterId" TEXT,
    "requestedById" TEXT,
    "reviewedById" TEXT,
    "title" TEXT NOT NULL,
    "kind" "LegalDocumentKind" NOT NULL DEFAULT 'OUTRO',
    "status" "LegalDocumentStatus" NOT NULL DEFAULT 'SOLICITADO',
    "description" TEXT,
    "source" TEXT NOT NULL DEFAULT 'upload',
    "storageKey" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "checksum" TEXT,
    "dueAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LegalDocument_storageKey_key" ON "LegalDocument"("storageKey");
CREATE INDEX "LegalDocument_tenantId_status_createdAt_idx" ON "LegalDocument"("tenantId", "status", "createdAt");
CREATE INDEX "LegalDocument_tenantId_contactId_idx" ON "LegalDocument"("tenantId", "contactId");
CREATE INDEX "LegalDocument_tenantId_leadId_idx" ON "LegalDocument"("tenantId", "leadId");
CREATE INDEX "LegalDocument_tenantId_matterId_idx" ON "LegalDocument"("tenantId", "matterId");
CREATE INDEX "LegalDocument_tenantId_checksum_idx" ON "LegalDocument"("tenantId", "checksum");

ALTER TABLE "LegalDocument" ADD CONSTRAINT "LegalDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalDocument" ADD CONSTRAINT "LegalDocument_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalDocument" ADD CONSTRAINT "LegalDocument_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "LegalLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LegalDocument" ADD CONSTRAINT "LegalDocument_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LegalMatter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LegalDocument" ADD CONSTRAINT "LegalDocument_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LegalDocument" ADD CONSTRAINT "LegalDocument_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
