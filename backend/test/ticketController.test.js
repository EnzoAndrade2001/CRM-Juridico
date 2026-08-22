const test = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../src/lib/prisma');
const { list, resolve } = require('../src/controllers/ticketController');

function responseRecorder() {
  return {
    statusCode: 200,
    payload: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
}

test('ticket list returns the linked legal opportunity summary', async (t) => {
  const originalFindMany = prisma.ticket.findMany;
  const originalCount = prisma.ticket.count;
  const originalGroupBy = prisma.ticket.groupBy;
  t.after(() => {
    prisma.ticket.findMany = originalFindMany;
    prisma.ticket.count = originalCount;
    prisma.ticket.groupBy = originalGroupBy;
  });

  let capturedInclude;
  prisma.ticket.findMany = async ({ include }) => {
    if (include) capturedInclude = include;
    return [];
  };
  prisma.ticket.count = async () => 0;
  prisma.ticket.groupBy = async () => [];

  const req = {
    query: {},
    user: { userId: 'user-1', tenantId: 'tenant-a' },
  };
  const res = responseRecorder();
  await list(req, res);

  assert.ok(capturedInclude.legalLead);
  assert.deepEqual(capturedInclude.legalLead.select.matter.select, {
    id: true,
    title: true,
    status: true,
    caseNumber: true,
  });
  assert.equal(res.payload.counts.all, 0);
  assert.equal(res.payload.counts.resolved, 0);
});

test('concluidos exibem apenas o atendimento mais recente de cada contato', async (t) => {
  const originals = {
    findMany: prisma.ticket.findMany,
    count: prisma.ticket.count,
    groupBy: prisma.ticket.groupBy,
  };
  t.after(() => {
    prisma.ticket.findMany = originals.findMany;
    prisma.ticket.count = originals.count;
    prisma.ticket.groupBy = originals.groupBy;
  });

  prisma.ticket.findMany = async () => [
    { id: 'ticket-old', contactId: 'contact-1', status: 'resolved', updatedAt: new Date('2026-08-20T10:00:00Z'), lastMessageAt: new Date('2026-08-20T10:00:00Z'), contact: { id: 'contact-1', phone: '5551999999999' } },
    { id: 'ticket-latest', contactId: 'contact-legacy', status: 'resolved', updatedAt: new Date('2026-08-21T10:00:00Z'), lastMessageAt: new Date('2026-08-21T10:00:00Z'), contact: { id: 'contact-legacy', phone: '5551999999999' } },
  ];
  prisma.ticket.count = async () => 0;
  prisma.ticket.groupBy = async () => [{ contactId: 'contact-1' }];

  const res = responseRecorder();
  await list({
    query: { status: 'resolved' },
    user: { userId: 'user-1', tenantId: 'tenant-a' },
  }, res);

  assert.equal(res.payload.tickets.length, 1);
  assert.equal(res.payload.tickets[0].id, 'ticket-latest');
  assert.equal(res.payload.counts.resolved, 1);
});

test('concluidos agrupam contatos duplicados pelo mesmo telefone com variacao do nono digito', async (t) => {
  const originals = {
    findMany: prisma.ticket.findMany,
    count: prisma.ticket.count,
    groupBy: prisma.ticket.groupBy,
  };
  t.after(() => {
    prisma.ticket.findMany = originals.findMany;
    prisma.ticket.count = originals.count;
    prisma.ticket.groupBy = originals.groupBy;
  });

  prisma.ticket.findMany = async () => [
    { id: 'ticket-without-ninth', contactId: 'contact-a', status: 'resolved', updatedAt: new Date('2026-08-20T10:00:00Z'), lastMessageAt: new Date('2026-08-20T10:00:00Z'), contact: { id: 'contact-a', phone: '555189849691' } },
    { id: 'ticket-with-ninth', contactId: 'contact-b', status: 'resolved', updatedAt: new Date('2026-08-21T10:00:00Z'), lastMessageAt: new Date('2026-08-21T10:00:00Z'), contact: { id: 'contact-b', phone: '5551989849691' } },
  ];
  prisma.ticket.count = async () => 0;
  prisma.ticket.groupBy = async () => [{ contactId: 'contact-a' }, { contactId: 'contact-b' }];

  const res = responseRecorder();
  await list({
    query: { status: 'resolved' },
    user: { userId: 'user-1', tenantId: 'tenant-a' },
  }, res);

  assert.equal(res.payload.tickets.length, 1);
  assert.equal(res.payload.tickets[0].id, 'ticket-with-ninth');
});

test('encerrar como contratado vincula a oportunidade ao mesmo contato e atendimento do WhatsApp', async (t) => {
  const originals = {
    transaction: prisma.$transaction,
    settings: prisma.tenantSettings.findUnique,
    eventCreate: prisma.ticketEvent.create,
  };
  t.after(() => {
    prisma.$transaction = originals.transaction;
    prisma.tenantSettings.findUnique = originals.settings;
    prisma.ticketEvent.create = originals.eventCreate;
  });

  const calls = { activities: [] };
  const tx = {
    ticket: {
      findFirst: async ({ where }) => ({
        id: where.id,
        tenantId: where.tenantId,
        contactId: 'contact-whatsapp',
        subject: null,
        contact: { id: 'contact-whatsapp', name: 'Maria Cliente', phone: '5551999999999' },
        legalLead: null,
      }),
      update: async ({ data }) => ({
        id: 'ticket-1',
        tenantId: 'tenant-a',
        instanceId: 'instance-1',
        contactId: 'contact-whatsapp',
        contact: { id: 'contact-whatsapp', name: 'Maria Cliente', phone: '5551999999999' },
        status: data.status,
        resolvedAt: data.resolvedAt,
        legalLead: { id: 'lead-1', stage: 'CONTRATADO', contactId: 'contact-whatsapp', ticketId: 'ticket-1' },
      }),
    },
    legalLead: {
      upsert: async (args) => {
        calls.upsert = args;
        return { id: 'lead-1', ...args.create };
      },
    },
    legalActivity: {
      create: async ({ data }) => {
        calls.activities.push(data);
        return data;
      },
    },
  };
  prisma.$transaction = async (handler) => handler(tx);
  prisma.tenantSettings.findUnique = async () => null;
  prisma.ticketEvent.create = async ({ data }) => data;

  const req = {
    params: { id: 'ticket-1' },
    body: {
      legalOutcome: 'CONTRATADO',
      legalArea: 'CONSUMIDOR',
      legalTitle: 'Revisão de contrato bancário',
      legalSummary: 'Cliente confirmou a contratação pelo WhatsApp.',
    },
    user: { userId: 'user-1', tenantId: 'tenant-a' },
  };
  const res = responseRecorder();
  await resolve(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(calls.upsert.where.ticketId, 'ticket-1');
  assert.equal(calls.upsert.create.tenantId, 'tenant-a');
  assert.equal(calls.upsert.create.contactId, 'contact-whatsapp');
  assert.equal(calls.upsert.create.ticketId, 'ticket-1');
  assert.equal(calls.upsert.create.stage, 'CONTRATADO');
  assert.equal(calls.activities[0].type, 'lead.created');
  assert.equal(calls.activities[0].payload.origin, 'ticket_resolution');
  assert.equal(res.payload.legalLead.stage, 'CONTRATADO');
});

test('encerrar sem resultado jurídico não cria oportunidade', async (t) => {
  const originals = {
    transaction: prisma.$transaction,
    settings: prisma.tenantSettings.findUnique,
    eventCreate: prisma.ticketEvent.create,
  };
  t.after(() => {
    prisma.$transaction = originals.transaction;
    prisma.tenantSettings.findUnique = originals.settings;
    prisma.ticketEvent.create = originals.eventCreate;
  });

  let upserted = false;
  const tx = {
    ticket: {
      findFirst: async () => ({
        id: 'ticket-1', tenantId: 'tenant-a', contactId: 'contact-1',
        contact: { id: 'contact-1', name: 'Cliente', phone: '5551999999999' }, legalLead: null,
      }),
      update: async ({ data }) => ({
        id: 'ticket-1', instanceId: 'instance-1', contactId: 'contact-1', status: data.status,
        resolvedAt: data.resolvedAt, contact: { phone: '5551999999999' }, legalLead: null,
      }),
    },
    legalLead: { upsert: async () => { upserted = true; } },
    legalActivity: { create: async () => ({}) },
  };
  prisma.$transaction = async (handler) => handler(tx);
  prisma.tenantSettings.findUnique = async () => null;
  prisma.ticketEvent.create = async ({ data }) => data;

  const res = responseRecorder();
  await resolve({
    params: { id: 'ticket-1' }, body: {}, user: { userId: 'user-1', tenantId: 'tenant-a' },
  }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.status, 'resolved');
  assert.equal(upserted, false);
});

test('não convertido exige motivo e não encerra parcialmente o atendimento', async (t) => {
  const originalTransaction = prisma.$transaction;
  t.after(() => { prisma.$transaction = originalTransaction; });

  let ticketUpdated = false;
  const tx = {
    ticket: {
      findFirst: async () => ({
        id: 'ticket-1', tenantId: 'tenant-a', contactId: 'contact-1', subject: null,
        contact: { id: 'contact-1', name: 'Cliente', phone: '5551999999999' }, legalLead: null,
      }),
      update: async () => { ticketUpdated = true; },
    },
  };
  prisma.$transaction = async (handler) => handler(tx);

  const res = responseRecorder();
  await resolve({
    params: { id: 'ticket-1' },
    body: { legalOutcome: 'NAO_CONVERTIDO', legalArea: 'OUTRO' },
    user: { userId: 'user-1', tenantId: 'tenant-a' },
  }, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.payload.error, /lostReason/);
  assert.equal(ticketUpdated, false);
});
