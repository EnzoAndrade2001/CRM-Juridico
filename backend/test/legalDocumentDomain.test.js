const test = require('node:test');
const assert = require('node:assert/strict');
const { LegalValidationError } = require('../src/domain/legalDomain');
const {
  LEGAL_DOCUMENT_KINDS,
  LEGAL_DOCUMENT_STATUSES,
  buildLegalDocumentData,
  validateLegalDocumentState,
} = require('../src/domain/legalDocumentDomain');

test('monta a solicitação de documento normalizando os enums', () => {
  const data = buildLegalDocumentData({
    matterId: ' matter-1 ',
    title: '  Termo de rescisão  ',
    kind: 'rescisão',
    status: 'em analise',
    dueAt: '2026-08-25T12:00:00.000Z',
    description: 'Enviar as duas vias assinadas.',
  });

  assert.equal(data.matterId, 'matter-1');
  assert.equal(data.title, 'Termo de rescisão');
  assert.equal(data.kind, 'RESCISAO');
  assert.equal(data.status, 'EM_ANALISE');
  assert.ok(data.dueAt instanceof Date);
});

test('exige título e ao menos um vínculo jurídico', () => {
  assert.throws(() => buildLegalDocumentData({ contactId: 'contact-1' }), LegalValidationError);
  assert.throws(() => buildLegalDocumentData({ title: 'Documento solto' }), LegalValidationError);
  assert.doesNotThrow(() => buildLegalDocumentData({ title: 'Procuração', leadId: 'lead-1' }));
});

test('recusa tipo e situação fora da lista do domínio', () => {
  assert.throws(
    () => buildLegalDocumentData({ title: 'Doc', contactId: 'c-1', kind: 'FOTO_DO_CACHORRO' }),
    LegalValidationError,
  );
  assert.throws(
    () => buildLegalDocumentData({ title: 'Doc', contactId: 'c-1', status: 'PERDIDO' }),
    LegalValidationError,
  );
});

test('impede analisar um documento que ainda não tem arquivo', () => {
  for (const status of ['RECEBIDO', 'EM_ANALISE', 'APROVADO']) {
    assert.throws(
      () => validateLegalDocumentState({ status }, { hasFile: false }),
      LegalValidationError,
      `${status} deveria exigir arquivo`,
    );
    assert.doesNotThrow(() => validateLegalDocumentState({ status }, { hasFile: true }));
  }
});

test('permite solicitar e arquivar sem arquivo enviado', () => {
  assert.doesNotThrow(() => validateLegalDocumentState({ status: 'SOLICITADO' }, { hasFile: false }));
  assert.doesNotThrow(() => validateLegalDocumentState({ status: 'ARQUIVADO' }, { hasFile: false }));
});

test('exige justificativa registrada para recusar um documento', () => {
  assert.throws(
    () => validateLegalDocumentState({ status: 'RECUSADO' }, { hasFile: true }),
    LegalValidationError,
  );
  assert.doesNotThrow(
    () => validateLegalDocumentState({ status: 'RECUSADO', reviewNotes: 'Ilegível.' }, { hasFile: true }),
  );
});

test('atualização parcial não reintroduz campos obrigatórios', () => {
  const data = buildLegalDocumentData({ status: 'aprovado' }, { partial: true });
  assert.deepEqual(data, { status: 'APROVADO' });
});

test('permite desvincular oportunidade e caso com null', () => {
  const data = buildLegalDocumentData({ leadId: null, matterId: null }, { partial: true });
  assert.deepEqual(data, { leadId: null, matterId: null });
});

test('o catálogo de tipos e situações cobre o fluxo do escritório', () => {
  assert.ok(LEGAL_DOCUMENT_KINDS.includes('PROCURACAO'));
  assert.ok(LEGAL_DOCUMENT_KINDS.includes('OUTRO'));
  assert.deepEqual(
    LEGAL_DOCUMENT_STATUSES,
    ['SOLICITADO', 'RECEBIDO', 'EM_ANALISE', 'APROVADO', 'RECUSADO', 'ARQUIVADO'],
  );
});
