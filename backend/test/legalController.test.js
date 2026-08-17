const test = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../src/lib/prisma');
const {
  listLegalLeads,
  createLegalLead,
  createLegalMatter,
  createLegalTask,
} = require('../src/controllers/legalController');

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

test('lista oportunidades exclusivamente no tenant autenticado', async (t) => {
  let capturedWhere;
  const originalFindMany = prisma.legalLead.findMany;
  const originalCount = prisma.legalLead.count;
  t.after(() => {
    prisma.legalLead.findMany = originalFindMany;
    prisma.legalLead.count = originalCount;
  });
  prisma.legalLead.findMany = async ({ where }) => {
    capturedWhere = where;
    return [];
  };
  prisma.legalLead.count = async () => 0;

  const res = responseRecorder();
  await listLegalLeads(authenticatedRequest({}, { query: { stage: 'novo contato' } }), res);

  assert.equal(capturedWhere.tenantId, 'tenant-a');
  assert.equal(capturedWhere.stage, 'NOVO_CONTATO');
  assert.deepEqual(res.payload.pagination, { page: 1, limit: 25, total: 0, pages: 0 });
});

test('cria oportunidade com tenant e atividade de auditoria', async (t) => {
  const originalTransaction = prisma.$transaction;
  t.after(() => { prisma.$transaction = originalTransaction; });
  const calls = { activities: [] };
  const tx = {
    contact: {
      findFirst: async ({ where }) => ({ id: where.id }),
    },
    legalLead: {
      create: async ({ data }) => {
        calls.leadData = data;
        return { id: 'lead-1', ...data };
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

  const req = authenticatedRequest({
    contactId: 'contact-1',
    title: 'Rescisão trabalhista',
    area: 'trabalhista',
  });
  const res = responseRecorder();
  await createLegalLead(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(calls.leadData.tenantId, 'tenant-a');
  assert.equal(calls.activities[0].tenantId, 'tenant-a');
  assert.equal(calls.activities[0].actorId, 'user-1');
  assert.equal(calls.activities[0].type, 'lead.created');
});

test('deriva o contato do caso a partir da oportunidade do mesmo tenant', async (t) => {
  const originalTransaction = prisma.$transaction;
  t.after(() => { prisma.$transaction = originalTransaction; });
  let matterData;
  const tx = {
    legalLead: {
      findFirst: async ({ where }) => ({ id: where.id, contactId: 'contact-from-lead' }),
    },
    contact: {
      findFirst: async ({ where }) => ({ id: where.id }),
    },
    legalMatter: {
      create: async ({ data }) => {
        matterData = data;
        return { id: 'matter-1', ...data };
      },
    },
    legalActivity: { create: async ({ data }) => data },
  };
  prisma.$transaction = async (handler) => handler(tx);

  const res = responseRecorder();
  await createLegalMatter(authenticatedRequest({
    leadId: 'lead-1',
    title: 'Caso trabalhista',
    area: 'trabalhista',
  }), res);

  assert.equal(res.statusCode, 201);
  assert.equal(matterData.tenantId, 'tenant-a');
  assert.equal(matterData.contactId, 'contact-from-lead');
});

test('deriva a oportunidade da tarefa vinculada a um caso', async (t) => {
  const originalTransaction = prisma.$transaction;
  t.after(() => { prisma.$transaction = originalTransaction; });
  let taskData;
  const tx = {
    legalMatter: {
      findFirst: async ({ where }) => ({ id: where.id, leadId: 'lead-from-matter' }),
    },
    legalLead: {
      findFirst: async ({ where }) => ({ id: where.id }),
    },
    legalTask: {
      create: async ({ data }) => {
        taskData = data;
        return { id: 'task-1', ...data };
      },
    },
    legalActivity: { create: async ({ data }) => data },
  };
  prisma.$transaction = async (handler) => handler(tx);

  const res = responseRecorder();
  await createLegalTask(authenticatedRequest({
    matterId: 'matter-1',
    title: 'Revisar documentação',
    type: 'documento',
  }), res);

  assert.equal(res.statusCode, 201);
  assert.equal(taskData.tenantId, 'tenant-a');
  assert.equal(taskData.leadId, 'lead-from-matter');
});
