const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

if (!process.env.DATABASE_URL) {
  console.error('[db-bootstrap] DATABASE_URL nao configurada.');
  process.exit(1);
}

function run(command, args) {
  console.log(`[db-bootstrap] executando: ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

async function readMigrationState() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe(
      'SELECT "migration_name", "finished_at", "rolled_back_at" FROM "_prisma_migrations"',
    );
    return {
      failed: rows
        .filter((row) => !row.finished_at && !row.rolled_back_at)
        .map((row) => row.migration_name)
        .filter(Boolean),
      applied: new Set(
        rows
          .filter((row) => row.finished_at && !row.rolled_back_at)
          .map((row) => row.migration_name)
          .filter(Boolean),
      ),
    };
  } catch (error) {
    // A brand-new database does not have the Prisma history table yet.
    if (error.message?.includes('does not exist') || error.message?.includes('42P01')) {
      return { failed: [], applied: new Set() };
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

const migrationsPath = path.join(__dirname, '..', 'prisma', 'migrations');
const migrations = fs.readdirSync(migrationsPath, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

async function main() {
  console.warn('[db-bootstrap] Operacao unica para uma base PostgreSQL nova. Faca backup antes de usar em uma base existente.');

  // If the API attempted migrate deploy before bootstrap, mark only those
  // incomplete migrations as rolled back so the schema can be synchronized.
  const migrationState = await readMigrationState();
  for (const migration of migrationState.failed) {
    run('npx', ['prisma', 'migrate', 'resolve', '--rolled-back', migration]);
  }

  run('npx', ['prisma', 'db', 'push', '--skip-generate']);

  for (const migration of migrations) {
    // Existing databases already have part (or all) of the migration history.
    // Resolving those again causes Prisma P3008, so only initialize entries
    // that are not recorded as successfully applied yet.
    if (migrationState.applied.has(migration)) continue;
    run('npx', ['prisma', 'migrate', 'resolve', '--applied', migration]);
  }

  console.log('[db-bootstrap] Banco alinhado ao schema atual e historico Prisma inicializado.');
}

main().catch((error) => {
  console.error('[db-bootstrap] falha:', error.message);
  process.exit(1);
});
