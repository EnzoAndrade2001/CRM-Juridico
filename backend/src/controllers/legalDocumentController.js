const fs = require('fs');

const prisma = require('../lib/prisma');
const { LegalValidationError, paginationFromQuery, normalizedEnumToken } = require('../domain/legalDomain');
const {
  LEGAL_DOCUMENT_KINDS,
  LEGAL_DOCUMENT_STATUSES,
  REVIEW_STATUSES,
  buildLegalDocumentData,
  validateLegalDocumentState,
} = require('../domain/legalDocumentDomain');
const {
  absolutePathFor,
  storeDocumentFile,
  removeDocumentFile,
} = require('../utils/legalStorage');
const {
  httpError,
  recordActivity,
  changedFields,
  userSummarySelect,
  safeSearch,
} = require('./legalController');

const PENDING_STATUSES = ['SOLICITADO'];

const documentInclude = {
  contact: { select: { id: true, name: true, phone: true, email: true } },
  lead: { select: { id: true, title: true, stage: true, area: true } },
  matter: { select: { id: true, title: true, status: true, caseNumber: true } },
  requestedBy: { select: userSummarySelect },
  reviewedBy: { select: userSummarySelect },
};

// O binário e a chave de armazenamento nunca saem da API; o cliente recebe apenas
// os metadados e a rota autenticada de download.
function presentDocument(document) {
  const { storageKey, ...rest } = document;
  return {
    ...rest,
    hasFile: Boolean(storageKey),
    downloadUrl: storageKey ? `/api/legal/documents/${document.id}/file` : null,
  };
}

function parseFilter(value, field, allowed) {
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = normalizedEnumToken(value);
  if (!allowed.includes(normalized)) {
    throw new LegalValidationError(`${field} inválido`, [{ field, code: 'invalid_enum', allowed }]);
  }
  return normalized;
}

// Resolve e valida os vínculos com contato, oportunidade e caso do mesmo escritório,
// derivando o contato quando somente a oportunidade ou o caso foi informado.
async function resolveDocumentLinks(tx, tenantId, data, existing = {}) {
  const links = {
    contactId: data.contactId ?? existing.contactId ?? null,
    leadId: data.leadId !== undefined ? data.leadId : existing.leadId ?? null,
    matterId: data.matterId !== undefined ? data.matterId : existing.matterId ?? null,
  };

  let lead = null;
  if (links.leadId) {
    lead = await tx.legalLead.findFirst({
      where: { id: links.leadId, tenantId },
      select: { id: true, contactId: true },
    });
    if (!lead) throw httpError(400, 'Oportunidade não pertence a este escritório ou não existe');
  }

  let matter = null;
  if (links.matterId) {
    matter = await tx.legalMatter.findFirst({
      where: { id: links.matterId, tenantId },
      select: { id: true, contactId: true, leadId: true },
    });
    if (!matter) throw httpError(400, 'Caso jurídico não pertence a este escritório ou não existe');
  }

  if (matter && lead && matter.leadId && matter.leadId !== lead.id) {
    throw httpError(400, 'A oportunidade e o caso informados não correspondem');
  }

  const derivedContactId = links.contactId || matter?.contactId || lead?.contactId || null;
  if (!derivedContactId) {
    throw new LegalValidationError('contactId, leadId ou matterId é obrigatório', [
      { field: 'contactId', code: 'required_reference' },
    ]);
  }
  if (lead && lead.contactId !== derivedContactId) {
    throw httpError(400, 'A oportunidade informada pertence a outro cliente');
  }
  if (matter && matter.contactId !== derivedContactId) {
    throw httpError(400, 'O caso informado pertence a outro cliente');
  }

  const contact = await tx.contact.findFirst({
    where: { id: derivedContactId, tenantId },
    select: { id: true },
  });
  if (!contact) throw httpError(400, 'Cliente não pertence a este escritório ou não existe');

  return { contactId: derivedContactId, leadId: links.leadId, matterId: links.matterId };
}

