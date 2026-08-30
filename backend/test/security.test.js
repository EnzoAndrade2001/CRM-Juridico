const test = require('node:test');
const assert = require('node:assert/strict');
const { checkPassword, MIN_LENGTH } = require('../src/domain/passwordPolicy');

test('politica de senha recusa as senhas fracas mais comuns', () => {
  assert.ok(checkPassword('123456').length, 'senha curta e numerica deveria falhar');
  assert.ok(checkPassword('senha12345678').length, 'palavra da blocklist deveria falhar');
  assert.ok(checkPassword('advocacia2026').length, 'palavra do contexto deveria falhar');
  assert.ok(checkPassword('aaaaaaaaaaaa1').some((p) => /poucos caracteres/i.test(p)), 'senha com pouca variacao deveria falhar');
  assert.ok(checkPassword('semnumerosaqui').some((p) => /letras e n[úu]meros/i.test(p)));
  assert.ok(checkPassword('curta1').some((p) => p.includes(String(MIN_LENGTH))));
});

test('politica recusa senha derivada do proprio login', () => {
  const contexto = { email: 'eduarda@juridico.com.br', name: 'Dra. Eduarda Marranghello' };

  assert.ok(checkPassword('eduarda123456', contexto).some((p) => /e-mail|nome/i.test(p)));
  assert.ok(checkPassword('Marranghello9', contexto).some((p) => /nome/i.test(p)));
});

test('politica aceita uma senha razoavel', () => {
  const contexto = { email: 'eduarda@juridico.com.br', name: 'Dra. Eduarda' };

  assert.deepEqual(checkPassword('Chuva7Verde2Porto', contexto), []);
});

test('segredo cifrado nao aparece em texto puro e volta ao original', (t) => {
  const original = process.env.SECRETS_ENCRYPTION_KEY;
  process.env.SECRETS_ENCRYPTION_KEY = 'a'.repeat(64);
  t.after(() => {
    if (original === undefined) delete process.env.SECRETS_ENCRYPTION_KEY;
    else process.env.SECRETS_ENCRYPTION_KEY = original;
  });

  const { encryptSecret, decryptSecret, isEncrypted } = require('../src/lib/secretCrypto');
  const chave = 'sk-proj-chave-secreta-da-openai';
  const cifrado = encryptSecret(chave);

  assert.ok(isEncrypted(cifrado));
  assert.doesNotMatch(cifrado, /sk-proj/);
  assert.equal(decryptSecret(cifrado), chave);
  // Cifrar duas vezes nao empilha camadas.
  assert.equal(encryptSecret(cifrado), cifrado);
  // Cada gravacao usa IV novo, entao o mesmo valor nunca gera o mesmo texto.
  assert.notEqual(encryptSecret(chave), encryptSecret(chave));
  // Texto puro antigo continua legivel enquanto a migracao nao roda.
  assert.equal(decryptSecret('chave-antiga-em-texto-puro'), 'chave-antiga-em-texto-puro');
  assert.equal(encryptSecret(null), null);
});

test('sem a chave de ambiente o valor cifrado nao vira lixo silencioso', (t) => {
  const original = process.env.SECRETS_ENCRYPTION_KEY;
  process.env.SECRETS_ENCRYPTION_KEY = 'b'.repeat(64);
  const { encryptSecret, decryptSecret } = require('../src/lib/secretCrypto');
  const cifrado = encryptSecret('valor-importante');

  t.after(() => {
    if (original === undefined) delete process.env.SECRETS_ENCRYPTION_KEY;
    else process.env.SECRETS_ENCRYPTION_KEY = original;
  });

  delete process.env.SECRETS_ENCRYPTION_KEY;
  assert.equal(decryptSecret(cifrado), null);
});

test('logger nao expoe token nem segredo na query', () => {
  const mask = (u) => u.replace(/([?&](?:token|secret)=)[^&]+/gi, '$1***');

  assert.equal(mask('/api/os/1/pdf?token=eyJabc.def.ghi'), '/api/os/1/pdf?token=***');
  assert.equal(mask('/api/webhook?secret=abcdef123&x=1'), '/api/webhook?secret=***&x=1');
  assert.equal(mask('/api/tickets?status=open'), '/api/tickets?status=open');
});

test('teto diario da calculadora bloqueia acima do limite configurado', async (t) => {
  const prisma = require('../src/lib/prisma');
  const evolutionService = require('../src/services/evolutionService');
  const { createCalculatorSubmission } = require('../src/controllers/publicCalculatorController');

  const originals = {
    tenantFind: prisma.tenant.findUnique,
    count: prisma.calculatorSubmission.count,
    cap: process.env.PUBLIC_CALCULATOR_DAILY_CAP,
    slug: process.env.PUBLIC_CALCULATOR_TENANT_SLUG,
  };
  t.after(() => {
    prisma.tenant.findUnique = originals.tenantFind;
    prisma.calculatorSubmission.count = originals.count;
    if (originals.cap === undefined) delete process.env.PUBLIC_CALCULATOR_DAILY_CAP; else process.env.PUBLIC_CALCULATOR_DAILY_CAP = originals.cap;
    if (originals.slug === undefined) delete process.env.PUBLIC_CALCULATOR_TENANT_SLUG; else process.env.PUBLIC_CALCULATOR_TENANT_SLUG = originals.slug;
  });

  process.env.PUBLIC_CALCULATOR_TENANT_SLUG = 'eduarda';
  process.env.PUBLIC_CALCULATOR_DAILY_CAP = '2';
  prisma.tenant.findUnique = async () => ({ id: 'tenant-a', slug: 'eduarda', settings: {}, instances: [] });
  prisma.calculatorSubmission.count = async () => 2; // ja atingiu o teto

  const req = {
    // IP unico para nao colidir com o rate-limit de 30s de outros testes
    headers: { 'x-forwarded-for': '203.0.113.77' }, socket: {},
    body: {
      name: 'Teste', phone: '5551999998888', installment: '200',
      totalInstallments: '48', paidInstallments: '3', source: 'revisional-bancario', consent: true,
    },
  };
  let status; let payload;
  const res = { set() {}, status(c) { status = c; return this; }, json(p) { payload = p; return this; } };

  await createCalculatorSubmission(req, res);

  assert.equal(status, 429);
  assert.match(payload.error, /Limite diário/i);
});
