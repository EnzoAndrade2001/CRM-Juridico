const prisma = require('../lib/prisma');

const MAX_DETAILS_LENGTH = 6000;
const MAX_SUMMARY_LENGTH = 240;
const SECRET_KEY_PATTERN = /(authorization|token|secret|password|apikey|api_key|access.?key|cookie)/i;
const SECRET_TEXT_PATTERN = /(authorization|token|secret|password|apikey|api_key|access.?key|cookie)(\s*[:=]\s*)[^\s,;]+/gi;

function sanitizeText(value, maxLength = 1200) {
  return String(value).replace(SECRET_TEXT_PATTERN, '$1$2[redacted]').slice(0, maxLength);
}

function sanitize(value, depth = 0) {
  if (depth > 4) return '[depth-limit]';
  if (value == null) return value;
  if (typeof value === 'string') return sanitizeText(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 30).map((item) => sanitize(item, depth + 1));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).slice(0, 40).map(([key, item]) => [
        key,
        SECRET_KEY_PATTERN.test(key) ? '[redacted]' : sanitize(item, depth + 1),
      ]),
    );
  }
  return String(value).slice(0, 1200);
}

function serializeDetails(details) {
  if (details == null) return null;
  const safeDetails = typeof details === 'string' ? sanitizeText(details, MAX_DETAILS_LENGTH) : JSON.stringify(sanitize(details));
  return safeDetails.slice(0, MAX_DETAILS_LENGTH);
}

function normalizeStatus(status) {
  return ['pending', 'processing', 'failed', 'resolved', 'ignored'].includes(status) ? status : 'failed';
}

function normalizeSeverity(severity) {
  return ['info', 'warning', 'error', 'critical'].includes(severity) ? severity : 'error';
}

async function recordOperationalEvent({
  tenantId = null,
  source = 'system',
  channel = null,
  eventType = 'unknown',
  status = 'failed',
  severity = 'error',
  summary = 'Evento operacional',
  details = null,
  externalId = null,
  requestId = null,
} = {}) {
  try {
    if (!process.env.DATABASE_URL || !prisma.operationalEvent?.create) return null;
    const normalizedSource = String(source).slice(0, 40);
    const normalizedEventType = String(eventType).slice(0, 80);
    const normalizedStatus = normalizeStatus(status);
    const normalizedSeverity = normalizeSeverity(severity);
    const data = {
      tenantId: tenantId || null,
      source: normalizedSource,
      channel: channel ? String(channel).slice(0, 80) : null,
      eventType: normalizedEventType,
      status: normalizedStatus,
      severity: normalizedSeverity,
      summary: String(summary || 'Evento operacional').slice(0, MAX_SUMMARY_LENGTH),
      details: serializeDetails(details),
      externalId: externalId ? String(externalId).slice(0, 160) : null,
      requestId: requestId ? String(requestId).slice(0, 100) : null,
    };

    // Conexões e integrações podem repetir o mesmo erro várias vezes. Agrupar
    // o evento aberto mantém o painel útil e preserva o total de tentativas.
    if (externalId && prisma.operationalEvent.findFirst && prisma.operationalEvent.update) {
      const existing = await prisma.operationalEvent.findFirst({
        where: {
          ...(tenantId ? { tenantId } : { tenantId: null }),
          source: normalizedSource,
          eventType: normalizedEventType,
          externalId: data.externalId,
          status: { in: ['pending', 'processing', 'failed'] },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) {
        return await prisma.operationalEvent.update({
          where: { id: existing.id },
          data: {
            ...data,
            attempts: { increment: 1 },
            lastAttemptAt: new Date(),
            resolvedAt: null,
          },
        });
      }
    }

    return await prisma.operationalEvent.create({ data: { ...data, lastAttemptAt: new Date() } });
  } catch (error) {
    // O monitor nunca pode derrubar o fluxo que ele próprio está observando.
    console.error('[operational-monitor] falha ao persistir evento:', error.message);
    return null;
  }
}

async function resolveOperationalEvent({ id, tenantId = null, status = 'resolved' }) {
  try {
    if (!process.env.DATABASE_URL || !prisma.operationalEvent?.updateMany) return 0;
    const result = await prisma.operationalEvent.updateMany({
      where: {
        id,
        ...(tenantId ? { tenantId } : {}),
        status: { in: ['pending', 'processing', 'failed'] },
      },
      data: {
        status: status === 'ignored' ? 'ignored' : 'resolved',
        resolvedAt: new Date(),
      },
    });
    return result.count;
  } catch (error) {
    console.error('[operational-monitor] falha ao resolver evento:', error.message);
    return 0;
  }
}

async function resolveOperationalEventByExternalId({ externalId, tenantId }) {
  if (!externalId || !tenantId) return 0;
  try {
    if (!process.env.DATABASE_URL || !prisma.operationalEvent?.updateMany) return 0;
    const result = await prisma.operationalEvent.updateMany({
      where: {
        tenantId,
        externalId,
        status: { in: ['pending', 'processing', 'failed'] },
      },
      data: { status: 'resolved', resolvedAt: new Date() },
    });
    return result.count;
  } catch (error) {
    console.error('[operational-monitor] falha ao resolver eventos relacionados:', error.message);
    return 0;
  }
}

module.exports = {
  recordOperationalEvent,
  resolveOperationalEvent,
  resolveOperationalEventByExternalId,
};
