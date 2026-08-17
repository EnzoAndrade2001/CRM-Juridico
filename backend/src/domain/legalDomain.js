class LegalValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'LegalValidationError';
    this.statusCode = 400;
    this.details = details;
  }
}

const LEGAL_AREAS = Object.freeze([
  'CIVEL',
  'TRABALHISTA',
  'FAMILIA',
  'PREVIDENCIARIO',
  'SUCESSOES',
  'CONSUMIDOR',
  'EMPRESARIAL',
  'OUTRO',
]);

const LEGAL_LEAD_STAGES = Object.freeze([
  'NOVO_CONTATO',
  'QUALIFICACAO_IA',
  'AGUARDANDO_DOCUMENTOS',
  'ANALISE_HUMANA',
  'CONSULTA_AGENDADA',
  'PROPOSTA_ENVIADA',
  'CONTRATADO',
  'NAO_CONVERTIDO',
]);

const LEGAL_PRIORITIES = Object.freeze(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE']);
const LEGAL_MATTER_STATUSES = Object.freeze(['TRIAGEM', 'ATIVO', 'SUSPENSO', 'ENCERRADO', 'ARQUIVADO']);
const LEGAL_TASK_TYPES = Object.freeze(['PROXIMA_ACAO', 'PRAZO', 'AUDIENCIA', 'DOCUMENTO', 'RETORNO', 'OUTRO']);
const LEGAL_TASK_STATUSES = Object.freeze(['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA']);

function hasOwn(payload, field) {
  return Object.prototype.hasOwnProperty.call(payload || {}, field);
}

function normalizedEnumToken(value) {
  return String(value)
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function enumValue(value, field, allowed, { required = false, allowNull = false } = {}) {
  if (value === undefined) {
    if (required) throw new LegalValidationError(`${field} é obrigatório`, [{ field, code: 'required' }]);
    return undefined;
  }
  if (value === null || String(value).trim() === '') {
    if (allowNull) return null;
    throw new LegalValidationError(`${field} é obrigatório`, [{ field, code: 'required' }]);
  }
  const normalized = normalizedEnumToken(value);
  if (!allowed.includes(normalized)) {
    throw new LegalValidationError(`${field} inválido`, [{ field, code: 'invalid_enum', allowed }]);
  }
  return normalized;
}

function textValue(value, field, { required = false, allowNull = false, max = 255 } = {}) {
  if (value === undefined) {
    if (required) throw new LegalValidationError(`${field} é obrigatório`, [{ field, code: 'required' }]);
    return undefined;
  }
  if (value === null) {
    if (allowNull) return null;
    throw new LegalValidationError(`${field} é obrigatório`, [{ field, code: 'required' }]);
  }
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new LegalValidationError(`${field} deve ser um texto`, [{ field, code: 'invalid_type' }]);
  }
  const normalized = String(value).trim();
  if (!normalized) {
    if (allowNull) return null;
    if (required) throw new LegalValidationError(`${field} é obrigatório`, [{ field, code: 'required' }]);
    return undefined;
  }
  if (normalized.length > max) {
    throw new LegalValidationError(`${field} excede ${max} caracteres`, [{ field, code: 'max_length', max }]);
  }
  return normalized;
}

function dateValue(value, field, { allowNull = true } = {}) {
  if (value === undefined) return undefined;
  if (value === null || value === '') {
    if (allowNull) return null;
    throw new LegalValidationError(`${field} é obrigatório`, [{ field, code: 'required' }]);
  }
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new LegalValidationError(`${field} deve ser uma data válida`, [{ field, code: 'invalid_date' }]);
  }
  return parsed;
}

function jsonObjectValue(value, field) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new LegalValidationError(`${field} deve ser um objeto JSON`, [{ field, code: 'invalid_json_object' }]);
  }
  return value;
}

function assignIfPresent(target, payload, field, parser) {
  if (hasOwn(payload, field)) target[field] = parser(payload[field]);
}

function buildLegalLeadData(payload = {}, { partial = false } = {}) {
  const data = {};
  const required = !partial;
  if (required || hasOwn(payload, 'contactId')) data.contactId = textValue(payload.contactId, 'contactId', { required, max: 80 });
  if (required || hasOwn(payload, 'title')) data.title = textValue(payload.title, 'title', { required, max: 180 });
  if (required || hasOwn(payload, 'area')) data.area = enumValue(payload.area, 'area', LEGAL_AREAS, { required });
  assignIfPresent(data, payload, 'ticketId', (value) => textValue(value, 'ticketId', { allowNull: true, max: 80 }));
  assignIfPresent(data, payload, 'assignedUserId', (value) => textValue(value, 'assignedUserId', { allowNull: true, max: 80 }));
  assignIfPresent(data, payload, 'stage', (value) => enumValue(value, 'stage', LEGAL_LEAD_STAGES));
  assignIfPresent(data, payload, 'urgency', (value) => enumValue(value, 'urgency', LEGAL_PRIORITIES));
  assignIfPresent(data, payload, 'source', (value) => textValue(value, 'source', { max: 80 }));
  assignIfPresent(data, payload, 'summary', (value) => textValue(value, 'summary', { allowNull: true, max: 10000 }));
  assignIfPresent(data, payload, 'qualification', (value) => jsonObjectValue(value, 'qualification'));
  assignIfPresent(data, payload, 'nextActionAt', (value) => dateValue(value, 'nextActionAt'));
  assignIfPresent(data, payload, 'lostReason', (value) => textValue(value, 'lostReason', { allowNull: true, max: 2000 }));
  return data;
}

