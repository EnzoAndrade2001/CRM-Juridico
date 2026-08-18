const test = require('node:test');
const assert = require('node:assert/strict');
const { LegalValidationError } = require('../src/domain/legalDomain');
const {
  buildLegalClientData,
  documentValue,
  emailValue,
  stateValue,
  zipCodeValue,
} = require('../src/domain/legalClientDomain');

test('normaliza os dados cadastrais do cliente jurídico', () => {
  const data = buildLegalClientData({
    name: '  Maria Aparecida Silva ',
    phone: '(11) 99999-8888',
    email: '  MARIA@Escritorio.COM ',
    cpfCnpj: '529.982.247-25',
    city: 'São Paulo',
    state: 'sp',
    zipCode: '01310-100',
    notes: ' Cliente indicada pelo Dr. Paulo. ',
  });

  assert.equal(data.name, 'Maria Aparecida Silva');
  assert.equal(data.phone, '5511999998888');
  assert.equal(data.email, 'maria@escritorio.com');
  assert.equal(data.cpfCnpj, '52998224725');
  assert.equal(data.state, 'SP');
  assert.equal(data.zipCode, '01310100');
  assert.equal(data.notes, 'Cliente indicada pelo Dr. Paulo.');
});

test('exige nome e telefone no cadastro completo', () => {
  assert.throws(() => buildLegalClientData({ phone: '11999998888' }), LegalValidationError);
  assert.throws(() => buildLegalClientData({ name: 'Cliente sem telefone' }), LegalValidationError);
});

test('aceita atualização parcial sem exigir os campos obrigatórios', () => {
  const data = buildLegalClientData({ city: 'Campinas' }, { partial: true });
  assert.deepEqual(data, { city: 'Campinas' });
});

test('permite limpar campos opcionais com null', () => {
  const data = buildLegalClientData({ email: null, cpfCnpj: '', notes: null }, { partial: true });
  assert.deepEqual(data, { email: null, cpfCnpj: null, notes: null });
});

test('recusa documentos com dígitos verificadores inválidos', () => {
  assert.throws(() => documentValue('111.111.111-11'), LegalValidationError);
  assert.throws(() => documentValue('12345678901234'), LegalValidationError);
  assert.equal(documentValue('11.222.333/0001-81'), '11222333000181');
});

test('recusa e-mail, estado e CEP fora do formato esperado', () => {
  assert.throws(() => emailValue('maria@escritorio'), LegalValidationError);
  assert.throws(() => stateValue('XX'), LegalValidationError);
  assert.throws(() => zipCodeValue('1234'), LegalValidationError);
});

test('recusa telefone sem dígitos suficientes', () => {
  assert.throws(() => buildLegalClientData({ name: 'Cliente', phone: '123' }), LegalValidationError);
});
