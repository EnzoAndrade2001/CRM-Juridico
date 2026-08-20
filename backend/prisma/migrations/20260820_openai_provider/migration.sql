-- Migration: 20260820_openai_provider
-- Adiciona chave OpenAI e campo de seleção de provedor de IA ao TenantSettings

ALTER TABLE "TenantSettings"
  ADD COLUMN IF NOT EXISTS "openaiKey" TEXT,
  ADD COLUMN IF NOT EXISTS "aiProvider" TEXT DEFAULT 'auto';

COMMENT ON COLUMN "TenantSettings"."openaiKey"   IS 'Chave secreta da API OpenAI (sk-...) do tenant';
COMMENT ON COLUMN "TenantSettings"."aiProvider"  IS 'Provedor ativo: auto | openai | gemini';