function validateLegalLeadState(data) {
  if (data.stage === 'NAO_CONVERTIDO' && !data.lostReason) {
    throw new LegalValidationError('lostReason é obrigatório para oportunidades não convertidas', [
      { field: 'lostReason', code: 'required_for_stage' },
    ]);
  }
  return data;
}

function buildLegalMatterData(payload = {}, { partial = false } = {}) {
  const data = {};
  const required = !partial;
  if (required || hasOwn(payload, 'title')) data.title = textValue(payload.title, 'title', { required, max: 180 });
  if (required || hasOwn(payload, 'area')) data.area = enumValue(payload.area, 'area', LEGAL_AREAS, { required });
  assignIfPresent(data, payload, 'leadId', (value) => textValue(value, 'leadId', { allowNull: true, max: 80 }));
  assignIfPresent(data, payload, 'contactId', (value) => textValue(value, 'contactId', { allowNull: partial, required: !partial, max: 80 }));
  assignIfPresent(data, payload, 'responsibleUserId', (value) => textValue(value, 'responsibleUserId', { allowNull: true, max: 80 }));
  assignIfPresent(data, payload, 'status', (value) => enumValue(value, 'status', LEGAL_MATTER_STATUSES));
  assignIfPresent(data, payload, 'description', (value) => textValue(value, 'description', { allowNull: true, max: 10000 }));
  assignIfPresent(data, payload, 'caseNumber', (value) => textValue(value, 'caseNumber', { allowNull: true, max: 80 }));
  assignIfPresent(data, payload, 'court', (value) => textValue(value, 'court', { allowNull: true, max: 180 }));
  assignIfPresent(data, payload, 'opposingParty', (value) => textValue(value, 'opposingParty', { allowNull: true, max: 180 }));
  assignIfPresent(data, payload, 'openedAt', (value) => dateValue(value, 'openedAt', { allowNull: false }));
  assignIfPresent(data, payload, 'closedAt', (value) => dateValue(value, 'closedAt'));
  if (required && !data.contactId && !data.leadId) {
    throw new LegalValidationError('contactId ou leadId é obrigatório', [{ field: 'contactId', code: 'required_reference' }]);
  }
  return data;
}

function validateLegalMatterState(data) {
  if (data.closedAt && !['ENCERRADO', 'ARQUIVADO'].includes(data.status)) {
    throw new LegalValidationError('closedAt só pode ser informado em casos encerrados ou arquivados', [
      { field: 'closedAt', code: 'invalid_for_status' },
    ]);
  }
  return data;
}

function buildLegalTaskData(payload = {}, { partial = false } = {}) {
  const data = {};
  const required = !partial;
  if (required || hasOwn(payload, 'title')) data.title = textValue(payload.title, 'title', { required, max: 180 });
  assignIfPresent(data, payload, 'leadId', (value) => textValue(value, 'leadId', { allowNull: true, max: 80 }));
  assignIfPresent(data, payload, 'matterId', (value) => textValue(value, 'matterId', { allowNull: true, max: 80 }));
  assignIfPresent(data, payload, 'assigneeId', (value) => textValue(value, 'assigneeId', { allowNull: true, max: 80 }));
  assignIfPresent(data, payload, 'description', (value) => textValue(value, 'description', { allowNull: true, max: 5000 }));
  assignIfPresent(data, payload, 'type', (value) => enumValue(value, 'type', LEGAL_TASK_TYPES));
  assignIfPresent(data, payload, 'priority', (value) => enumValue(value, 'priority', LEGAL_PRIORITIES));
  assignIfPresent(data, payload, 'status', (value) => enumValue(value, 'status', LEGAL_TASK_STATUSES));
  assignIfPresent(data, payload, 'dueAt', (value) => dateValue(value, 'dueAt'));
  assignIfPresent(data, payload, 'completedAt', (value) => dateValue(value, 'completedAt'));
  if (required && !data.leadId && !data.matterId) {
    throw new LegalValidationError('leadId ou matterId é obrigatório', [{ field: 'leadId', code: 'required_reference' }]);
  }
  return data;
}

function validateLegalTaskState(data) {
  if (!data.leadId && !data.matterId) {
    throw new LegalValidationError('A tarefa deve estar vinculada a uma oportunidade ou caso', [
      { field: 'leadId', code: 'required_reference' },
    ]);
  }
  return data;
}

function paginationFromQuery(query = {}) {
  const parsedPage = Number.parseInt(query.page, 10);
  const parsedLimit = Number.parseInt(query.limit, 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 25;
  return { page, limit, skip: (page - 1) * limit };
}

module.exports = {
  LegalValidationError,
  LEGAL_AREAS,
  LEGAL_LEAD_STAGES,
  LEGAL_PRIORITIES,
  LEGAL_MATTER_STATUSES,
  LEGAL_TASK_TYPES,
  LEGAL_TASK_STATUSES,
  normalizedEnumToken,
  buildLegalLeadData,
  validateLegalLeadState,
  buildLegalMatterData,
  validateLegalMatterState,
  buildLegalTaskData,
  validateLegalTaskState,
  paginationFromQuery,
};
