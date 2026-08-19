const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');

/**
 * Cria ou atualiza, de forma idempotente, o primeiro administrador do
 * escritório. Este script não remove tenants, usuários ou dados existentes.
 *
 * Uso único (com as variáveis definidas no ambiente):
 *   npm run user:bootstrap
 */
function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`Variável obrigatória não configurada: ${name}`);
  return value;
}

function normalizeSlug(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

async function main() {
  const tenantName = String(process.env.BOOTSTRAP_TENANT_NAME || 'Escritório Dra. Eduarda').trim();
  const tenantSlug = normalizeSlug(process.env.BOOTSTRAP_TENANT_SLUG || 'eduarda');
  const userName = String(process.env.BOOTSTRAP_USER_NAME || 'Dra. Eduarda').trim();
  const userEmail = required('BOOTSTRAP_USER_EMAIL').toLowerCase();
  const userPassword = required('BOOTSTRAP_USER_PASSWORD');

  if (userPassword.length < 10) {
    throw new Error('BOOTSTRAP_USER_PASSWORD deve ter pelo menos 10 caracteres.');
  }
  if (!tenantSlug) throw new Error('BOOTSTRAP_TENANT_SLUG inválido.');

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: {},
    create: {
      name: tenantName,
      slug: tenantSlug,
      plan: 'trial',
      maxConnections: 1,
      maxUsers: 5,
      settings: { create: {} },
    },
  });

  await prisma.tenantSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: { tenantId: tenant.id },
  });

  const password = await bcrypt.hash(userPassword, 12);
  const user = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: userEmail } },
    update: { name: userName, password, role: 'admin', active: true },
    create: {
      tenantId: tenant.id,
      name: userName,
      email: userEmail,
      password,
      role: 'admin',
      active: true,
    },
    select: { id: true, name: true, email: true, role: true, tenant: { select: { name: true, slug: true } } },
  });

  console.log('[user-bootstrap] acesso administrativo pronto.');
  console.log(`[user-bootstrap] empresa: ${user.tenant.name} (slug: ${user.tenant.slug})`);
  console.log(`[user-bootstrap] usuário: ${user.name} <${user.email}>`);
  console.log(`[user-bootstrap] login: /${user.tenant.slug}/login`);
  console.log('[user-bootstrap] a senha não é exibida nem armazenada em texto puro.');
}

main()
  .catch((error) => {
    console.error(`[user-bootstrap] falha: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
