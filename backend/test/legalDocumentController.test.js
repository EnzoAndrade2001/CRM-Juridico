const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.LEGAL_DOCUMENTS_PATH = fs.mkdtempSync(path.join(os.tmpdir(), 'legal-doc-ctrl-'));

const prisma = require('../src/lib/prisma');
const { legalDocumentsPath, absolutePathFor } = require('../src/utils/legalStorage');
const {
  listLegalDocuments,
  getLegalDocument,
  createLegalDocument,
  uploadLegalDocumentFile,
  updateLegalDocument,
  downloadLegalDocument,
} = require('../src/controllers/legalDocumentController');

function responseRecorder() {
  return {
    statusCode: 200,
    payload: undefined,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
    setHeader(name, value) { this.headers[name] = value; return this; },
  };
}

function authenticatedRequest(body = {}, extras = {}) {
  return {
    body,
    query: {},
    params: {},
    user: { userId: 'user-1', tenantId: 'tenant-a', role: 'admin' },
    ...extras,
  };
}

function pdfFile(name = 'Termo de Rescisão.pdf') {
  const buffer = Buffer.from('%PDF-1.4 documento juridico');
  return { originalname: name, mimetype: 'application/pdf', size: buffer.length, buffer };
}

function transactionStub(handlers) {
  return async (callback) => callback(handlers);
}

function storedFileCount() {
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((total, entry) => (
    entry.isDirectory() ? total + walk(path.join(dir, entry.name)) : total + 1
  ), 0);
  return walk(legalDocumentsPath);
}

test('lista documentos isolados por escritório e aplica o filtro de pendências', async (t) => {
  const originals = { findMany: prisma.legalDocument.findMany, count: prisma.legalDocument.count };
  t.after(() => {
    prisma.legalDocument.findMany = originals.findMany;
    prisma.legalDocument.count = originals.count;
  });

  let capturedWhere;
  prisma.legalDocument.findMany = async ({ where }) => {
    capturedWhere = where;
    return [{ id: 'doc-1', title: 'Procuração', storageKey: 'tenant-a/arquivo.pdf', status: 'RECEBIDO' }];
  };
  prisma.legalDocument.count = async () => 1;

  const res = responseRecorder();
  await listLegalDocuments(authenticatedRequest({}, { query: { pending: 'true', kind: 'procuração' } }), res);

  assert.equal(capturedWhere.tenantId, 'tenant-a');
  assert.equal(capturedWhere.kind, 'PROCURACAO');
  assert.deepEqual(capturedWhere.status, { in: ['SOLICITADO'] });
  assert.equal(res.payload.items[0].hasFile, true);
  assert.equal(res.payload.items[0].downloadUrl, '/api/legal/documents/doc-1/file');
});

test('a resposta nunca expõe a chave de armazenamento do arquivo', async (t) => {
  const originals = {
    findFirst: prisma.legalDocument.findFirst,
    activityFindMany: prisma.legalActivity.findMany,
  };
  t.after(() => {
    prisma.legalDocument.findFirst = originals.findFirst;
    prisma.legalActivity.findMany = originals.activityFindMany;
  });

  prisma.legalDocument.findFirst = async () => ({
    id: 'doc-1', title: 'Procuração', storageKey: 'tenant-a/segredo.pdf', status: 'APROVADO',
  });
  prisma.legalActivity.findMany = async () => [];

  const res = responseRecorder();
  await getLegalDocument(authenticatedRequest({}, { params: { id: 'doc-1' } }), res);

  assert.equal(res.payload.storageKey, undefined);
  assert.equal(JSON.stringify(res.payload).includes('segredo.pdf'), false);
  assert.equal(res.payload.hasFile, true);
});

