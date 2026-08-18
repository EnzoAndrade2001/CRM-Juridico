const {
  LegalValidationError,
  hasOwn,
  textValue,
  enumValue,
  dateValue,
  assignIfPresent,
} = require('./legalDomain');

const LEGAL_DOCUMENT_KINDS = Object.freeze([
  'IDENTIDADE',
  'COMPROVANTE_RESIDENCIA',
  'COMPROVANTE_RENDA',
  'CONTRATO',
  'PROCURACAO',
  'RESCISAO',
  'DECISAO_JUDICIAL',
  'LAUDO',
  'COMPROVANTE_PAGAMENTO',
  'OUTRO',
]);

const LEGAL_DOCUMENT_STATUSES = Object.freeze([
  'SOLICITADO',
  'RECEBIDO',
  'EM_ANALISE',
  'APROVADO',
  'RECUSADO',
  'ARQUIVADO',
]);

// Situações que só podem ser alcançadas depois que o arquivo existe.
const STATUSES_REQUIRING_FILE = Object.freeze(['RECEBIDO', 'EM_ANALISE', 'APROVADO']);
const REVIEW_STATUSES = Object.freeze(['APROVADO', 'RECUSADO']);

function buildLegalDocumentData(payload = {}, { partial = false } = {}) {
  const data = {};
  const required = !partial;
  if (required || hasOwn(payload, 'title')) data.title = textValue(payload.title, 'title', { required, max: 180 });
  assignIfPresent(data, payload, 'contactId', (value) => textValue(value, 'contactId', { max: 80 }));
  assignIfPresent(data, payload, 'leadId', (value) => textValue(value, 'leadId', { allowNull: true, max: 80 }));
  assignIfPresent(data, payload, 'matterId', (value) => textValue(value, 'matterId', { allowNull: true, max: 80 }));
  assignIfPresent(data, payload, 'kind', (value) => enumValue(value, 'kind', LEGAL_DOCUMENT_KINDS));
  assignIfPresent(data, payload, 'status', (value) => enumValue(value, 'status', LEGAL_DOCUMENT_STATUSES));
  assignIfPresent(data, payload, 'description', (value) => textValue(value, 'description', { allowNull: true, max: 5000 }));
  assignIfPresent(data, payload, 'source', (value) => textValue(value, 'source', { max: 40 }));
  assignIfPresent(data, payload, 'reviewNotes', (value) => textValue(value, 'reviewNotes', { allowNull: true, max: 5000 }));
  assignIfPresent(data, payload, 'dueAt', (value) => dateValue(value, 'dueAt'));

  if (required && !data.contactId && !data.leadId && !data.matterId) {
    throw new LegalValidationError('contactId, leadId ou matterId é obrigatório', [
      { field: 'contactId', code: 'required_reference' },
    ]);
  }
  return data;
}

// Regras de transição: o documento precisa existir antes de ser analisado e a recusa
// precisa de justificativa registrada para o escritório.
function validateLegalDocumentState(state, { hasFile }) {
  if (STATUSES_REQUIRING_FILE.includes(state.status) && !hasFile) {
    throw new LegalValidationError('O arquivo precisa ser enviado antes desta situação', [
      { field: 'status', code: 'file_required', allowed: STATUSES_REQUIRING_FILE },
    ]);
  }
  if (state.status === 'RECUSADO' && !state.reviewNotes) {
    throw new LegalValidationError('reviewNotes é obrigatório para recusar um documento', [
      { field: 'reviewNotes', code: 'required_for_status' },
    ]);
  }
  return state;
}

module.exports = {
  LEGAL_DOCUMENT_KINDS,
  LEGAL_DOCUMENT_STATUSES,
  STATUSES_REQUIRING_FILE,
  REVIEW_STATUSES,
  buildLegalDocumentData,
  validateLegalDocumentState,
};
