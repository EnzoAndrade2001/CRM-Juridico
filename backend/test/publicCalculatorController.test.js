const test = require('node:test');
const assert = require('node:assert/strict');

const prisma = require('../src/lib/prisma');
const evolutionService = require('../src/services/evolutionService');
const { createCalculatorSubmission } = require('../src/controllers/publicCalculatorController');

function responseRecorder() {
  return {
    statusCode: 200,
    payload: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
}

test('calculadora cria contato, registra origem/tag e envia pelo WhatsApp conectado', async (t) => {
  const originals = {
    tenantFindUnique: prisma.tenant.findUnique,
    submissionCreate: prisma.calculatorSubmission.create,
    submissionUpdate: prisma.calculatorSubmission.update,
    tagFindFirst: prisma.tag.findFirst,
    tagCreate: prisma.tag.create,
    contactFindFirst: prisma.contact.findFirst,
    contactFindMany: prisma.contact.findMany,
    contactCreate: prisma.contact.create,
    ticketFindFirst: prisma.ticket.findFirst,
    ticketCreate: prisma.ticket.create,
    ticketUpdate: prisma.ticket.update,
    messageFindFirst: prisma.message.findFirst,
    messageCreate: prisma.message.create,
    messageUpdate: prisma.message.update,
    messageDelete: prisma.message.delete,
    sendText: evolutionService.sendText,
    tenantSlug: process.env.PUBLIC_CALCULATOR_TENANT_SLUG,
  };
  t.after(() => {
    prisma.tenant.findUnique = originals.tenantFindUnique;
    prisma.calculatorSubmission.create = originals.submissionCreate;
    prisma.calculatorSubmission.update = originals.submissionUpdate;
    prisma.tag.findFirst = originals.tagFindFirst;
    prisma.tag.create = originals.tagCreate;
    prisma.contact.findFirst = originals.contactFindFirst;
    prisma.contact.findMany = originals.contactFindMany;
    prisma.contact.create = originals.contactCreate;
    prisma.ticket.findFirst = originals.ticketFindFirst;
    prisma.ticket.create = originals.ticketCreate;
    prisma.ticket.update = originals.ticketUpdate;
    prisma.message.findFirst = originals.messageFindFirst;
    prisma.message.create = originals.messageCreate;
    prisma.message.update = originals.messageUpdate;
    prisma.message.delete = originals.messageDelete;
    evolutionService.sendText = originals.sendText;
    if (originals.tenantSlug === undefined) delete process.env.PUBLIC_CALCULATOR_TENANT_SLUG;
    else process.env.PUBLIC_CALCULATOR_TENANT_SLUG = originals.tenantSlug;
  });

  process.env.PUBLIC_CALCULATOR_TENANT_SLUG = 'eduarda';
  let submissionData;
  let updatedData;
  let contactData;
  let sentMessage;
  let ticketData;
  let messageData;
  let messageUpdateData;

  prisma.tenant.findUnique = async () => ({
    id: 'tenant-eduarda',
    settings: { evolutionUrl: 'https://evolution.test', evolutionKey: 'key' },
    instances: [{ id: 'instance-lund', instanceName: 'LUND', status: 'CONNECTED' }],
  });
  prisma.calculatorSubmission.create = async ({ data }) => {
    submissionData = data;
    return { id: 'submission-1', ...data };
  };
  prisma.calculatorSubmission.update = async ({ data }) => {
    updatedData = data;
    return { id: 'submission-1', ...submissionData, ...data };
  };
  prisma.tag.findFirst = async () => null;
  prisma.tag.create = async ({ data }) => data;
  prisma.contact.findFirst = async () => null;
  prisma.contact.findMany = async () => [];
  prisma.contact.create = async ({ data }) => {
    contactData = data;
    return { id: 'contact-1', ...data };
  };
  prisma.ticket.findFirst = async () => null;
  prisma.ticket.create = async ({ data }) => {
    ticketData = data;
    return { id: 'ticket-1', ...data };
  };
  prisma.message.findFirst = async () => null;
  prisma.message.create = async ({ data }) => {
    messageData = data;
    return { id: 'message-1', ...data };
  };
  prisma.message.update = async ({ data }) => {
    messageUpdateData = data;
    return { id: 'message-1', ...messageData, ...data };
  };
  evolutionService.sendText = async (_url, _key, instanceName, phone, message) => {
    sentMessage = { instanceName, phone, message };
    return { key: { id: 'message-1' } };
  };

  const req = {
    headers: { 'x-forwarded-for': 'calculator-test-1' },
    body: {
      source: 'revisional-bancario',
      name: 'Maria Aparecida Silva',
      phone: '(51) 99999-8888',
      financing: 50000,
      installment: 1250,
      totalInstallments: 48,
      paidInstallments: 12,
      bank: 'Banco do Brasil',
      contractType: 'Financiamento veicular',
      consent: true,
    },
    ip: 'calculator-test-1',
    socket: {},
  };
  const res = responseRecorder();

  await createCalculatorSubmission(req, res);

  assert.equal(res.statusCode, 202);
  assert.equal(res.payload.stored, true);
  assert.equal(res.payload.source, 'landing:revisional-bancario');
  assert.equal(res.payload.tag, 'VEIO PELA LANDING PAGE REVISAO BANCARIA');
  assert.equal(res.payload.contactCreated, true);
  assert.equal(res.payload.contactId, 'contact-1');
  assert.equal(submissionData.source, 'landing:revisional-bancario');
  assert.equal(contactData.externalSource, 'landing:revisional-bancario');
  assert.deepEqual(JSON.parse(contactData.tags), ['VEIO PELA LANDING PAGE REVISAO BANCARIA']);
  assert.equal(sentMessage.instanceName, 'LUND');
  assert.equal(sentMessage.phone, '5551999998888');
  assert.match(sentMessage.message, /preencheu a calculadora de revisão bancária/);
  assert.equal(updatedData.status, 'partial');
  assert.equal(res.payload.notifications.whatsapp, 'sent');
  assert.equal(res.payload.notifications.crm, 'sent');
  assert.equal(ticketData.status, 'pending');
  assert.equal(messageData.ticketId, 'ticket-1');
  assert.equal(messageData.fromBot, true);
  assert.equal(messageData.fromMe, true);
  assert.equal(messageData.externalId, null);
  assert.equal(messageUpdateData.externalId, 'message-1');
});

test('calculadora recusa origem que não foi autorizada pelo backend', async () => {
  const req = {
    headers: { 'x-forwarded-for': 'calculator-test-invalid-source' },
    body: {
      source: 'site-desconhecido',
      name: 'Origem inválida',
      installment: 100,
      totalInstallments: 12,
      consent: true,
    },
    ip: 'calculator-test-invalid-source',
    socket: {},
  };
  const res = responseRecorder();

  await createCalculatorSubmission(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.payload.stored, false);
  assert.match(res.payload.error, /Origem da landing page não reconhecida/);
});
