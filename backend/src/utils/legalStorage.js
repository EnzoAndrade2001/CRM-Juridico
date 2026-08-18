const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { uploadsPath } = require('./uploads');

// Os documentos jurídicos ficam dentro do volume persistente de uploads, porém em uma
// pasta que o app.js bloqueia explicitamente no express.static. O download acontece
// somente pelo endpoint autenticado /api/legal/documents/:id/file.
const LEGAL_DOCUMENTS_DIRNAME = 'legal';
const legalDocumentsPath = process.env.LEGAL_DOCUMENTS_PATH
  || path.join(uploadsPath, LEGAL_DOCUMENTS_DIRNAME);

if (!fs.existsSync(legalDocumentsPath)) {
  fs.mkdirSync(legalDocumentsPath, { recursive: true });
}

const EXTENSION_BY_MIME = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'text/plain': '.txt',
};

const ALLOWED_MIME_TYPES = Object.freeze(Object.keys(EXTENSION_BY_MIME));
const MAX_FILE_SIZE = 20 * 1024 * 1024;

function safeExtension(fileName, mimeType) {
  const fromMime = EXTENSION_BY_MIME[mimeType];
  if (fromMime) return fromMime;
  const fromName = path.extname(String(fileName || '')).toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(fromName) ? fromName : '';
}

function sanitizeFileName(fileName) {
  const base = path.basename(String(fileName || 'documento'));
  const normalized = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^[._-]+/, '')
    .slice(0, 120);
  return normalized || 'documento';
}

function buildStorageKey(tenantId, fileName, mimeType) {
  const token = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
  return path.posix.join(String(tenantId), `${token}${safeExtension(fileName, mimeType)}`);
}

function absolutePathFor(storageKey) {
  const resolved = path.resolve(legalDocumentsPath, storageKey);
  const root = path.resolve(legalDocumentsPath);
  // Impede que uma chave manipulada escape do diretório privado.
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error('Chave de armazenamento inválida');
  }
  return resolved;
}

function checksumOf(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function storeDocumentFile(tenantId, file) {
  const storageKey = buildStorageKey(tenantId, file.originalname, file.mimetype);
  const destination = absolutePathFor(storageKey);
  await fs.promises.mkdir(path.dirname(destination), { recursive: true });
  await fs.promises.writeFile(destination, file.buffer);
  return {
    storageKey,
    fileName: sanitizeFileName(file.originalname),
    mimeType: file.mimetype,
    fileSize: file.size ?? file.buffer.length,
    checksum: checksumOf(file.buffer),
  };
}

async function removeDocumentFile(storageKey) {
  if (!storageKey) return false;
  try {
    await fs.promises.unlink(absolutePathFor(storageKey));
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function documentFileExists(storageKey) {
  if (!storageKey) return false;
  return fs.existsSync(absolutePathFor(storageKey));
}

module.exports = {
  LEGAL_DOCUMENTS_DIRNAME,
  legalDocumentsPath,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  sanitizeFileName,
  safeExtension,
  buildStorageKey,
  absolutePathFor,
  checksumOf,
  storeDocumentFile,
  removeDocumentFile,
  documentFileExists,
};
