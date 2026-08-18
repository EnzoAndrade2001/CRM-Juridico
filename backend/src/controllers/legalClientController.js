const prisma = require('../lib/prisma');
const evolutionService = require('../services/evolutionService');
const { LegalValidationError, hasOwn, paginationFromQuery } = require('../domain/legalDomain');
const { buildLegalClientData, onlyDigits } = require('../domain/legalClientDomain');
const {
  httpError,
  recordActivity,
  changedFields,
  userSummarySelect,
  safeSearch,
} = require('./legalController');

const OPEN_TASK_STATUSES = ['PENDENTE', 'EM_ANDAMENTO'];

const clientSelect = {
  id: true,
  name: true,
  fantasyName: true,
  phone: true,
  whatsapp: true,
  email: true,
  cpfCnpj: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
  notes: true,
  instanceId: true,
  createdAt: true,
  _count: { select: { legalLeads: true, legalMatters: true } },
};

function booleanFilter(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'sim'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'nao'].includes(normalized)) return false;
  return undefined;
}

function buildClientWhere(req) {
  const search = safeSearch(req.query.search || req.query.q);
  const withLead = booleanFilter(req.query.withLead);
  const withMatter = booleanFilter(req.query.withMatter);
  const linked = booleanFilter(req.query.linkedToWhatsapp);
  const where = { tenantId: req.user.tenantId };

  if (search) {
    const digits = onlyDigits(search);
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { fantasyName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      ...(digits
        ? [
          { phone: { contains: digits } },
          { whatsapp: { contains: digits } },
          { cpfCnpj: { contains: digits } },
        ]
        : [{ cpfCnpj: { contains: search, mode: 'insensitive' } }]),
    ];
  }
  if (withLead !== undefined) where.legalLeads = withLead ? { some: {} } : { none: {} };
  if (withMatter !== undefined) where.legalMatters = withMatter ? { some: {} } : { none: {} };
  if (linked !== undefined) where.instanceId = linked ? { not: null } : null;
  return where;
}

async function openTasksByContact(tenantId, contactIds) {
  if (!contactIds.length) return {};
  const tasks = await prisma.legalTask.findMany({
    where: {
      tenantId,
      status: { in: OPEN_TASK_STATUSES },
      OR: [
        { lead: { contactId: { in: contactIds } } },
        { matter: { contactId: { in: contactIds } } },
      ],
    },
    select: { lead: { select: { contactId: true } }, matter: { select: { contactId: true } } },
  });
  return tasks.reduce((totals, task) => {
    const contactId = task.matter?.contactId || task.lead?.contactId;
    if (!contactId) return totals;
    return { ...totals, [contactId]: (totals[contactId] || 0) + 1 };
  }, {});
}

function presentClient(client, openTasks = 0) {
  const { _count, ...contact } = client;
  return {
    ...contact,
    linkedToWhatsapp: Boolean(contact.instanceId),
    counters: {
      leads: _count?.legalLeads || 0,
      matters: _count?.legalMatters || 0,
      openTasks,
    },
  };
}

function duplicateError(duplicate, data) {
  let field = 'phone';
  if (data.cpfCnpj && duplicate.cpfCnpj === data.cpfCnpj) field = 'cpfCnpj';
  else if (data.whatsapp && duplicate.whatsapp === data.whatsapp) field = 'whatsapp';
  return httpError(409, 'Já existe um cliente com este telefone, WhatsApp ou documento', [
    { field, code: 'duplicate', clientId: duplicate.id },
  ]);
}

async function findDuplicateClient(tx, tenantId, data, ignoreId) {
  const phoneCandidates = [
    ...evolutionService.buildPhoneLookupCandidates(data.phone || ''),
    ...evolutionService.buildPhoneLookupCandidates(data.whatsapp || ''),
  ];
  const conditions = [];
  if (phoneCandidates.length) {
    conditions.push({ phone: { in: phoneCandidates } }, { whatsapp: { in: phoneCandidates } });
  }
  if (data.cpfCnpj) conditions.push({ cpfCnpj: data.cpfCnpj });
  if (!conditions.length) return null;
  return tx.contact.findFirst({
    where: { tenantId, ...(ignoreId && { id: { not: ignoreId } }), OR: conditions },
    select: { id: true, name: true, phone: true, whatsapp: true, cpfCnpj: true },
  });
}

async function resolveInstanceId(tx, tenantId, requestedInstanceId) {
  if (requestedInstanceId === null || requestedInstanceId === '') return null;
  const instance = await tx.waInstance.findFirst({
    where: { id: String(requestedInstanceId), tenantId },
    select: { id: true },
  });
  if (!instance) throw httpError(400, 'A conexão informada não pertence a este escritório');
  return instance.id;
}

