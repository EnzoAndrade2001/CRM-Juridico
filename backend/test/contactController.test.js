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

test('limpar conversa apaga as mensagens e preserva contato e atendimentos', async (t) => {
  const { clearHistory } = require('../src/controllers/contactController');
  const originals = {
    contactFindFirst: prisma.contact.findFirst,
    ticketFindMany: prisma.ticket.findMany,
    messageDeleteMany: prisma.message.deleteMany,
    ticketUpdateMany: prisma.ticket.updateMany,
    ticketDelete: prisma.ticket.delete,
    contactDelete: prisma.contact.delete,
  };
  t.after(() => Object.assign(prisma.contact, { findFirst: originals.contactFindFirst, delete: originals.contactDelete })
    && Object.assign(prisma.ticket, { findMany: originals.ticketFindMany, updateMany: originals.ticketUpdateMany, delete: originals.ticketDelete })
    && Object.assign(prisma.message, { deleteMany: originals.messageDeleteMany }));

  let deleteFilter;
  let updateFilter;
  prisma.contact.findFirst = async ({ where }) => (
    where.id === 'contact-1' && where.tenantId === 'tenant-a'
      ? { id: 'contact-1', name: 'Eduarda', phone: '555191540248' }
      : null
  );
  prisma.ticket.findMany = async () => [{ id: 'ticket-1' }, { id: 'ticket-2' }];
  prisma.message.deleteMany = async ({ where }) => { deleteFilter = where; return { count: 42 }; };
  prisma.ticket.updateMany = async ({ where, data }) => { updateFilter = { where, data }; return { count: 2 }; };
  // Nada de exclusao: se o controller chamar, o teste falha.
  prisma.ticket.delete = async () => { throw new Error('nao deveria excluir atendimento'); };
  prisma.contact.delete = async () => { throw new Error('nao deveria excluir contato'); };

  const res = responseRecorder();
  await clearHistory({ params: { id: 'contact-1' }, user: { tenantId: 'tenant-a', userId: 'user-1' } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.payload, { deleted: 42, tickets: 2 });
  assert.deepEqual(deleteFilter, { ticketId: { in: ['ticket-1', 'ticket-2'] } });
  assert.deepEqual(updateFilter.where, { id: { in: ['ticket-1', 'ticket-2'] } });
  assert.equal(updateFilter.data.unreadCount, 0);
});

test('limpar conversa nao alcanca contato de outro tenant', async (t) => {
  const { clearHistory } = require('../src/controllers/contactController');
  const originalFindFirst = prisma.contact.findFirst;
  const originalDeleteMany = prisma.message.deleteMany;
  t.after(() => {
    prisma.contact.findFirst = originalFindFirst;
    prisma.message.deleteMany = originalDeleteMany;
  });

  prisma.contact.findFirst = async () => null;
  prisma.message.deleteMany = async () => { throw new Error('nao deveria apagar mensagem'); };

  const res = responseRecorder();
  await clearHistory({ params: { id: 'contact-de-outro' }, user: { tenantId: 'tenant-a', userId: 'user-1' } }, res);

  assert.equal(res.statusCode, 404);
  assert.match(res.payload.error, /não encontrado/i);
});

test('limpar conversa de contato sem atendimento nao chama deleteMany', async (t) => {
  const { clearHistory } = require('../src/controllers/contactController');
  const originalFindFirst = prisma.contact.findFirst;
  const originalTicketFindMany = prisma.ticket.findMany;
  const originalDeleteMany = prisma.message.deleteMany;
  t.after(() => {
    prisma.contact.findFirst = originalFindFirst;
    prisma.ticket.findMany = originalTicketFindMany;
    prisma.message.deleteMany = originalDeleteMany;
  });

  prisma.contact.findFirst = async () => ({ id: 'contact-1', name: null, phone: '5551999' });
  prisma.ticket.findMany = async () => [];
  prisma.message.deleteMany = async () => { throw new Error('nao deveria apagar mensagem'); };

  const res = responseRecorder();
  await clearHistory({ params: { id: 'contact-1' }, user: { tenantId: 'tenant-a', userId: 'user-1' } }, res);

  assert.deepEqual(res.payload, { deleted: 0, tickets: 0 });
});
