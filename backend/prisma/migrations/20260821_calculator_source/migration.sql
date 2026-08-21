-- Registra a origem validada de cada captação da calculadora para auditoria.
ALTER TABLE "CalculatorSubmission"
  ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'landing:revisional-bancario';

CREATE INDEX IF NOT EXISTS "CalculatorSubmission_tenantId_source_idx"
  ON "CalculatorSubmission"("tenantId", "source");
