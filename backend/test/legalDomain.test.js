const test = require('node:test');
const assert = require('node:assert/strict');
const {
  LegalValidationError,
  normalizedEnumToken,
  buildLegalLeadData,
  validateLegalLeadState,
  buildLegalMatterData,
  validateLegalMatterState,
  buildLegalTaskData,
  validateLegalTaskState,
  paginationFromQuery,
} = require('../src/domain/legalDomain');

test('normaliza valores amigáveis para os enums da API', () => {
  assert.equal(normalizedEnumToken('Cível'), 'CIVEL');
  assert.equal(normalizedEnumToken('Qualificação IA'), 'QUALIFICACAO_IA');
  assert.equal(normalizedEnumToken('em-andamento'), 'EM_ANDAMENTO');
});

test('monta uma oportunidade jurídica válida e normalizada', () => {
  const data = buildLegalLeadData({
    contactId: ' contact-1 ',
    title: ' Rescisão trabalhista ',
    area: 'Trabalhista',
    urgency: 'alta',
    stage: 'Qualificação IA',
    nextActionAt: '2026-08-18T14:00:00.000Z',
    qualification: { employmentYears: 3 },
  });

  assert.equal(data.contactId, 'contact-1');
  assert.equal(data.title, 'Rescisão trabalhista');
  assert.equal(data.area, 'TRABALHISTA');
  assert.equal(data.urgency, 'ALTA');
  assert.equal(data.stage, 'QUALIFICACAO_IA');
  assert.ok(data.nextActionAt instanceof Date);
  assert.deepEqual(data.qualification, { employmentYears: 3 });
});

test('rejeita oportunidade sem os campos mínimos', () => {
  assert.throws(
    () => buildLegalLeadData({ title: 'Caso sem contato', area: 'CIVEL' }),
    (error) => error instanceof LegalValidationError && error.details[0].field === 'contactId'
  );
});

test('exige motivo quando a oportunidade não foi convertida', () => {
  assert.throws(
    () => validateLegalLeadState({ stage: 'NAO_CONVERTIDO', lostReason: null }),
    /lostReason é obrigatório/
  );
  assert.doesNotThrow(() => validateLegalLeadState({
    stage: 'NAO_CONVERTIDO',
    lostReason: 'Cliente não deseja prosseguir',
  }));
});

test('aceita criação de caso a partir de uma oportunidade', () => {
  const data = buildLegalMatterData({
    leadId: 'lead-1',
    title: 'Análise de verbas rescisórias',
    area: 'Trabalhista',
    responsibleUserId: null,
  });
  assert.equal(data.leadId, 'lead-1');
  assert.equal(data.contactId, undefined);
  assert.equal(data.area, 'TRABALHISTA');
});

test('não permite data de encerramento em caso ativo', () => {
  assert.throws(
    () => validateLegalMatterState({ status: 'ATIVO', closedAt: new Date() }),
    /closedAt só pode ser informado/
  );
});

test('tarefa precisa estar vinculada a caso ou oportunidade', () => {
  assert.throws(
    () => buildLegalTaskData({ title: 'Retornar cliente' }),
    /leadId ou matterId é obrigatório/
  );
  assert.throws(
    () => validateLegalTaskState({ title: 'Sem vínculo', leadId: null, matterId: null }),
    /deve estar vinculada/
  );
});

test('atualização parcial inclui apenas campos enviados', () => {
  const data = buildLegalTaskData({ status: 'concluída', description: null }, { partial: true });
  assert.deepEqual(data, { status: 'CONCLUIDA', description: null });
});

test('paginação aplica padrões e limita consultas excessivas', () => {
  assert.deepEqual(paginationFromQuery({}), { page: 1, limit: 25, skip: 0 });
  assert.deepEqual(paginationFromQuery({ page: '3', limit: '500' }), { page: 3, limit: 100, skip: 200 });
  assert.deepEqual(paginationFromQuery({ page: '-1', limit: 'x' }), { page: 1, limit: 25, skip: 0 });
});
