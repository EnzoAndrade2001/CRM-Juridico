/**
 * create-admin-user.js — Cria (ou promove) um usuário administrador dentro de
 * um tenant JÁ EXISTENTE.
 *
 * Diferente de bootstrap-legal-user.js, este script NUNCA cria um tenant novo.
 * Isso é proposital: um admin criado em outro tenant não enxerga as conexões,
 * os contatos nem os atendimentos que já existem.
 *
 * Uso (rodar no container do backend):
 *   ADMIN_PASSWORD='senha-com-10-ou-mais' node scripts/create-admin-user.js <email> "<Nome>" [slug-do-tenant]
 *
 * A senha vai por variável de ambiente, e não por argumento, para não ficar
 * registrada no histórico do shell nem na lista de processos.
 *
 * Sem argumentos, o script apenas lista os tenants e usuários existentes.
 */
const bcrypt = require('bcryptjs');
const prisma = require('../src/lib/prisma');
const { BCRYPT_ROUNDS, checkPassword } = require('../src/domain/passwordPolicy');

async function listEnvironment() {
  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      maxConnections: true,
      _count: { select: { users: true, instances: true } },
      users: { select: { name: true, email: true, role: true, active: true } },
    },
  });

  if (tenants.length === 0) {
    console.log('Nenhum tenant encontrado no banco.');
    return tenants;
  }

  for (const tenant of tenants) {
    console.log(`\nTenant: ${tenant.name} (slug: ${tenant.slug})`);
    console.log(`  id............: ${tenant.id}`);
    console.log(`  conexões......: ${tenant._count.instances} de ${tenant.maxConnections} permitidas`);
    console.log(`  login.........: /${tenant.slug}/login`);
    console.log('  usuários:');
    for (const user of tenant.users) {
      console.log(`    - ${user.email} | role=${user.role} | ativo=${user.active} | ${user.name}`);
    }
  }
  return tenants;
}

async function main() {
  const [email, name, slugArg] = process.argv.slice(2);

  if (!email) {
    console.log('Nenhum e-mail informado. Listando o ambiente atual.\n');
    console.log('Para criar o admin:');
    console.log('  ADMIN_PASSWORD=\'sua-senha\' node scripts/create-admin-user.js <email> "<Nome>" [slug]\n');
    await listEnvironment();
    return;
  }

  const password = String(process.env.ADMIN_PASSWORD || '').trim();
  const normalizedEmail = String(email).trim().toLowerCase();
  const userName = String(name || '').trim() || normalizedEmail.split('@')[0];

  // Mesma politica dos cadastros feitos pela interface: uma conta criada por
  // script nao pode ser o elo fraco.
  const passwordProblems = checkPassword(password, { email: normalizedEmail, name: userName });
  if (passwordProblems.length) throw new Error(passwordProblems.join(' '));

  // Resolve o tenant: pelo slug informado ou, se houver apenas um, por ele
  // mesmo. Com vários tenants e nenhum slug, o script se recusa a adivinhar.
  let tenant;
  if (slugArg) {
    tenant = await prisma.tenant.findUnique({ where: { slug: String(slugArg).trim().toLowerCase() } });
    if (!tenant) throw new Error(`Tenant com slug "${slugArg}" não encontrado.`);
  } else {
    const tenants = await prisma.tenant.findMany({ select: { id: true, name: true, slug: true } });
    if (tenants.length === 0) throw new Error('Nenhum tenant existe no banco. Este script não cria tenants.');
    if (tenants.length > 1) {
      console.error('Há mais de um tenant. Informe o slug como terceiro argumento:');
      tenants.forEach((item) => console.error(`  - ${item.slug} (${item.name})`));
      process.exit(1);
    }
    [tenant] = tenants;
  }

  const existing = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email: normalizedEmail } },
    select: { id: true, role: true },
  });

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: normalizedEmail } },
    update: { name: userName, password: hashedPassword, role: 'admin', active: true },
    create: {
      tenantId: tenant.id,
      name: userName,
      email: normalizedEmail,
      password: hashedPassword,
      role: 'admin',
      active: true,
    },
    select: { id: true, name: true, email: true, role: true },
  });

  const action = existing
    ? `usuário já existia (role anterior: ${existing.role}) — promovido para admin e senha redefinida`
    : 'usuário criado';

  console.log(`[create-admin] ${action}.`);
  console.log(`[create-admin] ${user.name} <${user.email}> | role=${user.role}`);
  console.log(`[create-admin] tenant: ${tenant.name} (slug: ${tenant.slug})`);
  console.log(`[create-admin] acesse por: /${tenant.slug}/login`);
  console.log('[create-admin] a senha não é exibida nem gravada em texto puro.');
}

main()
  .catch((error) => {
    console.error('[create-admin] erro:', error.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
