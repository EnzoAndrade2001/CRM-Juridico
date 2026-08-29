const { PrismaClient } = require('@prisma/client');
const { decryptSecret, encryptSecret } = require('./secretCrypto');

const prisma = new PrismaClient();

// Campos de TenantSettings que guardam segredo de integração. São cifrados ao
// gravar e decifrados ao ler, de forma transparente: os 123 pontos do código
// que leem settings.evolutionKey e companhia continuam iguais.
const SECRET_FIELDS = new Set([
  'evolutionKey',
  'openaiKey',
  'geminiKey',
  'serpApiKey',
  'firebirdApiKey',
  'firebirdClientToken',
]);

// Profundidade suficiente para os includes usados no projeto
// (tenant -> settings, waInstance -> tenant -> settings) com folga, sem risco
// de percorrer uma árvore grande de mensagens sem necessidade.
const MAX_DEPTH = 6;

function transformTree(node, transform, depth = 0) {
  if (!node || typeof node !== 'object' || depth > MAX_DEPTH) return node;

  if (Array.isArray(node)) {
    node.forEach((item) => transformTree(item, transform, depth + 1));
    return node;
  }

  for (const [key, value] of Object.entries(node)) {
    if (SECRET_FIELDS.has(key) && typeof value === 'string') {
      node[key] = transform(value);
    } else if (value && typeof value === 'object') {
      transformTree(value, transform, depth + 1);
    }
  }
  return node;
}

prisma.$use(async (params, next) => {
  // Escrita: cifra o que vier nos dados, inclusive em create aninhado
  // (tenant.create com settings: { create: {...} }).
  if (params.args?.data) transformTree(params.args.data, encryptSecret);

  const result = await next(params);

  // Leitura: decifra o resultado, alcançando também os includes.
  return transformTree(result, decryptSecret);
});

module.exports = prisma;
