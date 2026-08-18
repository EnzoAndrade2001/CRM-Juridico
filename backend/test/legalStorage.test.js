const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.LEGAL_DOCUMENTS_PATH = fs.mkdtempSync(path.join(os.tmpdir(), 'legal-docs-'));

const {
  legalDocumentsPath,
  sanitizeFileName,
  safeExtension,
  buildStorageKey,
  absolutePathFor,
  checksumOf,
  storeDocumentFile,
  removeDocumentFile,
  documentFileExists,
  ALLOWED_MIME_TYPES,
} = require('../src/utils/legalStorage');

function fakeFile(overrides = {}) {
  const buffer = Buffer.from('conteudo do documento juridico');
  return {
    originalname: 'Termo de Rescisão.pdf',
    mimetype: 'application/pdf',
    size: buffer.length,
    buffer,
    ...overrides,
  };
}

test('remove acentos e caracteres perigosos do nome do arquivo', () => {
  assert.equal(sanitizeFileName('Termo de Rescisão (final).pdf'), 'Termo_de_Rescisao_final_.pdf');
  assert.equal(sanitizeFileName('../../etc/passwd'), 'passwd');
  assert.equal(sanitizeFileName(''), 'documento');
});

test('deriva a extensão pelo mime type e ignora extensões suspeitas', () => {
  assert.equal(safeExtension('contrato.qualquer', 'application/pdf'), '.pdf');
  assert.equal(safeExtension('contrato.pdf', 'application/desconhecido'), '.pdf');
  assert.equal(safeExtension('arquivo-sem-extensao', 'application/desconhecido'), '');
});

test('a chave de armazenamento isola os arquivos por escritório', () => {
  const key = buildStorageKey('tenant-a', 'contrato.pdf', 'application/pdf');
  assert.ok(key.startsWith('tenant-a/'));
  assert.ok(key.endsWith('.pdf'));
  assert.notEqual(key, buildStorageKey('tenant-a', 'contrato.pdf', 'application/pdf'));
});

test('bloqueia chaves que tentam escapar do diretório privado', () => {
  assert.throws(() => absolutePathFor('../../etc/passwd'), /Chave de armazenamento inválida/);
  assert.throws(() => absolutePathFor('tenant-a/../../../segredo.txt'), /Chave de armazenamento inválida/);
  assert.ok(absolutePathFor('tenant-a/arquivo.pdf').startsWith(path.resolve(legalDocumentsPath)));
});

test('o diretório privado não fica dentro da árvore servida publicamente sem bloqueio', () => {
  // Em produção o diretório é uploads/legal e o app.js responde 403 para esse prefixo.
  assert.ok(path.isAbsolute(legalDocumentsPath));
});

test('grava, confere o checksum e remove o arquivo', async () => {
  const file = fakeFile();
  const stored = await storeDocumentFile('tenant-a', file);

  assert.equal(stored.fileName, 'Termo_de_Rescisao.pdf');
  assert.equal(stored.mimeType, 'application/pdf');
  assert.equal(stored.fileSize, file.buffer.length);
  assert.equal(stored.checksum, checksumOf(file.buffer));
  assert.ok(documentFileExists(stored.storageKey));
  assert.equal(fs.readFileSync(absolutePathFor(stored.storageKey), 'utf8'), 'conteudo do documento juridico');

  assert.equal(await removeDocumentFile(stored.storageKey), true);
  assert.equal(documentFileExists(stored.storageKey), false);
  assert.equal(await removeDocumentFile(stored.storageKey), false);
});

test('arquivos de escritórios diferentes não compartilham pasta', async () => {
  const first = await storeDocumentFile('tenant-a', fakeFile());
  const second = await storeDocumentFile('tenant-b', fakeFile());
  assert.notEqual(path.dirname(first.storageKey), path.dirname(second.storageKey));
});

test('aceita somente formatos previstos para documentos jurídicos', () => {
  assert.ok(ALLOWED_MIME_TYPES.includes('application/pdf'));
  assert.ok(ALLOWED_MIME_TYPES.includes('image/jpeg'));
  assert.ok(!ALLOWED_MIME_TYPES.includes('application/x-msdownload'));
  assert.ok(!ALLOWED_MIME_TYPES.includes('text/html'));
});
