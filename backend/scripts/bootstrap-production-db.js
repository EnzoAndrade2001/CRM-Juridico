const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

if (!process.env.DATABASE_URL) {
  console.error('[db-bootstrap] DATABASE_URL não configurada.');
  process.exit(1);
}

function run(command, args) {
  console.log(`[db-bootstrap] executando: ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

const migrationsPath = path.join(__dirname, '..', 'prisma', 'migrations');
const migrations = fs.readdirSync(migrationsPath, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

console.warn('[db-bootstrap] Operação única para uma base PostgreSQL nova. Faça backup antes de usar em uma base existente.');
run('npx', ['prisma', 'db', 'push', '--skip-generate']);

for (const migration of migrations) {
  run('npx', ['prisma', 'migrate', 'resolve', '--applied', migration]);
}

console.log('[db-bootstrap] Banco alinhado ao schema atual e histórico Prisma inicializado.');
