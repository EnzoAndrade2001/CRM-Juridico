const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');

const {
  monitorStatus,
  normalizeMonitor,
  syncUptimeStatus,
} = require('../src/services/uptimeMonitorService');

test('interpreta os estados atuais do UptimeRobot', () => {
  assert.equal(monitorStatus('UP'), 'up');
  assert.equal(monitorStatus('LOOKS_DOWN'), 'degraded');
  assert.equal(monitorStatus('DOWN'), 'down');
  assert.equal(monitorStatus('PAUSED'), 'paused');
  assert.equal(monitorStatus('STARTED'), 'pending');
});

test('normaliza monitor sem expor credenciais ou querystring da URL', () => {
  const monitor = normalizeMonitor({
    id: 123,
    friendlyName: 'API de produção',
    status: 'UP',
    url: 'https://user:password@example.com/health?token=secret',
    interval: 300,
  });

  assert.deepEqual(monitor, {
    id: '123',
    friendlyName: 'API de produção',
    url: 'https://example.com/health',
    statusCode: 'UP',
    status: 'up',
    uptimeRatio: null,
    responseTime: null,
    interval: 300,
  });
});

test('consulta a API v3 e consolida a disponibilidade dos monitores', async (t) => {
  const originalGet = axios.get;
  const originals = {
    provider: process.env.UPTIME_PROVIDER,
    apiKey: process.env.UPTIME_ROBOT_API_KEY,
    apiUrl: process.env.UPTIME_ROBOT_API_URL,
    monitorIds: process.env.UPTIME_ROBOT_MONITOR_IDS,
    databaseUrl: process.env.DATABASE_URL,
  };
  t.after(() => {
    axios.get = originalGet;
    if (originals.provider === undefined) delete process.env.UPTIME_PROVIDER;
    else process.env.UPTIME_PROVIDER = originals.provider;
    if (originals.apiKey === undefined) delete process.env.UPTIME_ROBOT_API_KEY;
    else process.env.UPTIME_ROBOT_API_KEY = originals.apiKey;
    if (originals.apiUrl === undefined) delete process.env.UPTIME_ROBOT_API_URL;
    else process.env.UPTIME_ROBOT_API_URL = originals.apiUrl;
    if (originals.monitorIds === undefined) delete process.env.UPTIME_ROBOT_MONITOR_IDS;
    else process.env.UPTIME_ROBOT_MONITOR_IDS = originals.monitorIds;
    if (originals.databaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originals.databaseUrl;
  });

  process.env.UPTIME_PROVIDER = 'uptimerobot';
  process.env.UPTIME_ROBOT_API_KEY = 'test-api-key';
  process.env.UPTIME_ROBOT_API_URL = 'https://api.uptimerobot.com/v3/monitors';
  delete process.env.UPTIME_ROBOT_MONITOR_IDS;
  delete process.env.DATABASE_URL;
  let requestedUrl = '';
  axios.get = async (url) => {
    requestedUrl = url;
    return {
      data: {
        data: [
          { id: 101, friendlyName: 'Site institucional', status: 'UP', url: 'https://pbladvocacia.com.br/' },
          { id: 102, friendlyName: 'API do CRM', status: 'DOWN', url: 'https://api.example.com/health' },
        ],
        nextLink: null,
      },
    };
  };

  const snapshot = await syncUptimeStatus();

  assert.match(requestedUrl, /\/v3\/monitors\?limit=200$/);
  assert.equal(snapshot.configured, true);
  assert.equal(snapshot.state, 'down');
  assert.deepEqual(snapshot.counts, { up: 1, down: 1, degraded: 0, paused: 0 });
  assert.equal(snapshot.monitors[1].status, 'down');
});

test('não chama o provedor quando o uptime externo não está configurado', async (t) => {
  const originals = {
    provider: process.env.UPTIME_PROVIDER,
    apiKey: process.env.UPTIME_ROBOT_API_KEY,
  };
  t.after(() => {
    if (originals.provider === undefined) delete process.env.UPTIME_PROVIDER;
    else process.env.UPTIME_PROVIDER = originals.provider;
    if (originals.apiKey === undefined) delete process.env.UPTIME_ROBOT_API_KEY;
    else process.env.UPTIME_ROBOT_API_KEY = originals.apiKey;
  });

  delete process.env.UPTIME_PROVIDER;
  delete process.env.UPTIME_ROBOT_API_KEY;
  const snapshot = await syncUptimeStatus();

  assert.equal(snapshot.configured, false);
  assert.equal(snapshot.state, 'not_configured');
});