async function listLegalClients(req, res) {
  const tenantId = req.user.tenantId;
  const { page, limit, skip } = paginationFromQuery(req.query);
  const where = buildClientWhere(req);
  const [items, total] = await Promise.all([
    prisma.contact.findMany({ where, select: clientSelect, orderBy: { createdAt: 'desc' }, skip, take: limit }),
    prisma.contact.count({ where }),
  ]);
  const openTasks = await openTasksByContact(tenantId, items.map((item) => item.id));
  res.json({
    items: items.map((item) => presentClient(item, openTasks[item.id] || 0)),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

async function getLegalClient(req, res) {
  const tenantId = req.user.tenantId;
  const client = await prisma.contact.findFirst({
    where: { id: req.params.id, tenantId },
    select: clientSelect,
  });
  if (!client) throw httpError(404, 'Cliente não encontrado');

  const [leads, matters, tasks, tickets, documents, activities] = await Promise.all([
    prisma.legalLead.findMany({
      where: { tenantId, contactId: client.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        assignedUser: { select: userSummarySelect },
        matter: { select: { id: true, status: true } },
      },
    }),
    prisma.legalMatter.findMany({
      where: { tenantId, contactId: client.id },
      orderBy: { updatedAt: 'desc' },
      include: { responsibleUser: { select: userSummarySelect } },
    }),
    prisma.legalTask.findMany({
      where: {
        tenantId,
        OR: [{ lead: { contactId: client.id } }, { matter: { contactId: client.id } }],
      },
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
      take: 50,
      include: {
        assignee: { select: userSummarySelect },
        lead: { select: { id: true, title: true } },
        matter: { select: { id: true, title: true } },
      },
    }),
    prisma.ticket.findMany({
      where: { tenantId, contactId: client.id },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { id: true, status: true, subject: true, updatedAt: true },
    }),
    prisma.legalDocument.findMany({
      where: { tenantId, contactId: client.id },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        title: true,
        kind: true,
        status: true,
        fileName: true,
        dueAt: true,
        receivedAt: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.legalActivity.findMany({
      where: { tenantId, entityType: 'client', entityId: client.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { actor: { select: userSummarySelect } },
    }),
  ]);

  const openTasks = tasks.filter((task) => OPEN_TASK_STATUSES.includes(task.status)).length;
  res.json({ ...presentClient(client, openTasks), leads, matters, tasks, tickets, documents, activities });
}

async function createLegalClient(req, res) {
  const tenantId = req.user.tenantId;
  const data = buildLegalClientData(req.body);
  const client = await prisma.$transaction(async (tx) => {
    const duplicate = await findDuplicateClient(tx, tenantId, data);
    if (duplicate) throw duplicateError(duplicate, data);
    const instanceId = hasOwn(req.body, 'instanceId')
      ? await resolveInstanceId(tx, tenantId, req.body.instanceId)
      : null;
    const created = await tx.contact.create({
      data: { ...data, tenantId, instanceId, externalSource: 'legal' },
      select: clientSelect,
    });
    await recordActivity(tx, req, 'client', created.id, 'client.created', {
      linkedToWhatsapp: Boolean(created.instanceId),
      hasDocument: Boolean(created.cpfCnpj),
    });
    return created;
  });
  res.status(201).json(presentClient(client));
}

async function updateLegalClient(req, res) {
  const tenantId = req.user.tenantId;
  const existing = await prisma.contact.findFirst({
    where: { id: req.params.id, tenantId },
    select: { id: true },
  });
  if (!existing) throw httpError(404, 'Cliente não encontrado');

  const data = buildLegalClientData(req.body, { partial: true });
  if (hasOwn(req.body, 'instanceId')) {
    data.instanceId = await resolveInstanceId(prisma, tenantId, req.body.instanceId);
  }
  if (!Object.keys(data).length) throw new LegalValidationError('Nenhum campo válido foi informado');

  const client = await prisma.$transaction(async (tx) => {
    if (data.phone || data.whatsapp || data.cpfCnpj) {
      const duplicate = await findDuplicateClient(tx, tenantId, data, existing.id);
      if (duplicate) throw duplicateError(duplicate, data);
    }
    const updated = await tx.contact.update({ where: { id: existing.id }, data, select: clientSelect });
    await recordActivity(tx, req, 'client', updated.id, 'client.updated', { fields: changedFields(data) });
    return updated;
  });

  const openTasks = await openTasksByContact(tenantId, [client.id]);
  res.json(presentClient(client, openTasks[client.id] || 0));
}

module.exports = {
  listLegalClients,
  getLegalClient,
  createLegalClient,
  updateLegalClient,
};
