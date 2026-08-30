const axios = require('axios');
const prisma = require('../lib/prisma');
const {
  recordOperationalEvent,
  resolveOperationalEventByExternalId,
} = require('./operationalMonitorService');

const UPTIMEROBOT_API_URL = 'https://api.uptimerobot.com/v3/monitors';
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const MIN_INTERVAL_MS = 60 * 1000;
const MAX_INTERVAL_MS = 60 * 60 * 1000;

let timer = null;
let checkInProgress = false;
let snapshot = createSnapshot({ state: 'not_configured' });

function parseMonitorIds(value) {
  return String(value || '')
    .split(/[\s,;-]+/)
    .map((item) => item.trim())
    .filter((item) => /^\d+$/.test(item));
}

function getConfig() {
  const provider = String(process.env.UPTIME_PROVIDER || 'uptimerobot').trim().toLowerCase();
  const apiKey = String(process.env.UPTIME_ROBOT_API_KEY || '').trim();
  const rawInterval = Number.parseInt(process.env.UPTIME_ROBOT_INTERVAL_MS, 10);
  const intervalMs = Number.isFinite(rawInterval)
    ? Math.min(Math.max(rawInterval, MIN_INTERVAL_MS), MAX_INTERVAL_MS)
    : DEFAULT_INTERVAL_MS;

  return {
    provider,
    apiKey,
    monitorIds: parseMonitorIds(process.env.UPTIME_ROBOT_MONITOR_IDS),
    intervalMs,
    timeoutMs: Math.min(Math.max(Number.parseInt(process.env.UPTIME_ROBOT_TIMEOUT_MS, 10) || 10000, 3000), 30000),
    apiUrl: String(process.env.UPTIME_ROBOT_API_URL || UPTIMEROBOT_API_URL).trim() || UPTIMEROBOT_API_URL,
  };
}

function createSnapshot(overrides = {}) {
  return {
    configured: false,
    provider: 'uptimerobot',
    state: 'not_configured',
    lastCheckedAt: null,
    lastError: null,
    monitors: [],
    counts: { up: 0, down: 0, degraded: 0, paused: 0 },
    ...overrides,
  };
}

function monitorStatus(statusCode) {
  const code = Number(statusCode);
  const label = String(statusCode || '').trim().toUpperCase();
  if (code === 2 || label === 'UP') return 'up';
  if (code === 8 || label === 'LOOKS_DOWN') return 'degraded';
  if (code === 9 || label === 'DOWN') return 'down';
  if (code === 0 || label === 'PAUSED') return 'paused';
  if (code === 1 || label === 'STARTED') return 'pending';
  return 'unknown';
}

function safeMonitorUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return `${url.protocol}//${url.host}${url.pathname}`.slice(0, 500);
  } catch {
    return String(value || '').slice(0, 500);
  }
}

function normalizeMonitor(monitor) {
  const id = String(monitor?.id || '');
  const statusCode = monitor?.status;
  return {
    id,
    friendlyName: String(monitor?.friendlyName || monitor?.friendly_name || `Monitor ${id || 'externo'}`).slice(0, 120),
    url: safeMonitorUrl(monitor?.url),
    statusCode: statusCode == null ? null : String(statusCode).slice(0, 40),
    status: monitorStatus(statusCode),
    uptimeRatio: monitor?.all_time_uptime_ratio == null ? null : String(monitor.all_time_uptime_ratio).slice(0, 30),
    responseTime: Number.isFinite(Number(monitor?.response_time)) ? Number(monitor.response_time) : null,
    interval: Number.isFinite(Number(monitor?.interval)) ? Number(monitor.interval) : null,
  };
}

function calculateState(monitors) {
  if (!monitors.length) return 'no_monitors';
  if (monitors.some((monitor) => monitor.status === 'down')) return 'down';
  if (monitors.some((monitor) => ['degraded', 'pending', 'paused', 'unknown'].includes(monitor.status))) return 'degraded';
  return 'up';
}

function calculateCounts(monitors) {
  return monitors.reduce((counts, monitor) => {
    if (monitor.status === 'up') counts.up += 1;
    else if (monitor.status === 'down') counts.down += 1;
    else if (monitor.status === 'paused') counts.paused += 1;
    else counts.degraded += 1;
    return counts;
  }, { up: 0, down: 0, degraded: 0, paused: 0 });
}

function providerErrorMessage(error, apiKey) {
  if (error?.response?.status) return `UptimeRobot respondeu HTTP ${error.response.status}.`;
  return String(error?.message || 'Não foi possível consultar o provedor de uptime.')
    .replace(apiKey, '[redacted]')
    .slice(0, 240);
}

