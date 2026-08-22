-- Rastreia o último estágio de alerta de prazo já disparado para cada tarefa,
-- evitando notificar o mesmo estágio repetidamente a cada execução do cron.
ALTER TABLE "LegalTask"
  ADD COLUMN IF NOT EXISTS "lastReminderStage" TEXT,
  ADD COLUMN IF NOT EXISTS "lastReminderAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "LegalTask_tenantId_dueAt_status_idx"
  ON "LegalTask"("tenantId", "dueAt", "status");
