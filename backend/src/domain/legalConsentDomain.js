const {
  LegalValidationError,
  hasOwn,
  textValue,
  enumValue,
  dateValue,
  assignIfPresent,
} = require('./legalDomain');

const CONSENT_PURPOSES = Object.freeze([
  'ATENDIMENTO',
  'CAMPANHA_WHATSAPP',
  'MARKETING',
  'ARMAZENAMENTO_DOCUMENTOS',
  'COMPARTILHAMENTO_PARCEIROS',
]);

const CONSENT_STATUSES = Object.freeze(['CONCEDIDO', 'NEGADO', 'REVOGADO', 'EXPIRADO']);

const CONSENT_BASES = Object.freeze([
  'CONSENTIMENTO',
  'EXECUCAO_CONTRATO',
  'OBRIGACAO_LEGAL',
  'EXERCICIO_DIREITOS',
  'LEGITIMO_INTERESSE',
]);

const CONSENT_CHANNELS = Object.freeze(['whatsapp', 'presencial', 'site', 'telefone', 'email', 'contrato']);

// Finalidades que só podem ser exercidas com consentimento vigente do titular.
// As demais bases legais da LGPD não substituem o consentimento para envio ativo.
const PURPOSES_REQUIRING_CONSENT = Object.freeze(['CAMPANHA_WHATSAPP', 'MARKETING', 'COMPARTILHAMENTO_PARCEIROS']);

function buildConsentData(payload = {}, { partial = false } = {}) {
  const data = {};
  const required = !partial;
  if (required || hasOwn(payload, 'contactId')) {
    data.contactId = textValue(payload.contactId, 'contactId', { required, max: 80 });
  }
  if (required || hasOwn(payload, 'purpose')) {
    data.purpose = enumValue(payload.purpose, 'purpose', CONSENT_PURPOSES, { required });
  }
  assignIfPresent(data, payload, 'status', (value) => enumValue(value, 'status', CONSENT_STATUSES));
  assignIfPresent(data, payload, 'basis', (value) => enumValue(value, 'basis', CONSENT_BASES));
  assignIfPresent(data, payload, 'channel', (value) => channelValue(value));
  assignIfPresent(data, payload, 'evidence', (value) => textValue(value, 'evidence', { allowNull: true, max: 5000 }));
  assignIfPresent(data, payload, 'documentId', (value) => textValue(value, 'documentId', { allowNull: true, max: 80 }));
  assignIfPresent(data, payload, 'grantedAt', (value) => dateValue(value, 'grantedAt', { allowNull: false }));
  assignIfPresent(data, payload, 'expiresAt', (value) => dateValue(value, 'expiresAt'));
  return data;
}

function channelValue(value, field = 'channel') {
  const normalized = textValue(value, field, { max: 40 });
  if (normalized === undefined || normalized === null) return normalized;
  const lowered = normalized.toLocaleLowerCase('pt-BR');
  if (!CONSENT_CHANNELS.includes(lowered)) {
    throw new LegalValidationError('channel inválido', [
      { field, code: 'invalid_enum', allowed: CONSENT_CHANNELS },
    ]);
  }
  return lowered;
}

// Um registro só vale se foi concedido, não foi revogado e não venceu.
function isConsentActive(record, now = new Date()) {
  if (!record || record.status !== 'CONCEDIDO') return false;
  if (record.revokedAt && new Date(record.revokedAt) <= now) return false;
  if (record.expiresAt && new Date(record.expiresAt) <= now) return false;
  if (record.grantedAt && new Date(record.grantedAt) > now) return false;
  return true;
}

// A situação apresentada leva o vencimento em conta sem depender de rotina noturna.
function effectiveStatus(record, now = new Date()) {
  if (!record) return null;
  if (record.status === 'CONCEDIDO' && record.expiresAt && new Date(record.expiresAt) <= now) return 'EXPIRADO';
  return record.status;
}

// Para cada finalidade vale o registro mais recente por data de concessão.
function summarizeConsents(records = [], now = new Date()) {
  const latestByPurpose = new Map();
  for (const record of records) {
    const current = latestByPurpose.get(record.purpose);
    const isNewer = !current || new Date(record.grantedAt) > new Date(current.grantedAt)
      || (new Date(record.grantedAt).getTime() === new Date(current.grantedAt).getTime()
        && new Date(record.createdAt || 0) > new Date(current.createdAt || 0));
    if (isNewer) latestByPurpose.set(record.purpose, record);
  }
  return CONSENT_PURPOSES.reduce((summary, purpose) => {
    const record = latestByPurpose.get(purpose) || null;
    return {
      ...summary,
      [purpose]: {
        allowed: isConsentActive(record, now),
        status: effectiveStatus(record, now),
        recordId: record?.id || null,
        grantedAt: record?.grantedAt || null,
        expiresAt: record?.expiresAt || null,
      },
    };
  }, {});
}

function validateRevocation(payload = {}) {
  const reason = textValue(payload.reason ?? payload.revokeReason, 'revokeReason', { max: 2000 });
  if (!reason) {
    throw new LegalValidationError('revokeReason é obrigatório para revogar um consentimento', [
      { field: 'revokeReason', code: 'required' },
    ]);
  }
  const revokedAt = dateValue(payload.revokedAt, 'revokedAt', { allowNull: false });
  return { revokeReason: reason, revokedAt: revokedAt || new Date() };
}

module.exports = {
  CONSENT_PURPOSES,
  CONSENT_STATUSES,
  CONSENT_BASES,
  CONSENT_CHANNELS,
  PURPOSES_REQUIRING_CONSENT,
  buildConsentData,
  channelValue,
  isConsentActive,
  effectiveStatus,
  summarizeConsents,
  validateRevocation,
};
