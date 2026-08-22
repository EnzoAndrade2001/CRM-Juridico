-- Monitoramento de movimentação processual via API pública do CNJ (DataJud).
-- courtAlias permite corrigir manualmente o tribunal quando a detecção
-- automática a partir do número CNJ do processo não for possível.
ALTER TABLE "LegalMatter"
  ADD COLUMN IF NOT EXISTS "courtAlias" TEXT,
  ADD COLUMN IF NOT EXISTS "lastMovementAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastMovementCode" INTEGER,
  ADD COLUMN IF NOT EXISTS "dataJudCheckedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "dataJudError" TEXT;