async function resolveMonitorTenant() {
  if (!process.env.DATABASE_URL || !prisma.tenant?.findUnique) return null;
  const slug = process.env.UPTIME_ROBOT_TENANT_SLUG
    || process.env.PUBLIC_MONITOR_TENANT_SLUG
    || process.env.PUBLIC_CALCULATOR_TENANT_SLUG;
  if (!slug) return null;
  return prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
}

async function fetchMonitors(config) {
  const firstUrl = new URL(config.apiUrl);
  firstUrl.searchParams.set('limit', '200');
  let nextUrl = firstUrl.toString();
  const monitors = [];

  for (let page = 0; nextUrl && page < 10; page += 1) {
    const response = await axios.get(nextUrl, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: 'application/json',
      },
      timeout: config.timeoutMs,
    });
    const payload = response.data || {};
    const pageMonitors = Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload.monitors)
        ? payload.monitors
        : [];
    monitors.push(...pageMonitors);
    const candidateNextUrl = payload.nextLink || payload.next_link || null;
    nextUrl = candidateNextUrl && candidateNextUrl !== nextUrl ? String(candidateNextUrl) : null;
  }

  if (!monitors.length && config.monitorIds.length) {
    throw new Error('Nenhum monitor foi retornado para os IDs configurados.');
  }

  return monitors
    .filter((monitor) => !config.monitorIds.length || config.monitorIds.includes(String(monitor?.id)))
    .map(normalizeMonitor)
    .filter((monitor) => monitor.id);
}

async function syncUptimeStatus() {
  if (checkInProgress) return snapshot;
  checkInProgress = true;
  const config = getConfig();

  if (config.provider !== 'uptimerobot' || !config.apiKey) {
    snapshot = createSnapshot({
      provider: config.provider || 'uptimerobot',
      state: 'not_configured',
      lastCheckedAt: new Date().toISOString(),
    });
    checkInProgress = false;
    return snapshot;
  }

  try {
    const [monitors, tenant] = await Promise.all([
      fetchMonitors(config),
      resolveMonitorTenant(),
    ]);
    const counts = calculateCounts(monitors);
    snapshot = createSnapshot({
      configured: true,
      provider: config.provider,
      state: calculateState(monitors),
      lastCheckedAt: new Date().toISOString(),
      monitors,
      counts,
    });

    for (const monitor of monitors) {
      const externalId = `uptimerobot:monitor:${monitor.id}`;
      if (['down', 'degraded'].includes(monitor.status)) {
        await recordOperationalEvent({
          tenantId: tenant?.id || null,
          source: 'system',
          channel: 'uptimerobot',
          eventType: 'uptime_monitor',
          status: 'failed',
          severity: monitor.status === 'down' ? 'critical' : 'warning',
          summary: `${monitor.friendlyName}: ${monitor.status === 'down' ? 'fora do ar' : 'sem confirmação de disponibilidade'}`,
          details: {
            monitorId: monitor.id,
            url: monitor.url,
            providerStatus: monitor.statusCode,
            status: monitor.status,
            uptimeRatio: monitor.uptimeRatio,
            responseTime: monitor.responseTime,
          },
          externalId,
        });
      } else if (monitor.status === 'up') {
        await resolveOperationalEventByExternalId({ externalId, tenantId: tenant?.id || null });
      }
    }

    await resolveOperationalEventByExternalId({
      externalId: 'uptimerobot:provider',
      tenantId: tenant?.id || null,
    });
  } catch (error) {
    const message = providerErrorMessage(error, config.apiKey);
    const tenant = await resolveMonitorTenant().catch(() => null);
    snapshot = createSnapshot({
      configured: true,
      provider: config.provider,
      state: 'provider_error',
      lastCheckedAt: new Date().toISOString(),
      lastError: message,
    });
    await recordOperationalEvent({
      tenantId: tenant?.id || null,
      source: 'system',
      channel: 'uptimerobot',
      eventType: 'uptime_provider',
      status: 'failed',
      severity: 'critical',
      summary: 'Não foi possível consultar o monitor externo de uptime.',
      details: { message },
      externalId: 'uptimerobot:provider',
    });
  } finally {
    checkInProgress = false;
  }

  return snapshot;
}

function startUptimeMonitor() {
  if (timer) return;
  const config = getConfig();
  if (config.provider !== 'uptimerobot' || !config.apiKey) return;

  void syncUptimeStatus();
  timer = setInterval(() => {
    void syncUptimeStatus();
  }, config.intervalMs);
  timer.unref?.();
  console.log(`[uptime] UptimeRobot habilitado; consulta a cada ${Math.round(config.intervalMs / 1000)}s.`);
}

function getUptimeOverview() {
  return JSON.parse(JSON.stringify(snapshot));
}

module.exports = {
  getUptimeOverview,
  normalizeMonitor,
  monitorStatus,
  syncUptimeStatus,
  startUptimeMonitor,
};
