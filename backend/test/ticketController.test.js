const test = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../src/lib/prisma');
const { list } = require('../src/controllers/ticketController');

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
    capturedInclude = include;
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
