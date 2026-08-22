const crypto = require('crypto');

let warnedMissingSecret = false;

/**
 * Monta a URL pública do webhook da Evolution, embutindo o segredo de
 * validação de origem (EVOLUTION_WEBHOOK_SECRET) como query string.
 *
 * A Evolution API não suporta headers customizados de forma confiável em
 * todas as versões, então o segredo viaja na própria URL registrada na
 * instância — só quem conhece o segredo (nós e a Evolution) consegue montar
 * uma requisição que o backend aceita.
 */
function buildWebhookUrl(backendUrl) {
  const base = `${String(backendUrl || '').replace(/\/+$/, '')}/api/webhook`;
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (!secret) return base;
  return `${base}?secret=${encodeURIComponent(secret)}`;
}

/**
 * Valida se a requisição recebida traz o segredo esperado, com comparação
 * em tempo constante para evitar timing attack.
 *
 * Retorna true quando a requisição pode ser processada. Se
 * EVOLUTION_WEBHOOK_SECRET não estiver configurado, o webhook continua
 * aberto (compatibilidade com ambientes ainda não migrados) mas emite um
 * aviso no boot para que o segredo seja configurado o quanto antes.
 */
function verifyWebhookSecret(req) {
  const expected = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (!expected) {
    if (!warnedMissingSecret) {
      warnedMissingSecret = true;
      console.warn('[webhook] AVISO: EVOLUTION_WEBHOOK_SECRET não configurado — o endpoint do webhook está aceitando requisições sem validar a origem. Configure a variável de ambiente e reinicie o servidor para proteger este endpoint.');
    }
    return true;
  }

  const received = String(req.query?.secret || '');
  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(received);

  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

module.exports = { buildWebhookUrl, verifyWebhookSecret };
