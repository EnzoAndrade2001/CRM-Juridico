/**
 * secretCrypto.js — Criptografia em repouso dos segredos guardados no banco.
 *
 * As chaves de API do tenant (Evolution, OpenAI, Gemini, SerpAPI, Firebird)
 * ficavam em texto puro em TenantSettings. Qualquer cópia do banco — um dump,
 * um backup mal guardado, um acesso de leitura — entregava junto o controle do
 * WhatsApp do escritório e a chave de faturamento da OpenAI.
 *
 * Agora o valor é cifrado com AES-256-GCM usando uma chave que vive apenas na
 * variável de ambiente SECRETS_ENCRYPTION_KEY. Quem tiver o banco sem ter o
 * ambiente não consegue ler nada.
 *
 * Formato do valor gravado:  enc:v1:<iv>:<authTag>:<texto cifrado>   (base64)
 *
 * Compatibilidade: valores sem o prefixo são tratados como texto puro e
 * devolvidos como estão. Isso permite ligar a criptografia sem downtime e
 * migrar os registros antigos depois, com o script encrypt-existing-secrets.
 */
const crypto = require('crypto');

const PREFIX = 'enc:v1:';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

let warnedMissingKey = false;

/**
 * Aceita a chave em hex (64 caracteres) ou base64. Exige 32 bytes — o tamanho
 * do AES-256. Uma chave curta seria aceita silenciosamente por engano, então
 * falhamos alto.
 */
function loadKey() {
  const raw = String(process.env.SECRETS_ENCRYPTION_KEY || '').trim();
  if (!raw) return null;

  const buffer = /^[0-9a-f]{64}$/i.test(raw)
    ? Buffer.from(raw, 'hex')
    : Buffer.from(raw, 'base64');

  if (buffer.length !== 32) {
    throw new Error('SECRETS_ENCRYPTION_KEY precisa ter 32 bytes (64 caracteres hex ou 44 em base64).');
  }
  return buffer;
}

function hasEncryptionKey() {
  return Boolean(loadKey());
}

function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

function encryptSecret(value) {
  if (value === null || value === undefined || value === '') return value;
  if (typeof value !== 'string') return value;
  if (isEncrypted(value)) return value;

  const key = loadKey();
  if (!key) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      console.warn('[secrets] AVISO: SECRETS_ENCRYPTION_KEY não configurada — as chaves de API continuam em texto puro no banco. Configure a variável para ativar a criptografia.');
    }
    return value;
  }

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptSecret(value) {
  if (!isEncrypted(value)) return value;

  const key = loadKey();
  if (!key) {
    console.error('[secrets] valor cifrado encontrado sem SECRETS_ENCRYPTION_KEY definida — a integração que depende dele vai falhar.');
    return null;
  }

  try {
    const [ivPart, tagPart, dataPart] = value.slice(PREFIX.length).split(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivPart, 'base64'));
    decipher.setAuthTag(Buffer.from(tagPart, 'base64'));
    return Buffer.concat([decipher.update(Buffer.from(dataPart, 'base64')), decipher.final()]).toString('utf8');
  } catch (error) {
    // Chave trocada ou valor corrompido. Devolver null é melhor que devolver
    // lixo: a integração falha de forma clara em vez de autenticar errado.
    console.error('[secrets] falha ao decifrar um segredo — a chave de criptografia mudou?', error.message);
    return null;
  }
}

/** Gera uma chave válida. Usado pelo script de setup. */
function generateKey() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  PREFIX,
  decryptSecret,
  encryptSecret,
  generateKey,
  hasEncryptionKey,
  isEncrypted,
};
