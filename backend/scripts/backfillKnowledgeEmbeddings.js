/**
 * backfillKnowledgeEmbeddings.js
 *
 * Reprocessa entradas da Base de Conhecimento que ficaram sem embedding
 * (embedding = null) porque foram cadastradas antes da correção que faz
 * knowledgeController usar aiService (Gemini OU OpenAI, conforme o tenant)
 * em vez de chamar geminiService diretamente.
 *
 * Sem embedding, a entrada nunca é encontrada pela busca semântica do
 * chatbot (webhookController filtra `embedding: { not: null }`), então
 * ela fica cadastrada no painel mas nunca é usada em produção.
 *
 * Uso: node scripts/backfillKnowledgeEmbeddings.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const aiService = require('../src/services/aiService');

async function main() {
  const pending = await prisma.knowledge.findMany({
    where: { embedding: null },
  });

  if (!pending.length) {
    console.log('Nenhuma entrada pendente. Todas as bases já têm embedding.');
    return;
  }

  console.log(`Encontradas ${pending.length} entradas sem embedding.`);

  const settingsCache = new Map();
  let updated = 0;
  let skipped = 0;

  for (const entry of pending) {
    let settings = settingsCache.get(entry.tenantId);
    if (settings === undefined) {
      settings = await prisma.tenantSettings.findUnique({ where: { tenantId: entry.tenantId } });
      settingsCache.set(entry.tenantId, settings);
    }

    if (!aiService.hasAiConfigured(settings)) {
      console.log(`  [skip] tenant ${entry.tenantId} sem provedor de IA configurado (knowledge ${entry.id})`);
      skipped += 1;
      continue;
    }

    try {
      const embedding = await aiService.getEmbedding(settings, `${entry.question}\n${entry.answer}`);
      if (!embedding) {
        console.log(`  [warn] embedding vazio para knowledge ${entry.id} (tenant ${entry.tenantId})`);
        skipped += 1;
        continue;
      }
      await prisma.knowledge.update({ where: { id: entry.id }, data: { embedding } });
      updated += 1;
      console.log(`  [ok] knowledge ${entry.id} atualizado`);
    } catch (err) {
      console.error(`  [erro] knowledge ${entry.id}: ${err.message}`);
      skipped += 1;
    }
  }

  console.log(`\nConcluído. Atualizados: ${updated}. Ignorados: ${skipped}.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