test('deriva o cliente a partir do caso jurídico do mesmo escritório', async (t) => {
  const originalTransaction = prisma.$transaction;
  t.after(() => { prisma.$transaction = originalTransaction; });

  let createdData;
  let activityType;
  prisma.$transaction = transactionStub({
    legalLead: { findFirst: async () => null },
    legalMatter: { findFirst: async () => ({ id: 'matter-1', contactId: 'contact-9', leadId: null }) },
    contact: { findFirst: async () => ({ id: 'contact-9' }) },
    legalDocument: {
      create: async ({ data }) => {
        createdData = data;
        return { id: 'doc-1', ...data };
      },
    },
    legalActivity: { create: async ({ data }) => { activityType = data.type; return data; } },
  });

  const res = responseRecorder();
  await createLegalDocument(authenticatedRequest({
    matterId: 'matter-1',
    title: 'Comprovante de residência',
    kind: 'comprovante residencia',
  }), res);

  assert.equal(res.statusCode, 201);
  assert.equal(createdData.contactId, 'contact-9');
  assert.equal(createdData.status, 'SOLICITADO');
  assert.equal(createdData.source, 'solicitacao');
  assert.equal(createdData.requestedById, 'user-1');
  assert.equal(activityType, 'document.requested');
});

test('recusa vincular documento a uma oportunidade de outro cliente', async (t) => {
  const originalTransaction = prisma.$transaction;
  t.after(() => { prisma.$transaction = originalTransaction; });

  prisma.$transaction = transactionStub({
    legalLead: { findFirst: async () => ({ id: 'lead-1', contactId: 'contact-outro' }) },
    legalMatter: { findFirst: async () => null },
    contact: { findFirst: async () => ({ id: 'contact-1' }) },
    legalDocument: { create: async () => assert.fail('não deveria criar o documento') },
    legalActivity: { create: async () => ({}) },
  });

  await assert.rejects(
    createLegalDocument(authenticatedRequest({
      contactId: 'contact-1',
      leadId: 'lead-1',
      title: 'Documento cruzado',
    }), responseRecorder()),
    (error) => error.statusCode === 400,
  );
});

test('recusa documento vinculado a caso de outro escritório', async (t) => {
  const originalTransaction = prisma.$transaction;
  t.after(() => { prisma.$transaction = originalTransaction; });

  prisma.$transaction = transactionStub({
    legalLead: { findFirst: async () => null },
    legalMatter: { findFirst: async () => null },
    contact: { findFirst: async () => null },
    legalDocument: { create: async () => assert.fail('não deveria criar o documento') },
    legalActivity: { create: async () => ({}) },
  });

  await assert.rejects(
    createLegalDocument(authenticatedRequest({ matterId: 'matter-de-outro-tenant', title: 'Contrato' }), responseRecorder()),
    (error) => error.statusCode === 400 && /não pertence a este escritório/.test(error.message),
  );
});

test('cria o documento já recebido quando o arquivo acompanha a requisição', async (t) => {
  const originalTransaction = prisma.$transaction;
  t.after(() => { prisma.$transaction = originalTransaction; });

  let createdData;
  prisma.$transaction = transactionStub({
    legalLead: { findFirst: async () => null },
    legalMatter: { findFirst: async () => null },
    contact: { findFirst: async () => ({ id: 'contact-1' }) },
    legalDocument: {
      create: async ({ data }) => {
        createdData = data;
        return { id: 'doc-1', ...data };
      },
    },
    legalActivity: { create: async ({ data }) => data },
  });

  const res = responseRecorder();
  await createLegalDocument(authenticatedRequest(
    { contactId: 'contact-1', title: 'Termo de rescisão', kind: 'rescisao' },
    { file: pdfFile() },
  ), res);

  assert.equal(res.statusCode, 201);
  assert.equal(createdData.status, 'RECEBIDO');
  assert.equal(createdData.fileName, 'Termo_de_Rescisao.pdf');
  assert.equal(createdData.checksum.length, 64);
  assert.ok(createdData.receivedAt instanceof Date);
  assert.ok(fs.existsSync(absolutePathFor(createdData.storageKey)));
  assert.equal(res.payload.storageKey, undefined);
});

test('remove o arquivo gravado quando a transação falha', async (t) => {
  const originalTransaction = prisma.$transaction;
  t.after(() => { prisma.$transaction = originalTransaction; });

  const before = storedFileCount();
  prisma.$transaction = transactionStub({
    legalLead: { findFirst: async () => null },
    legalMatter: { findFirst: async () => null },
    contact: { findFirst: async () => ({ id: 'contact-1' }) },
    legalDocument: { create: async () => { throw new Error('falha de banco'); } },
    legalActivity: { create: async () => ({}) },
  });

  await assert.rejects(
    createLegalDocument(authenticatedRequest(
      { contactId: 'contact-1', title: 'Contrato' },
      { file: pdfFile('contrato.pdf') },
    ), responseRecorder()),
    /falha de banco/,
  );
  assert.equal(storedFileCount(), before, 'nenhum arquivo órfão deve permanecer no disco');
});

