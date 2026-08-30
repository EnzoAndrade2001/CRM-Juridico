const prisma = require('../lib/prisma');
const {
  recordOperationalEvent,
  resolveOperationalEvent,
} = require('../services/operationalMonitorService');
const { getUptimeOverview } = require('../services/uptimeMonitorService');

const publicEventTimestamps = new Map();
const PUBLIC_EVENT_WINDOW_MS = 60 * 1000;
const PUBLIC_EVENT_LIMIT = 12;

function isSuperAdmin(req) {
  return String(req.user?.role || '').toLowerCase() === 'superadmin';
}

function canManage(req) {
  return ['admin', 'superadmin'].includes(String(req.user?.role || '').toLowerCase());
}

function getTenantScope(req) {
  if (isSuperAdmin(req) && req.query.tenantId) return { tenantId: String(req.query.tenantId) };
  if (isSuperAdmin(req)) return {};
  return { tenantId: req.user.tenantId };
}

function asList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function getOverview(req, res) {
  if (!canManage(req)) return res.status(403).json({ error: 'Acesso restrito a administradores.' });
  if (!isSuperAdmin(req) && !req.user?.tenantId) return res.status(403).json({ error: 'Tenant não identificado.' });

  const tenantScope = getTenantScope(req);
  const statuses = asList(req.query.status).filter((value) => ['pending', 'processing', 'failed', 'resolved', 'ignored'].includes(value));
  const sources = asList(req.query.source).filter((value) => ['crm', 'integration', 'site', 'landing', 'system'].includes(value));
  const severity = String(req.query.severity || '').trim();
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 80, 1), 200);
  const where = {
    ...tenantScope,
    ...(statuses.length ? { status: { in: statuses } } : {}),
    ...(sources.length ? { source: { in: sources } } : {}),
    ...(severity && ['info', 'warning', 'error', 'critical'].includes(severity) ? { severity } : {}),
  };

  const activeWhere = {
    ...tenantScope,
    status: { in: ['pending', 'processing', 'failed'] },
  };
  const uptime = getUptimeOverview();

  const [events, pendingCount, failedCount, criticalCount, connectedInstances, disconnectedInstances, pendingSyncCount, pendingLandingLeads] = await Promise.all([
    prisma.operationalEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    }),
    prisma.operationalEvent.count({ where: { ...tenantScope, status: { in: ['pending', 'processing'] } } }),
    prisma.operationalEvent.count({ where: { ...tenantScope, status: 'failed' } }),
    prisma.operationalEvent.count({ where: { ...activeWhere, severity: 'critical' } }),
    prisma.waInstance.count({ where: { ...tenantScope, status: { in: ['connected', 'open'] } } }),
    prisma.waInstance.count({ where: { ...tenantScope, status: { notIn: ['connected', 'open'] } } }),
    prisma.externalSyncRecord.count({ where: { ...tenantScope, syncedAt: null } }),
    prisma.calculatorSubmission.count({ where: { ...tenantScope, status: { in: ['received', 'pending', 'partial'] } } }),
  ]);

  return res.json({
    generatedAt: new Date().toISOString(),
    summary: {
      pending: pendingCount,
      failed: failedCount,
      critical: criticalCount,
      pendingSync: pendingSyncCount,
      pendingLandingLeads,
      connectedInstances,
      disconnectedInstances,
      externalUptimeDown: uptime.counts.down,
    },
    uptime,
    events,
  });
}

async function markResolved(req, res) {
  if (!canManage(req)) return res.status(403).json({ error: 'Acesso restrito a administradores.' });
  if (!isSuperAdmin(req) && !req.user?.tenantId) return res.status(403).json({ error: 'Tenant não identificado.' });
  const status = req.body?.status === 'ignored' ? 'ignored' : 'resolved';
  const count = await resolveOperationalEvent({
    id: req.params.id,
    tenantId: isSuperAdmin(req) ? null : req.user.tenantId,
    status,
  });
  if (!count) return res.status(404).json({ error: 'Evento não encontrado ou já encerrado.' });
  return res.json({ ok: true, status });
}

function clientKey(req) {
  return String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'unknown';
}

function publicRateLimited(req) {
  const key = clientKey(req);
  const now = Date.now();
  for (const [storedKey, storedTimestamps] of publicEventTimestamps) {
    const activeTimestamps = storedTimestamps.filter((timestamp) => now - timestamp < PUBLIC_EVENT_WINDOW_MS);
    if (activeTimestamps.length) publicEventTimestamps.set(storedKey, activeTimestamps);
    else publicEventTimestamps.delete(storedKey);
  }
  const timestamps = (publicEventTimestamps.get(key) || []).filter((timestamp) => now - timestamp < PUBLIC_EVENT_WINDOW_MS);
  if (timestamps.length >= PUBLIC_EVENT_LIMIT) {
    publicEventTimestamps.set(key, timestamps);
    return true;
  }
  timestamps.push(now);
  publicEventTimestamps.set(key, timestamps);
  return false;
}

async function resolvePublicTenant() {
  const slug = process.env.PUBLIC_MONITOR_TENANT_SLUG
    || process.env.PUBLIC_CALCULATOR_TENANT_SLUG
    || process.env.LEGAL_LANDING_TENANT_SLUG;
  if (!slug) return null;
  return prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
}

async function ingestPublicEvent(req, res) {
  if (publicRateLimited(req)) return res.status(429).json({ accepted: false, error: 'Muitos eventos em pouco tempo.' });
  const body = req.body || {};
  const summary = String(body.summary || '').trim();
  const eventType = String(body.eventType || 'client_error').trim();
  if (!summary || summary.length > 240) return res.status(400).json({ accepted: false, error: 'Resumo inválido.' });

  const source = ['site', 'landing'].includes(body.source) ? body.source : 'site';
  const tenant = await resolvePublicTenant();
  await recordOperationalEvent({
    tenantId: tenant?.id || null,
    source,
    channel: String(body.siteKey || body.origin || 'public').slice(0, 80),
    eventType: eventType.slice(0, 80),
    status: 'failed',
    severity: body.severity === 'warning' ? 'warning' : 'error',
    summary,
    details: {
      path: String(body.path || '').slice(0, 240),
      origin: String(body.origin || '').slice(0, 240),
      detail: String(body.details || '').slice(0, 1200),
    },
  });
  return res.status(202).json({ accepted: true });
}

module.exports = { getOverview, markResolved, ingestPublicEvent };
