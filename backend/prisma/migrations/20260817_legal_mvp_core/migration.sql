CREATE TYPE "LegalArea" AS ENUM (
    'CIVEL',
    'TRABALHISTA',
    'FAMILIA',
    'PREVIDENCIARIO',
    'SUCESSOES',
    'CONSUMIDOR',
    'EMPRESARIAL',
    'OUTRO'
);

CREATE TYPE "LegalLeadStage" AS ENUM (
    'NOVO_CONTATO',
    'QUALIFICACAO_IA',
    'AGUARDANDO_DOCUMENTOS',
    'ANALISE_HUMANA',
    'CONSULTA_AGENDADA',
    'PROPOSTA_ENVIADA',
    'CONTRATADO',
    'NAO_CONVERTIDO'
);

CREATE TYPE "LegalPriority" AS ENUM ('BAIXA', 'MEDIA', 'ALTA', 'URGENTE');
CREATE TYPE "LegalMatterStatus" AS ENUM ('TRIAGEM', 'ATIVO', 'SUSPENSO', 'ENCERRADO', 'ARQUIVADO');
CREATE TYPE "LegalTaskType" AS ENUM ('PROXIMA_ACAO', 'PRAZO', 'AUDIENCIA', 'DOCUMENTO', 'RETORNO', 'OUTRO');
CREATE TYPE "LegalTaskStatus" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

CREATE TABLE "LegalLead" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "ticketId" TEXT,
    "assignedUserId" TEXT,
    "title" TEXT NOT NULL,
    "area" "LegalArea" NOT NULL,
    "stage" "LegalLeadStage" NOT NULL DEFAULT 'NOVO_CONTATO',
    "urgency" "LegalPriority" NOT NULL DEFAULT 'MEDIA',
    "source" TEXT NOT NULL DEFAULT 'whatsapp',
    "summary" TEXT,
    "qualification" JSONB,
    "nextActionAt" TIMESTAMP(3),
    "lostReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalLead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalMatter" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadId" TEXT,
    "contactId" TEXT NOT NULL,
    "responsibleUserId" TEXT,
    "title" TEXT NOT NULL,
    "area" "LegalArea" NOT NULL,
    "status" "LegalMatterStatus" NOT NULL DEFAULT 'TRIAGEM',
    "description" TEXT,
    "caseNumber" TEXT,
    "court" TEXT,
    "opposingParty" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalMatter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadId" TEXT,
    "matterId" TEXT,
    "assigneeId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "LegalTaskType" NOT NULL DEFAULT 'PROXIMA_ACAO',
    "priority" "LegalPriority" NOT NULL DEFAULT 'MEDIA',
    "status" "LegalTaskStatus" NOT NULL DEFAULT 'PENDENTE',
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalTask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegalActivity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LegalLead_ticketId_key" ON "LegalLead"("ticketId");
CREATE INDEX "LegalLead_tenantId_stage_updatedAt_idx" ON "LegalLead"("tenantId", "stage", "updatedAt");
CREATE INDEX "LegalLead_tenantId_area_idx" ON "LegalLead"("tenantId", "area");
CREATE INDEX "LegalLead_tenantId_assignedUserId_idx" ON "LegalLead"("tenantId", "assignedUserId");
CREATE INDEX "LegalLead_tenantId_contactId_idx" ON "LegalLead"("tenantId", "contactId");

CREATE UNIQUE INDEX "LegalMatter_leadId_key" ON "LegalMatter"("leadId");
CREATE INDEX "LegalMatter_tenantId_status_updatedAt_idx" ON "LegalMatter"("tenantId", "status", "updatedAt");
CREATE INDEX "LegalMatter_tenantId_area_idx" ON "LegalMatter"("tenantId", "area");
CREATE INDEX "LegalMatter_tenantId_responsibleUserId_idx" ON "LegalMatter"("tenantId", "responsibleUserId");
CREATE INDEX "LegalMatter_tenantId_contactId_idx" ON "LegalMatter"("tenantId", "contactId");
CREATE INDEX "LegalMatter_tenantId_caseNumber_idx" ON "LegalMatter"("tenantId", "caseNumber");

CREATE INDEX "LegalTask_tenantId_status_dueAt_idx" ON "LegalTask"("tenantId", "status", "dueAt");
CREATE INDEX "LegalTask_tenantId_assigneeId_status_idx" ON "LegalTask"("tenantId", "assigneeId", "status");
CREATE INDEX "LegalTask_tenantId_leadId_idx" ON "LegalTask"("tenantId", "leadId");
CREATE INDEX "LegalTask_tenantId_matterId_idx" ON "LegalTask"("tenantId", "matterId");

CREATE INDEX "LegalActivity_tenantId_entityType_entityId_createdAt_idx" ON "LegalActivity"("tenantId", "entityType", "entityId", "createdAt");
CREATE INDEX "LegalActivity_tenantId_createdAt_idx" ON "LegalActivity"("tenantId", "createdAt");

ALTER TABLE "LegalLead" ADD CONSTRAINT "LegalLead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalLead" ADD CONSTRAINT "LegalLead_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalLead" ADD CONSTRAINT "LegalLead_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LegalLead" ADD CONSTRAINT "LegalLead_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LegalMatter" ADD CONSTRAINT "LegalMatter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalMatter" ADD CONSTRAINT "LegalMatter_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "LegalLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LegalMatter" ADD CONSTRAINT "LegalMatter_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalMatter" ADD CONSTRAINT "LegalMatter_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LegalTask" ADD CONSTRAINT "LegalTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalTask" ADD CONSTRAINT "LegalTask_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "LegalLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalTask" ADD CONSTRAINT "LegalTask_matterId_fkey" FOREIGN KEY ("matterId") REFERENCES "LegalMatter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalTask" ADD CONSTRAINT "LegalTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LegalActivity" ADD CONSTRAINT "LegalActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LegalActivity" ADD CONSTRAINT "LegalActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
