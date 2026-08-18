const prisma = require('../lib/prisma');
const {
  LegalValidationError,
  LEGAL_AREAS,
  LEGAL_LEAD_STAGES,
  LEGAL_PRIORITIES,
  LEGAL_MATTER_STATUSES,
  LEGAL_TASK_TYPES,
  LEGAL_TASK_STATUSES,
  normalizedEnumToken,
  buildLegalLeadData,
  validateLegalLeadState,
  buildLegalMatterData,
  validateLegalMatterState,
  buildLegalTaskData,
  validateLegalTaskState,
  paginationFromQuery,
} = require('../domain/legalDomain');
const { LEGAL_DOCUMENT_KINDS, LEGAL_DOCUMENT_STATUSES } = require('../domain/legalDocumentDomain');

const userSummarySelect = { id: true, name: true, email: true, role: true };
const contactSummarySelect = {
  id: true,
  name: true,
  phone: true,
  whatsapp: true,
  email: true,
  cpfCnpj: true,
  city: true,
  state: true,
};

const leadInclude = {
  contact: { select: contactSummarySelect },
  assignedUser: { select: userSummarySelect },
  ticket: { select: { id: true, status: true, subject: true } },
  matter: { select: { id: true, status: true, caseNumber: true } },
  _count: { select: { tasks: true } },
};

const matterInclude = {
  contact: { select: contactSummarySelect },
  responsibleUser: { select: userSummarySelect },
  lead: { select: { id: true, title: true, stage: true, urgency: true } },
  _count: { select: { tasks: true } },
};

const taskInclude = {
  assignee: { select: userSummarySelect },
  lead: { select: { id: true, title: true, stage: true, contactId: true } },
  matter: { select: { id: true, title: true, status: true, contactId: true } },
};

function httpError(statusCode, message, details) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.details = details;
  return error;
}

function parseFilter(value, field, allowed) {
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = normalizedEnumToken(value);
  if (!allowed.includes(normalized)) {
    throw new LegalValidationError(`${field} inválido`, [{ field, code: 'invalid_enum', allowed }]);
  }
  return normalized;
}

function safeSearch(value) {
  if (value === undefined || value === null) return undefined;
  const normalized = String(value).trim();
  if (!normalized) return undefined;
  if (normalized.length > 120) throw new LegalValidationError('Busca excede 120 caracteres');
  return normalized;
}

async function requireTenantRecord(tx, model, id, tenantId, label, select = { id: true }) {
  if (!id) return null;
  const record = await tx[model].findFirst({ where: { id, tenantId }, select });
  if (!record) throw httpError(400, `${label} não pertence a este escritório ou não existe`);
  return record;
}

async function requireTenantUser(tx, id, tenantId, label = 'Usuário') {
  if (!id) return null;
  const user = await tx.user.findFirst({ where: { id, tenantId, active: true }, select: { id: true } });
  if (!user) throw httpError(400, `${label} não pertence a este escritório ou está inativo`);
  return user;
}

async function recordActivity(tx, req, entityType, entityId, type, payload) {
  return tx.legalActivity.create({
    data: {
      tenantId: req.user.tenantId,
      actorId: req.user.userId || null,
      entityType,
      entityId,
      type,
      payload: payload || undefined,
    },
  });
}

function changedFields(data) {
  return Object.keys(data).filter((field) => !['qualification', 'summary', 'description'].includes(field));
}

async function getLegalConfig(req, res) {
  res.json({
    areas: LEGAL_AREAS,
    leadStages: LEGAL_LEAD_STAGES,
    priorities: LEGAL_PRIORITIES,
    matterStatuses: LEGAL_MATTER_STATUSES,
    taskTypes: LEGAL_TASK_TYPES,
    taskStatuses: LEGAL_TASK_STATUSES,
    documentKinds: LEGAL_DOCUMENT_KINDS,
    documentStatuses: LEGAL_DOCUMENT_STATUSES,
  });
}

async function getLegalSummary(req, res) {
  const tenantId = req.user.tenantId;
  const now = new Date();
  const [leadGroups, matterGroups, openTasks, overdueTasks, recentActivities] = await Promise.all([
    prisma.legalLead.groupBy({ by: ['stage'], where: { tenantId }, _count: { _all: true } }),
    prisma.legalMatter.groupBy({ by: ['status'], where: { tenantId }, _count: { _all: true } }),
    prisma.legalTask.count({ where: { tenantId, status: { in: ['PENDENTE', 'EM_ANDAMENTO'] } } }),
    prisma.legalTask.count({
      where: { tenantId, status: { in: ['PENDENTE', 'EM_ANDAMENTO'] }, dueAt: { lt: now } },
    }),
    prisma.legalActivity.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { actor: { select: userSummarySelect } },
    }),
  ]);
  res.json({
    leadsByStage: Object.fromEntries(leadGroups.map((item) => [item.stage, item._count._all])),
    mattersByStatus: Object.fromEntries(matterGroups.map((item) => [item.status, item._count._all])),
    tasks: { open: openTasks, overdue: overdueTasks },
    recentActivities,
  });
}