test('anexar arquivo a uma solicitação marca o documento como recebido', async (t) => {
  const originals = { findFirst: prisma.legalDocument.findFirst, transaction: prisma.$transaction };
  t.after(() => {
    prisma.legalDocument.findFirst = originals.findFirst;
    prisma.$transaction = originals.transaction;
  });

  prisma.legalDocument.findFirst = async () => ({
    id: 'doc-1', storageKey: null, status: 'SOLICITADO', receivedAt: null,
  });
  let updateData;
  prisma.$transaction = transactionStub({
    legalDocument: {
      update: async ({ data }) => {
        updateData = data;
        return { id: 'doc-1', ...data };
      },
    },
    legalActivity: { create: async ({ data }) => data },
  });

  const res = responseRecorder();
  await uploadLegalDocumentFile(authenticatedRequest({}, { params: { id: 'doc-1' }, file: pdfFile() }), res);

  assert.equal(updateData.status, 'RECEBIDO');
  assert.ok(updateData.receivedAt instanceof Date);
  assert.equal(updateData.reviewedAt, null);
  assert.equal(updateData.source, 'upload');
  assert.ok(fs.existsSync(absolutePathFor(updateData.storageKey)));
});

test('substituir o arquivo descarta a versão anterior somente após persistir a nova', async (t) => {
  const originals = { findFirst: prisma.legalDocument.findFirst, transaction: prisma.$transaction };
  t.after(() => {
    prisma.legalDocument.findFirst = originals.findFirst;
    prisma.$transaction = originals.transaction;
  });

  const antigo = 'tenant-a/versao-antiga.pdf';
  fs.mkdirSync(path.dirname(absolutePathFor(antigo)), { recursive: true });
  fs.writeFileSync(absolutePathFor(antigo), 'versao antiga');

  prisma.legalDocument.findFirst = async () => ({
    id: 'doc-1', storageKey: antigo, status: 'RECUSADO', receivedAt: new Date(),
  });
  let updateData;
  prisma.$transaction = transactionStub({
    legalDocument: { update: async ({ data }) => { updateData = data; return { id: 'doc-1', ...data }; } },
    legalActivity: { create: async ({ data }) => data },
  });

  await uploadLegalDocumentFile(
    authenticatedRequest({}, { params: { id: 'doc-1' }, file: pdfFile() }),
    responseRecorder(),
  );

  assert.equal(fs.existsSync(absolutePathFor(antigo)), false, 'o arquivo antigo deve ser removido');
  assert.ok(fs.existsSync(absolutePathFor(updateData.storageKey)));
});

test('não aceita novo arquivo em documento arquivado', async (t) => {
  const original = prisma.legalDocument.findFirst;
  t.after(() => { prisma.legalDocument.findFirst = original; });
  prisma.legalDocument.findFirst = async () => ({ id: 'doc-1', storageKey: null, status: 'ARQUIVADO' });

  await assert.rejects(
    uploadLegalDocumentFile(authenticatedRequest({}, { params: { id: 'doc-1' }, file: pdfFile() }), responseRecorder()),
    (error) => error.statusCode === 409,
  );
});

test('não aprova documento sem arquivo enviado', async (t) => {
  const original = prisma.legalDocument.findFirst;
  t.after(() => { prisma.legalDocument.findFirst = original; });
  prisma.legalDocument.findFirst = async () => ({ id: 'doc-1', status: 'SOLICITADO', storageKey: null });

  await assert.rejects(
    updateLegalDocument(authenticatedRequest({ status: 'APROVADO' }, { params: { id: 'doc-1' } }), responseRecorder()),
    (error) => error.statusCode === 400 && error.details[0].code === 'file_required',
  );
});