// Mantém as datas de recebimento e análise coerentes com a situação informada.
function applyStatusTimestamps(data, finalState, actorId) {
  if (!data.status) return data;
  if (REVIEW_STATUSES.includes(data.status)) {
    if (data.reviewedAt === undefined) data.reviewedAt = new Date();
    data.reviewedById = actorId || null;
  } else {
    data.reviewedAt = null;
    data.reviewedById = null;
    if (data.status !== 'ARQUIVADO') data.reviewNotes = data.reviewNotes ?? null;
  }
  if (data.status === 'SOLICITADO') data.receivedAt = null;
  else if (finalState.storageKey && !finalState.receivedAt) data.receivedAt = new Date();
  return data;
}

async function listLegalDocuments(req, res) {
  const tenantId = req.user.tenantId;
  const { page, limit, skip } = paginationFromQuery(req.query);
  const status = parseFilter(req.query.status, 'status', LEGAL_DOCUMENT_STATUSES);
  const kind = parseFilter(req.query.kind, 'kind', LEGAL_DOCUMENT_KINDS);
  const search = safeSearch(req.query.search);
  const where = {
    tenantId,
    ...(status && { status }),
    ...(kind && { kind }),
    ...(req.query.contactId && { contactId: String(req.query.contactId) }),
    ...(req.query.leadId && { leadId: String(req.query.leadId) }),
    ...(req.query.matterId && { matterId: String(req.query.matterId) }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { fileName: { contains: search, mode: 'insensitive' } },
        { contact: { name: { contains: search, mode: 'insensitive' } } },
      ],
    }),
  };
  if (req.query.pending === 'true') where.status = { in: PENDING_STATUSES };
  if (req.query.overdue === 'true') {
    where.status = { in: PENDING_STATUSES };
    where.dueAt = { lt: new Date() };
  }

  const [items, total] = await Promise.all([
    prisma.legalDocument.findMany({
      where,
      include: documentInclude,
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.legalDocument.count({ where }),
  ]);
  res.json({
    items: items.map(presentDocument),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

async function getLegalDocument(req, res) {
  const tenantId = req.user.tenantId;
  const document = await prisma.legalDocument.findFirst({
    where: { id: req.params.id, tenantId },
    include: documentInclude,
  });
  if (!document) throw httpError(404, 'Documento não encontrado');
  const activities = await prisma.legalActivity.findMany({
    where: { tenantId, entityType: 'document', entityId: document.id },
    include: { actor: { select: userSummarySelect } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ ...presentDocument(document), activities });
}

// Solicita um documento ao cliente. Quando o arquivo acompanha a requisição
// (multipart), o documento já nasce recebido.
async function createLegalDocument(req, res) {
  const tenantId = req.user.tenantId;
  const data = buildLegalDocumentData(req.body);
  const file = req.file || null;

  let stored = null;
  try {
    const document = await prisma.$transaction(async (tx) => {
      const links = await resolveDocumentLinks(tx, tenantId, data);
      const status = data.status || (file ? 'RECEBIDO' : 'SOLICITADO');
      validateLegalDocumentState({ ...data, status }, { hasFile: Boolean(file) });

      if (file) stored = await storeDocumentFile(tenantId, file);

      const created = await tx.legalDocument.create({
        data: {
          ...data,
          ...links,
          tenantId,
          status,
          source: data.source || (file ? 'upload' : 'solicitacao'),
          requestedById: req.user.userId || null,
          ...(stored && { ...stored, receivedAt: new Date() }),
        },
        include: documentInclude,
      });
      await recordActivity(tx, req, 'document', created.id, file ? 'document.uploaded' : 'document.requested', {
        kind: created.kind,
        status: created.status,
        hasFile: Boolean(stored),
      });
      return created;
    });
    res.status(201).json(presentDocument(document));
  } catch (error) {
    // Sem transação no sistema de arquivos: remove o binário se o registro falhou.
    if (stored) await removeDocumentFile(stored.storageKey).catch(() => {});
    throw error;
  }
}

// Anexa o arquivo a uma solicitação existente.
async function uploadLegalDocumentFile(req, res) {
  const tenantId = req.user.tenantId;
  if (!req.file) throw new LegalValidationError('Nenhum arquivo enviado', [{ field: 'file', code: 'required' }]);

  const existing = await prisma.legalDocument.findFirst({
    where: { id: req.params.id, tenantId },
    select: { id: true, storageKey: true, status: true, receivedAt: true },
  });
  if (!existing) throw httpError(404, 'Documento não encontrado');
  if (existing.status === 'ARQUIVADO') throw httpError(409, 'Documento arquivado não aceita novo arquivo');

  const stored = await storeDocumentFile(tenantId, req.file);
  try {
    const document = await prisma.$transaction(async (tx) => {
      const updated = await tx.legalDocument.update({
        where: { id: existing.id },
        data: {
          ...stored,
          status: 'RECEBIDO',
          receivedAt: new Date(),
          reviewedAt: null,
          reviewedById: null,
          source: 'upload',
        },
        include: documentInclude,
      });
      await recordActivity(tx, req, 'document', updated.id, 'document.uploaded', {
        replacedPreviousFile: Boolean(existing.storageKey),
        fileSize: stored.fileSize,
      });
      return updated;
    });
    // Só descarta a versão anterior depois que a nova foi persistida.
    if (existing.storageKey) await removeDocumentFile(existing.storageKey).catch(() => {});
    res.json(presentDocument(document));
  } catch (error) {
    await removeDocumentFile(stored.storageKey).catch(() => {});
    throw error;
  }
}

async function updateLegalDocument(req, res) {
  const tenantId = req.user.tenantId;
  const existing = await prisma.legalDocument.findFirst({
    where: { id: req.params.id, tenantId },
  });
  if (!existing) throw httpError(404, 'Documento não encontrado');

  const data = buildLegalDocumentData(req.body, { partial: true });
  if (!Object.keys(data).length) throw new LegalValidationError('Nenhum campo válido foi informado');

  const finalState = { ...existing, ...data };
  validateLegalDocumentState(finalState, { hasFile: Boolean(existing.storageKey) });
  applyStatusTimestamps(data, finalState, req.user.userId);

  const document = await prisma.$transaction(async (tx) => {
    if (data.contactId !== undefined || data.leadId !== undefined || data.matterId !== undefined) {
      Object.assign(data, await resolveDocumentLinks(tx, tenantId, data, existing));
    }
    const updated = await tx.legalDocument.update({
      where: { id: existing.id },
      data,
      include: documentInclude,
    });
    await recordActivity(tx, req, 'document', updated.id, 'document.updated', {
      fields: changedFields(data),
      fromStatus: existing.status,
      toStatus: updated.status,
    });
    return updated;
  });
  res.json(presentDocument(document));
}

// Download autenticado: o arquivo nunca é exposto pelo diretório estático.
async function downloadLegalDocument(req, res) {
  const tenantId = req.user.tenantId;
  const document = await prisma.legalDocument.findFirst({
    where: { id: req.params.id, tenantId },
    select: { id: true, storageKey: true, fileName: true, mimeType: true },
  });
  if (!document) throw httpError(404, 'Documento não encontrado');
  if (!document.storageKey) throw httpError(409, 'Este documento ainda não possui arquivo enviado');

  const absolutePath = absolutePathFor(document.storageKey);
  if (!fs.existsSync(absolutePath)) throw httpError(410, 'O arquivo deste documento não está mais disponível');

  await prisma.legalActivity.create({
    data: {
      tenantId,
      actorId: req.user.userId || null,
      entityType: 'document',
      entityId: document.id,
      type: 'document.downloaded',
    },
  });

  res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${document.fileName || 'documento'}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  fs.createReadStream(absolutePath).pipe(res);
}

module.exports = {
  listLegalDocuments,
  getLegalDocument,
  createLegalDocument,
  uploadLegalDocumentFile,
  updateLegalDocument,
  downloadLegalDocument,
};