async function listLegalLeads(req, res) {
  const tenantId = req.user.tenantId;
  const { page, limit, skip } = paginationFromQuery(req.query);
  const stage = parseFilter(req.query.stage, 'stage', LEGAL_LEAD_STAGES);
  const area = parseFilter(req.query.area, 'area', LEGAL_AREAS);
  const urgency = parseFilter(req.query.urgency, 'urgency', LEGAL_PRIORITIES);
  const search = safeSearch(req.query.search);
  const where = {
    tenantId,
    ...(stage && { stage }),
    ...(area && { area }),
    ...(urgency && { urgency }),
    ...(req.query.assignedUserId && { assignedUserId: String(req.query.assignedUserId) }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { contact: { name: { contains: search, mode: 'insensitive' } } },
        { contact: { phone: { contains: search } } },
      ],
    }),
  };
  const [items, total] = await Promise.all([
    prisma.legalLead.findMany({ where, include: leadInclude, orderBy: { updatedAt: 'desc' }, skip, take: limit }),
    prisma.legalLead.count({ where }),
  ]);
  res.json({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

async function getLegalLead(req, res) {
  const tenantId = req.user.tenantId;
  const lead = await prisma.legalLead.findFirst({
    where: { id: req.params.id, tenantId },
    include: { ...leadInclude, tasks: { include: taskInclude, orderBy: [{ status: 'asc' }, { dueAt: 'asc' }] } },
  });
  if (!lead) throw httpError(404, 'Oportunidade não encontrada');
  const activities = await prisma.legalActivity.findMany({
    where: { tenantId, entityType: 'lead', entityId: lead.id },
    include: { actor: { select: userSummarySelect } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ ...lead, activities });
}

async function createLegalLead(req, res) {
  const tenantId = req.user.tenantId;
  const data = validateLegalLeadState(buildLegalLeadData(req.body));
  const lead = await prisma.$transaction(async (tx) => {
    await requireTenantRecord(tx, 'contact', data.contactId, tenantId, 'Contato');
    if (data.assignedUserId) await requireTenantUser(tx, data.assignedUserId, tenantId, 'Responsável');
    if (data.ticketId) {
      const ticket = await requireTenantRecord(tx, 'ticket', data.ticketId, tenantId, 'Atendimento', {
        id: true,
        contactId: true,
      });
      if (ticket.contactId !== data.contactId) throw httpError(400, 'O atendimento informado pertence a outro contato');
    }
    const created = await tx.legalLead.create({ data: { ...data, tenantId }, include: leadInclude });
    await recordActivity(tx, req, 'lead', created.id, 'lead.created', { stage: created.stage, area: created.area });
    return created;
  });
  res.status(201).json(lead);
}

async function updateLegalLead(req, res) {
  const tenantId = req.user.tenantId;
  const existing = await prisma.legalLead.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) throw httpError(404, 'Oportunidade não encontrada');
  const data = buildLegalLeadData(req.body, { partial: true });
  if (!Object.keys(data).length) throw new LegalValidationError('Nenhum campo válido foi informado');
  validateLegalLeadState({ ...existing, ...data });
  const updated = await prisma.$transaction(async (tx) => {
    if (data.contactId) await requireTenantRecord(tx, 'contact', data.contactId, tenantId, 'Contato');
    if (data.assignedUserId) await requireTenantUser(tx, data.assignedUserId, tenantId, 'Responsável');
    const finalContactId = data.contactId || existing.contactId;
    if (data.ticketId) {
      const ticket = await requireTenantRecord(tx, 'ticket', data.ticketId, tenantId, 'Atendimento', {
        id: true,
        contactId: true,
      });
      if (ticket.contactId !== finalContactId) throw httpError(400, 'O atendimento informado pertence a outro contato');
    }
    const result = await tx.legalLead.update({ where: { id: existing.id }, data, include: leadInclude });
    await recordActivity(tx, req, 'lead', result.id, 'lead.updated', {
      fields: changedFields(data),
      fromStage: existing.stage,
      toStage: result.stage,
    });
    return result;
  });
  res.json(updated);
}

async function listLegalMatters(req, res) {
  const tenantId = req.user.tenantId;
  const { page, limit, skip } = paginationFromQuery(req.query);
  const status = parseFilter(req.query.status, 'status', LEGAL_MATTER_STATUSES);
  const area = parseFilter(req.query.area, 'area', LEGAL_AREAS);
  const search = safeSearch(req.query.search);
  const where = {
    tenantId,
    ...(status && { status }),
    ...(area && { area }),
    ...(req.query.responsibleUserId && { responsibleUserId: String(req.query.responsibleUserId) }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { caseNumber: { contains: search, mode: 'insensitive' } },
        { contact: { name: { contains: search, mode: 'insensitive' } } },
      ],
    }),
  };
  const [items, total] = await Promise.all([
    prisma.legalMatter.findMany({ where, include: matterInclude, orderBy: { updatedAt: 'desc' }, skip, take: limit }),
    prisma.legalMatter.count({ where }),
  ]);
  res.json({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

async function getLegalMatter(req, res) {
  const tenantId = req.user.tenantId;
  const matter = await prisma.legalMatter.findFirst({
    where: { id: req.params.id, tenantId },
    include: { ...matterInclude, tasks: { include: taskInclude, orderBy: [{ status: 'asc' }, { dueAt: 'asc' }] } },
  });
  if (!matter) throw httpError(404, 'Caso jurídico não encontrado');
  const activities = await prisma.legalActivity.findMany({
    where: { tenantId, entityType: 'matter', entityId: matter.id },
    include: { actor: { select: userSummarySelect } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ ...matter, activities });
}

async function createLegalMatter(req, res) {
  const tenantId = req.user.tenantId;
  const data = buildLegalMatterData(req.body);
  const matter = await prisma.$transaction(async (tx) => {
    let lead;
    if (data.leadId) {
      lead = await requireTenantRecord(tx, 'legalLead', data.leadId, tenantId, 'Oportunidade', {
        id: true,
        contactId: true,
      });
      if (data.contactId && data.contactId !== lead.contactId) {
        throw httpError(400, 'A oportunidade e o contato informados não correspondem');
      }
      data.contactId = lead.contactId;
    }
    await requireTenantRecord(tx, 'contact', data.contactId, tenantId, 'Contato');
    if (data.responsibleUserId) await requireTenantUser(tx, data.responsibleUserId, tenantId, 'Responsável');
    validateLegalMatterState(data);
    const created = await tx.legalMatter.create({ data: { ...data, tenantId }, include: matterInclude });
    await recordActivity(tx, req, 'matter', created.id, 'matter.created', { status: created.status, area: created.area });
    return created;
  });
  res.status(201).json(matter);
}

async function updateLegalMatter(req, res) {
  const tenantId = req.user.tenantId;
  const existing = await prisma.legalMatter.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) throw httpError(404, 'Caso jurídico não encontrado');
  const data = buildLegalMatterData(req.body, { partial: true });
  if (!Object.keys(data).length) throw new LegalValidationError('Nenhum campo válido foi informado');
  if (data.status && ['ENCERRADO', 'ARQUIVADO'].includes(data.status) && data.closedAt === undefined) data.closedAt = new Date();
  if (data.status && !['ENCERRADO', 'ARQUIVADO'].includes(data.status)) data.closedAt = null;
  validateLegalMatterState({ ...existing, ...data });
  const updated = await prisma.$transaction(async (tx) => {
    if (data.contactId) await requireTenantRecord(tx, 'contact', data.contactId, tenantId, 'Contato');
    if (data.responsibleUserId) await requireTenantUser(tx, data.responsibleUserId, tenantId, 'Responsável');
    if (data.leadId) {
      const lead = await requireTenantRecord(tx, 'legalLead', data.leadId, tenantId, 'Oportunidade', {
        id: true,
        contactId: true,
      });
      if ((data.contactId || existing.contactId) !== lead.contactId) {
        throw httpError(400, 'A oportunidade e o contato informados não correspondem');
      }
    }
    const result = await tx.legalMatter.update({ where: { id: existing.id }, data, include: matterInclude });
    await recordActivity(tx, req, 'matter', result.id, 'matter.updated', {
      fields: changedFields(data),
      fromStatus: existing.status,
      toStatus: result.status,
    });
    return result;
  });
  res.json(updated);
}

async function listLegalTasks(req, res) {
  const tenantId = req.user.tenantId;
  const { page, limit, skip } = paginationFromQuery(req.query);
  const status = parseFilter(req.query.status, 'status', LEGAL_TASK_STATUSES);
  const type = parseFilter(req.query.type, 'type', LEGAL_TASK_TYPES);
  const priority = parseFilter(req.query.priority, 'priority', LEGAL_PRIORITIES);
  const where = {
    tenantId,
    ...(status && { status }),
    ...(type && { type }),
    ...(priority && { priority }),
    ...(req.query.assigneeId && { assigneeId: String(req.query.assigneeId) }),
    ...(req.query.leadId && { leadId: String(req.query.leadId) }),
    ...(req.query.matterId && { matterId: String(req.query.matterId) }),
  };
  if (req.query.overdue === 'true') {
    where.status = { in: ['PENDENTE', 'EM_ANDAMENTO'] };
    where.dueAt = { lt: new Date() };
  }
  const [items, total] = await Promise.all([
    prisma.legalTask.findMany({ where, include: taskInclude, orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }], skip, take: limit }),
    prisma.legalTask.count({ where }),
  ]);
  res.json({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

async function createLegalTask(req, res) {
  const tenantId = req.user.tenantId;
  const data = buildLegalTaskData(req.body);
  const task = await prisma.$transaction(async (tx) => {
    let matter;
    if (data.matterId) {
      matter = await requireTenantRecord(tx, 'legalMatter', data.matterId, tenantId, 'Caso jurídico', {
        id: true,
        leadId: true,
      });
      if (!data.leadId && matter.leadId) data.leadId = matter.leadId;
      if (data.leadId && matter.leadId && data.leadId !== matter.leadId) {
        throw httpError(400, 'A oportunidade e o caso informados não correspondem');
      }
    }
    if (data.leadId) await requireTenantRecord(tx, 'legalLead', data.leadId, tenantId, 'Oportunidade');
    if (data.assigneeId) await requireTenantUser(tx, data.assigneeId, tenantId, 'Responsável');
    validateLegalTaskState(data);
    if (data.status === 'CONCLUIDA' && !data.completedAt) data.completedAt = new Date();
    const created = await tx.legalTask.create({ data: { ...data, tenantId }, include: taskInclude });
    await recordActivity(tx, req, 'task', created.id, 'task.created', {
      type: created.type,
      priority: created.priority,
    });
    return created;
  });
  res.status(201).json(task);
}

async function updateLegalTask(req, res) {
  const tenantId = req.user.tenantId;
  const existing = await prisma.legalTask.findFirst({ where: { id: req.params.id, tenantId } });
  if (!existing) throw httpError(404, 'Tarefa não encontrada');
  const data = buildLegalTaskData(req.body, { partial: true });
  if (!Object.keys(data).length) throw new LegalValidationError('Nenhum campo válido foi informado');
  const finalState = { ...existing, ...data };
  validateLegalTaskState(finalState);
  if (data.status === 'CONCLUIDA' && data.completedAt === undefined) data.completedAt = new Date();
  if (data.status && data.status !== 'CONCLUIDA') data.completedAt = null;
  const updated = await prisma.$transaction(async (tx) => {
    if (data.leadId) await requireTenantRecord(tx, 'legalLead', data.leadId, tenantId, 'Oportunidade');
    if (data.matterId) await requireTenantRecord(tx, 'legalMatter', data.matterId, tenantId, 'Caso jurídico');
    if (data.assigneeId) await requireTenantUser(tx, data.assigneeId, tenantId, 'Responsável');
    const result = await tx.legalTask.update({ where: { id: existing.id }, data, include: taskInclude });
    await recordActivity(tx, req, 'task', result.id, 'task.updated', {
      fields: changedFields(data),
      fromStatus: existing.status,
      toStatus: result.status,
    });
    return result;
  });
  res.json(updated);
}

function handleLegalError(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof LegalValidationError || error.statusCode) {
    return res.status(error.statusCode || 400).json({ error: error.message, details: error.details || undefined });
  }
  if (error.code === 'P2002') {
    return res.status(409).json({ error: 'Já existe um registro com este vínculo único', fields: error.meta?.target });
  }
  if (error.code === 'P2025') return res.status(404).json({ error: 'Registro não encontrado' });
  console.error('[legal] erro não tratado:', error);
  return res.status(500).json({ error: 'Erro interno ao processar dados jurídicos' });
}

module.exports = {
  httpError,
  requireTenantUser,
  recordActivity,
  changedFields,
  userSummarySelect,
  safeSearch,
  getLegalConfig,
  getLegalSummary,
  listLegalLeads,
  getLegalLead,
  createLegalLead,
  updateLegalLead,
  listLegalMatters,
  getLegalMatter,
  createLegalMatter,
  updateLegalMatter,
  listLegalTasks,
  createLegalTask,
  updateLegalTask,
  handleLegalError,
};
