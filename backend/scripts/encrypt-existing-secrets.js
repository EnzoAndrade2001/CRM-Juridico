/**
 * encrypt-existing-secrets.js — Cifra as chaves de API que já estão gravadas
 * em texto puro em TenantSettings.
 *
 * A criptografia nova só age no que é escrito depois de ligada; os registros
 * antigos continuam legíveis no banco até passarem por aqui.
 *
 * Uso (no container do backend):
 *   node scripts/encrypt-existing-secrets.js            # simulação, não altera
 *   node scripts/encrypt-existing-secrets.js --apply    # aplica
 *
 * É idempotente: valores já cifrados são ignorados. Exige
 * SECRETS_ENCRYPTION_KEY definida — sem ela, o script se recusa a rodar em vez
 * de gravar texto puro achando que cifrou.
 */
const prisma = require('../src/lib/prisma');
const { PREFIX, hasEncryptionKey } = require('../src/lib/secretCrypto');

const APPLY = process.argv.includes('--apply');

const SECRET_COLUMNS = [
  'evolutionKey',
  'openaiKey',
  'geminiKey',
  'serpApiKey',
  'firebirdApiKey',
  'firebirdClientToken',
];

async function main() {
  if (!hasEncryptionKey()) {
    throw new Error('SECRETS_ENCRYPTION_KEY não está definida. Configure a variável antes de rodar este script.');
  }

  // Leitura crua: o cliente do Prisma decifra na saída, então pelo ORM não dá
  // para distinguir o que já está cifrado do que ainda está em texto puro.
  const columns = SECRET_COLUMNS.map((column) => `"${column}"`).join(', ');
  const rows = await prisma.$queryRawUnsafe(`SELECT "id", "tenantId", ${columns} FROM "TenantSettings"`);

  const pending = [];
  for (const row of rows) {
    const plaintextFields = SECRET_COLUMNS.filter((column) => {
      const value = row[column];
      return typeof value === 'string' && value.trim() !== '' && !value.startsWith(PREFIX);
    });
    if (plaintextFields.length) pending.push({ row, plaintextFields });
  }

  console.log(JSON.stringify({
    mode: APPLY ? 'apply' : 'dry-run',
    tenantSettings: rows.length,
    pendentes: pending.length,
    detalhe: pending.map(({ row, plaintextFields }) => ({
      tenantId: row.tenantId,
      camposEmTextoPuro: plaintextFields,
    })),
  }, null, 2));

  if (!pending.length) {
    console.log('Nada a fazer: todos os segredos já estão cifrados.');
    return;
  }

  if (!APPLY) {
    console.log('\nSimulação. Rode de novo com --apply para cifrar.');
    return;
  }

  for (const { row, plaintextFields } of pending) {
    // Gravar pelo Prisma faz o middleware cifrar. O valor enviado é o texto
    // puro lido acima, então não há risco de cifrar duas vezes.
    const data = Object.fromEntries(plaintextFields.map((column) => [column, row[column]]));
    await prisma.tenantSettings.update({ where: { id: row.id }, data });
    console.log(`[secrets] tenant ${row.tenantId}: ${plaintextFields.length} campo(s) cifrado(s).`);
  }

  console.log('\nConcluído. Reinicie a API para garantir que nenhum processo mantenha o valor antigo em memória.');
}

main()
  .catch((error) => {
    console.error('[secrets] erro:', error.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
