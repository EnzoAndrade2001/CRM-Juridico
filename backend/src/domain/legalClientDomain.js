const { LegalValidationError, hasOwn, textValue, assignIfPresent } = require('./legalDomain');
const evolutionService = require('../services/evolutionService');

const BRAZILIAN_STATES = Object.freeze([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function isValidCpf(digits) {
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  const checkDigit = (length) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) sum += Number(digits[index]) * (length + 1 - index);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return checkDigit(9) === Number(digits[9]) && checkDigit(10) === Number(digits[10]);
}

function isValidCnpj(digits) {
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
  const checkDigit = (length) => {
    let sum = 0;
    let weight = length - 7;
    for (let index = 0; index < length; index += 1) {
      sum += Number(digits[index]) * weight;
      weight = weight - 1 < 2 ? 9 : weight - 1;
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return checkDigit(12) === Number(digits[12]) && checkDigit(13) === Number(digits[13]);
}

function documentValue(value, field = 'cpfCnpj') {
  if (value === undefined) return undefined;
  if (value === null || String(value).trim() === '') return null;
  const digits = onlyDigits(value);
  if (digits.length === 11 && isValidCpf(digits)) return digits;
  if (digits.length === 14 && isValidCnpj(digits)) return digits;
  throw new LegalValidationError('CPF ou CNPJ inválido', [{ field, code: 'invalid_document' }]);
}

function phoneValue(value, field, { required = false, allowNull = false } = {}) {
  if (value === undefined) {
    if (required) throw new LegalValidationError(`${field} é obrigatório`, [{ field, code: 'required' }]);
    return undefined;
  }
  if (value === null || String(value).trim() === '') {
    if (allowNull) return null;
    throw new LegalValidationError(`${field} é obrigatório`, [{ field, code: 'required' }]);
  }
  const normalized = evolutionService.normalizePhoneNumber(value);
  if (!normalized || onlyDigits(normalized).length < 10) {
    throw new LegalValidationError(`${field} inválido`, [{ field, code: 'invalid_phone' }]);
  }
  return normalized;
}

function emailValue(value, field = 'email') {
  if (value === undefined) return undefined;
  if (value === null || String(value).trim() === '') return null;
  const normalized = String(value).trim().toLocaleLowerCase('pt-BR');
  if (normalized.length > 180 || !EMAIL_PATTERN.test(normalized)) {
    throw new LegalValidationError('E-mail inválido', [{ field, code: 'invalid_email' }]);
  }
  return normalized;
}

function stateValue(value, field = 'state') {
  if (value === undefined) return undefined;
  if (value === null || String(value).trim() === '') return null;
  const normalized = String(value).trim().toUpperCase();
  if (!BRAZILIAN_STATES.includes(normalized)) {
    throw new LegalValidationError('Estado inválido', [{ field, code: 'invalid_state', allowed: BRAZILIAN_STATES }]);
  }
  return normalized;
}

function zipCodeValue(value, field = 'zipCode') {
  if (value === undefined) return undefined;
  if (value === null || String(value).trim() === '') return null;
  const digits = onlyDigits(value);
  if (digits.length !== 8) {
    throw new LegalValidationError('CEP inválido', [{ field, code: 'invalid_zip_code' }]);
  }
  return digits;
}

function buildLegalClientData(payload = {}, { partial = false } = {}) {
  const data = {};
  const required = !partial;
  if (required || hasOwn(payload, 'name')) data.name = textValue(payload.name, 'name', { required, max: 180 });
  if (required || hasOwn(payload, 'phone')) data.phone = phoneValue(payload.phone, 'phone', { required });
  assignIfPresent(data, payload, 'whatsapp', (value) => phoneValue(value, 'whatsapp', { allowNull: true }));
  assignIfPresent(data, payload, 'fantasyName', (value) => textValue(value, 'fantasyName', { allowNull: true, max: 180 }));
  assignIfPresent(data, payload, 'email', (value) => emailValue(value));
  assignIfPresent(data, payload, 'cpfCnpj', (value) => documentValue(value));
  assignIfPresent(data, payload, 'address', (value) => textValue(value, 'address', { allowNull: true, max: 255 }));
  assignIfPresent(data, payload, 'city', (value) => textValue(value, 'city', { allowNull: true, max: 120 }));
  assignIfPresent(data, payload, 'state', (value) => stateValue(value));
  assignIfPresent(data, payload, 'zipCode', (value) => zipCodeValue(value));
  assignIfPresent(data, payload, 'notes', (value) => textValue(value, 'notes', { allowNull: true, max: 5000 }));
  return data;
}

module.exports = {
  BRAZILIAN_STATES,
  onlyDigits,
  isValidCpf,
  isValidCnpj,
  documentValue,
  phoneValue,
  emailValue,
  stateValue,
  zipCodeValue,
  buildLegalClientData,
};
