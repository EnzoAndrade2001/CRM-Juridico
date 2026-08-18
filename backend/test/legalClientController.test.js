const test = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../src/lib/prisma');
const {
  listLegalClients,
  getLegalClient,
  createLegalClient,
  updateLegalClient,
} = require('../src/controllers/legalClientController');

function responseRecorder() {
  return {
    statusCode: 200,
    payload: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
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

function transactionStub(handlers) {
  return async (callback) => callback(handlers);
}

test('lista clientes do tenant com busca, filtros e contadores jurídicos', async (t) => {
  const originals = {
    findMany: prisma.contact.findMany,
    count: prisma.contact.count,
    taskFindMany: prisma.legalTask.findMany,
  };
  t.after(() => {
    prisma.contact.findMany = originals.findMany;
    prisma.contact.count = originals.count;
    prisma.legalTask.findMany = originals.taskFindMany;
  });

  let capturedWhere;
  prisma.contact.findMany = async ({ where }) => {
    capturedWhere = where;
    return [{
      id: 'contact-1',
      name: 'Maria Silva',
      phone: '5511999998888',
      instanceId: null,
      _count: { legalLeads: 2, legalMatters: 1 },
    }];
  };
  prisma.contact.count = async () => 1;
  prisma.legalTask.findMany = async () => [
    { lead: { contactId: 'contact-1' }, matter: null },
    { lead: null, matter: { contactId: 'contact-1' } },
  ];

  const res = responseRecorder();
  await listLegalClients(authenticatedRequest({}, { query: { search: 'Maria', withMatter: 'true' } }), res);

  assert.equal(capturedWhere.tenantId, 'tenant-a');
  assert.deepEqual(capturedWhere.legalMatters, { some: {} });
  assert.ok(capturedWhere.OR.some((clause) => clause.name?.contains === 'Maria'));
  assert.deepEqual(res.payload.items[0].counters, { leads: 2, matters: 1, openTasks: 2 });
  assert.equal(res.payload.items[0].linkedToWhatsapp, false);
  assert.deepEqual(res.payload.pagination, { page: 1, limit: 25, total: 1, pages: 1 });
});

test('busca por documento usa somente os dígitos informados', async (t) => {
  const originals = { findMany: prisma.contact.findMany, count: prisma.contact.count };
  t.after(() => {
    prisma.contact.findMany = originals.findMany;
    prisma.contact.count = originals.count;
  });

  let capturedWhere;
  prisma.contact.findMany = async ({ where }) => {
    capturedWhere = where;
    return [];
  };
  prisma.contact.count = async () => 0;

  const res = responseRecorder();
  await listLegalClients(authenticatedRequest({}, { query: { search: '529.982.247-25' } }), res);

  assert.ok(capturedWhere.OR.some((clause) => clause.cpfCnpj?.contains === '52998224725'));
  assert.equal(res.payload.items.length, 0);
});

test('cadastra cliente jurídico sem conexão WhatsApp e registra auditoria', async (t) => {
  const originalTransaction = prisma.$transaction;
  t.after(() => { prisma.$transaction = originalTransaction; });

  let createdData;
  let activityData;
  prisma.$transaction = transactionStub({
    contact: {
      findFirst: async () => null,
      create: async ({ data, select }) => {
        createdData = data;
        return { id: 'contact-1', ...data, _count: { legalLeads: 0, legalMatters: 0 }, ...(select ? {} : {}) };
      },
    },
    waInstance: { findFirst: async () => null },
    legalActivity: { create: async ({ data }) => { activityData = data; return data; } },
  });

  const res = responseRecorder();
  await createLegalClient(authenticatedRequest({
    name: 'Maria Silva',
    phone: '(11) 99999-8888',
    cpfCnpj: '529.982.247-25',
    state: 'sp',
  }), res);

  assert.equal(res.statusCode, 201);
  assert.equal(createdData.tenantId, 'tenant-a');
  assert.equal(createdData.instanceId, null);
  assert.equal(createdData.phone, '5511999998888');
  assert.equal(createdData.cpfCnpj, '52998224725');
  assert.equal(createdData.externalSource, 'legal');
  assert.equal(activityData.entityType, 'client');
  assert.equal(activityData.type, 'client.created');
  assert.equal(activityData.tenantId, 'tenant-a');
  assert.equal(res.payload.linkedToWhatsapp, false);
  assert.deepEqual(res.payload.counters, { leads: 0, matters: 0, openTasks: 0 });
});

test('não vincula automaticamente uma conexão ao cadastrar cliente interno', async (t) => {
  const originalTransaction = prisma.$transaction;
  t.after(() => { prisma.$transaction = originalTransaction; });

  let instanceLookupCount = 0;
  let createdData;
  prisma.$transaction = transactionStub({
    contact: {
      findFirst: async () => null,
      create: async ({ data }) => {
        createdData = data;
        return { id: 'contact-interno', ...data, _count: { legalLeads: 0, legalMatters: 0 } };
      },
    },
    waInstance: { findFirst: async () => { instanceLookupCount += 1; return { id: 'wa-default' }; } },
    legalActivity: { create: async ({ data }) => data },
  });

  await createLegalClient(
    authenticatedRequest({ name: 'Cliente interno', phone: '11988887777' }),
    responseRecorder(),
  );

  assert.equal(instanceLookupCount, 0);
  assert.equal(createdData.instanceId, null);
});

test('permite vincular e desvincular uma conexão do próprio escritório', async (t) => {
  const originals = {
    findFirst: prisma.contact.findFirst,
    instanceFindFirst: prisma.waInstance.findFirst,
    transaction: prisma.$transaction,
    taskFindMany: prisma.legalTask.findMany,
  };
  t.after(() => {
    prisma.contact.findFirst = originals.findFirst;
    prisma.waInstance.findFirst = originals.instanceFindFirst;
    prisma.$transaction = originals.transaction;
    prisma.legalTask.findMany = originals.taskFindMany;
  });

  prisma.contact.findFirst = async () => ({ id: 'contact-1' });
  prisma.waInstance.findFirst = async ({ where }) => {
    assert.equal(where.tenantId, 'tenant-a');
    return { id: 'wa-1' };
  };
  prisma.legalTask.findMany = async () => [];
  let updatedData;
  prisma.$transaction = transactionStub({
    contact: {
      update: async ({ data }) => {
        updatedData = data;
        return { id: 'contact-1', ...data, _count: { legalLeads: 0, legalMatters: 0 } };
      },
    },
    legalActivity: { create: async ({ data }) => data },
  });

  const linkedResponse = responseRecorder();
  await updateLegalClient(
    authenticatedRequest({ instanceId: 'wa-1' }, { params: { id: 'contact-1' } }),
    linkedResponse,
  );
  assert.deepEqual(updatedData, { instanceId: 'wa-1' });
  assert.equal(linkedResponse.payload.linkedToWhatsapp, true);

  const unlinkedResponse = responseRecorder();
  await updateLegalClient(
    authenticatedRequest({ instanceId: null }, { params: { id: 'contact-1' } }),
    unlinkedResponse,
  );
  assert.deepEqual(updatedData, { instanceId: null });
  assert.equal(unlinkedResponse.payload.linkedToWhatsapp, false);
});

test('recusa cliente duplicado por telefone ou documento', async (t) => {
  const originalTransaction = prisma.$transaction;
  t.after(() => { prisma.$transaction = originalTransaction; });

  prisma.$transaction = transactionStub({
    contact: {
      findFirst: async () => ({ id: 'contact-existente', name: 'Maria Silva', phone: '5511999998888', cpfCnpj: null }),
      create: async () => assert.fail('não deveria criar um cliente duplicado'),
    },
    waInstance: { findFirst: async () => null },
    legalActivity: { create: async () => ({}) },
  });

  const res = responseRecorder();
  await assert.rejects(
    createLegalClient(authenticatedRequest({ name: 'Maria Silva', phone: '11999998888' }), res),
    (error) => {
      assert.equal(error.statusCode, 409);
      assert.equal(error.details[0].clientId, 'contact-existente');
      return true;
    },
  );
});

test('impede alterar cliente de outro escritório', async (t) => {
  const originalFindFirst = prisma.contact.findFirst;
  t.after(() => { prisma.contact.findFirst = originalFindFirst; });

  let capturedWhere;
  prisma.contact.findFirst = async ({ where }) => {
    capturedWhere = where;
    return null;
  };

  const res = responseRecorder();
  await assert.rejects(
    updateLegalClient(authenticatedRequest({ city: 'Campinas' }, { params: { id: 'contact-de-outro-tenant' } }), res),
    (error) => error.statusCode === 404,
  );
  assert.equal(capturedWhere.tenantId, 'tenant-a');
});

test('atualiza o cliente e registra os campos alterados', async (t) => {
  const originals = {
    findFirst: prisma.contact.findFirst,
    transaction: prisma.$transaction,
    taskFindMany: prisma.legalTask.findMany,
  };
  t.after(() => {
    prisma.contact.findFirst = originals.findFirst;
    prisma.$transaction = originals.transaction;
    prisma.legalTask.findMany = originals.taskFindMany;
  });

  prisma.contact.findFirst = async () => ({ id: 'contact-1' });
  prisma.legalTask.findMany = async () => [];
  let updateArgs;
  let activityData;
  prisma.$transaction = transactionStub({
    contact: {
      findFirst: async () => null,
      update: async (args) => {
        updateArgs = args;
        return { id: 'contact-1', city: 'Campinas', instanceId: 'wa-1', _count: { legalLeads: 1, legalMatters: 0 } };
      },
    },
    legalActivity: { create: async ({ data }) => { activityData = data; return data; } },
  });

  const res = responseRecorder();
  await updateLegalClient(authenticatedRequest({ city: 'Campinas', state: 'sp' }, { params: { id: 'contact-1' } }), res);

  assert.deepEqual(updateArgs.data, { city: 'Campinas', state: 'SP' });
  assert.equal(activityData.type, 'client.updated');
  assert.deepEqual(activityData.payload.fields, ['city', 'state']);
  assert.equal(res.payload.linkedToWhatsapp, true);
});

test('retorna o dossiê do cliente com oportunidades, casos e tarefas', async (t) => {
  const originals = {
    contactFindFirst: prisma.contact.findFirst,
    leadFindMany: prisma.legalLead.findMany,
    matterFindMany: prisma.legalMatter.findMany,
    taskFindMany: prisma.legalTask.findMany,
    ticketFindMany: prisma.ticket.findMany,
    documentFindMany: prisma.legalDocument.findMany,
    activityFindMany: prisma.legalActivity.findMany,
  };
  t.after(() => {
    prisma.contact.findFirst = originals.contactFindFirst;
    prisma.legalLead.findMany = originals.leadFindMany;
    prisma.legalMatter.findMany = originals.matterFindMany;
    prisma.legalTask.findMany = originals.taskFindMany;
    prisma.ticket.findMany = originals.ticketFindMany;
    prisma.legalDocument.findMany = originals.documentFindMany;
    prisma.legalActivity.findMany = originals.activityFindMany;
  });

  prisma.contact.findFirst = async () => ({
    id: 'contact-1', name: 'Maria Silva', instanceId: 'wa-1', _count: { legalLeads: 1, legalMatters: 1 },
  });
  prisma.legalLead.findMany = async () => [{ id: 'lead-1', title: 'Rescisão' }];
  prisma.legalMatter.findMany = async () => [{ id: 'matter-1', title: 'Ação trabalhista' }];
  prisma.legalTask.findMany = async () => [
    { id: 'task-1', status: 'PENDENTE' },
    { id: 'task-2', status: 'CONCLUIDA' },
  ];
  prisma.ticket.findMany = async () => [{ id: 'ticket-1', status: 'open' }];
  prisma.legalDocument.findMany = async () => [{ id: 'document-1', title: 'Contrato', status: 'RECEBIDO' }];
  prisma.legalActivity.findMany = async ({ where }) => {
    assert.equal(where.entityType, 'client');
    assert.equal(where.entityId, 'contact-1');
    return [{ id: 'activity-1', type: 'client.created' }];
  };

  const res = responseRecorder();
  await getLegalClient(authenticatedRequest({}, { params: { id: 'contact-1' } }), res);

  assert.equal(res.payload.counters.openTasks, 1);
  assert.equal(res.payload.leads.length, 1);
  assert.equal(res.payload.matters.length, 1);
  assert.equal(res.payload.tickets.length, 1);
  assert.equal(res.payload.documents.length, 1);
  assert.equal(res.payload.activities.length, 1);
});
