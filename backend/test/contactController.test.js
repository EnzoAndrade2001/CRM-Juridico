const test = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../src/lib/prisma');
const { create } = require('../src/controllers/contactController');

function responseRecorder() {
  return {
    statusCode: 200,
    payload: undefined,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
}

test('cadastra cliente jurídico mesmo sem conexão WhatsApp', async (t) => {
  const originalContactFindFirst = prisma.contact.findFirst;
  const originalContactCreate = prisma.contact.create;
  const originalInstanceFindFirst = prisma.waInstance.findFirst;
  t.after(() => {
    prisma.contact.findFirst = originalContactFindFirst;
    prisma.contact.create = originalContactCreate;
    prisma.waInstance.findFirst = originalInstanceFindFirst;
  });

  let createdData;
  prisma.contact.findFirst = async () => null;
  prisma.waInstance.findFirst = async () => null;
  prisma.contact.create = async ({ data }) => {
    createdData = data;
    return { id: 'contact-1', ...data };
  };

  const req = {
    user: { tenantId: 'tenant-a' },
    body: {
      name: 'Maria Cliente',
      phone: '11999998888',
      email: 'maria@example.com',
      notes: 'Cadastro iniciado no escritório.',
    },
  };
  const res = responseRecorder();
  await create(req, res);

  assert.equal(createdData.tenantId, 'tenant-a');
  assert.equal(createdData.instanceId, null);
  assert.equal(createdData.notes, 'Cadastro iniciado no escritório.');
  assert.equal(res.payload.id, 'contact-1');
});