test('registra quem analisou e quando ao aprovar o documento', async (t) => {
  const originals = { findFirst: prisma.legalDocument.findFirst, transaction: prisma.$transaction };
  t.after(() => {
    prisma.legalDocument.findFirst = originals.findFirst;
    prisma.$transaction = originals.transaction;
  });

  prisma.legalDocument.findFirst = async () => ({
    id: 'doc-1', status: 'RECEBIDO', storageKey: 'tenant-a/arquivo.pdf', receivedAt: new Date(),
  });
  let updateData;
  let activityPayload;
  prisma.$transaction = transactionStub({
    legalDocument: { update: async ({ data }) => { updateData = data; return { id: 'doc-1', ...data }; } },
    legalActivity: { create: async ({ data }) => { activityPayload = data; return data; } },
  });

  const res = responseRecorder();
  await updateLegalDocument(authenticatedRequest({ status: 'aprovado' }, { params: { id: 'doc-1' } }), res);

  assert.equal(updateData.status, 'APROVADO');
  assert.equal(updateData.reviewedById, 'user-1');
  assert.ok(updateData.reviewedAt instanceof Date);
  assert.equal(activityPayload.payload.fromStatus, 'RECEBIDO');
  assert.equal(activityPayload.payload.toStatus, 'APROVADO');
});

test('recusar exige justificativa registrada', async (t) => {
  const original = prisma.legalDocument.findFirst;
  t.after(() => { prisma.legalDocument.findFirst = original; });
  prisma.legalDocument.findFirst = async () => ({
    id: 'doc-1', status: 'RECEBIDO', storageKey: 'tenant-a/arquivo.pdf', reviewNotes: null,
  });

  await assert.rejects(
    updateLegalDocument(authenticatedRequest({ status: 'RECUSADO' }, { params: { id: 'doc-1' } }), responseRecorder()),
    (error) => error.details[0].code === 'required_for_status',
  );
});

test('download nega documento de outro escritório', async (t) => {
  const original = prisma.legalDocument.findFirst;
  t.after(() => { prisma.legalDocument.findFirst = original; });

  let capturedWhere;
  prisma.legalDocument.findFirst = async ({ where }) => {
    capturedWhere = where;
    return null;
  };

  await assert.rejects(
    downloadLegalDocument(authenticatedRequest({}, { params: { id: 'doc-de-outro' } }), responseRecorder()),
    (error) => error.statusCode === 404,
  );
  assert.equal(capturedWhere.tenantId, 'tenant-a');
});

test('download informa quando o documento ainda não tem arquivo', async (t) => {
  const original = prisma.legalDocument.findFirst;
  t.after(() => { prisma.legalDocument.findFirst = original; });
  prisma.legalDocument.findFirst = async () => ({ id: 'doc-1', storageKey: null });

  await assert.rejects(
    downloadLegalDocument(authenticatedRequest({}, { params: { id: 'doc-1' } }), responseRecorder()),
    (error) => error.statusCode === 409,
  );
});

test('download registra a auditoria e envia o arquivo como anexo', async (t) => {
  const originals = { findFirst: prisma.legalDocument.findFirst, activityCreate: prisma.legalActivity.create };
  t.after(() => {
    prisma.legalDocument.findFirst = originals.findFirst;
    prisma.legalActivity.create = originals.activityCreate;
  });

  const storageKey = 'tenant-a/download.pdf';
  fs.mkdirSync(path.dirname(absolutePathFor(storageKey)), { recursive: true });
  fs.writeFileSync(absolutePathFor(storageKey), '%PDF-1.4 conteudo');

  prisma.legalDocument.findFirst = async () => ({
    id: 'doc-1', storageKey, fileName: 'procuracao.pdf', mimeType: 'application/pdf',
  });
  let activityData;
  prisma.legalActivity.create = async ({ data }) => { activityData = data; return data; };

  const chunks = [];
  const res = responseRecorder();
  res.write = (chunk) => { chunks.push(chunk); return true; };
  res.end = () => { res.finished = true; };
  res.on = () => res;
  res.emit = () => true;
  res.once = () => res;
  res.removeListener = () => res;

  await downloadLegalDocument(authenticatedRequest({}, { params: { id: 'doc-1' } }), res);

  assert.equal(activityData.type, 'document.downloaded');
  assert.equal(activityData.tenantId, 'tenant-a');
  assert.equal(res.headers['Content-Type'], 'application/pdf');
  assert.equal(res.headers['Content-Disposition'], 'attachment; filename="procuracao.pdf"');
  assert.equal(res.headers['Cache-Control'], 'private, no-store');
});
