import { BACKEND_URL } from './api';

const ENDPOINT = `${BACKEND_URL}/api/operational-monitor/public-events`;
const TELEMETRY_ENABLED = String(import.meta.env.VITE_PUBLIC_MONITOR_ENABLED ?? 'true').toLowerCase() !== 'false';
const recentErrors = new Map();
const REPORT_COOLDOWN_MS = 60 * 1000;

function isPublicExperience() {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname.toLowerCase();
  const privateRoots = ['/dashboard', '/inbox', '/contacts', '/crm', '/connections', '/campaigns', '/leads', '/settings', '/operational-monitor', '/superadmin', '/juridico'];
  return !privateRoots.some((root) => path === root || path.startsWith(`${root}/`));
}

function getSource() {
  const path = window.location.pathname.toLowerCase();
  const host = window.location.hostname.toLowerCase();
  const isLanding = host.includes('revisional')
    || path.includes('revisional')
    || path.includes('registro-de-marca')
    || path.includes('autismo');
  return isLanding ? 'landing' : 'site';
}

function stringifyReason(reason) {
  if (reason instanceof Error) return `${reason.message}\n${reason.stack || ''}`.slice(0, 1800);
  if (typeof reason === 'string') return reason.slice(0, 1800);
  try {
    return JSON.stringify(reason).slice(0, 1800);
  } catch {
    return 'Falha não serializável';
  }
}

export function reportClientError({ summary, details = '', eventType = 'client_error', severity = 'error' }) {
  if (!TELEMETRY_ENABLED || typeof window === 'undefined' || !isPublicExperience() || !summary) return;
  const key = `${eventType}:${summary}`;
  const lastReportedAt = recentErrors.get(key) || 0;
  if (Date.now() - lastReportedAt < REPORT_COOLDOWN_MS) return;
  recentErrors.set(key, Date.now());

  const body = JSON.stringify({
    source: getSource(),
    siteKey: window.location.hostname,
    origin: window.location.origin,
    path: window.location.pathname,
    eventType,
    severity,
    summary: String(summary).slice(0, 240),
    details: String(details).slice(0, 1800),
  });

  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
    credentials: 'omit',
  }).catch(() => {});
}

export function installClientTelemetry() {
  if (!TELEMETRY_ENABLED || typeof window === 'undefined' || window.__operationalTelemetryInstalled || !isPublicExperience()) return () => {};
  window.__operationalTelemetryInstalled = true;

  const handleError = (event) => {
    reportClientError({
      summary: event.message || 'Erro JavaScript no site público',
      details: `${event.filename || ''}:${event.lineno || ''}:${event.colno || ''}`,
      eventType: 'javascript_error',
    });
  };
  const handleRejection = (event) => {
    reportClientError({
      summary: 'Promise rejeitada no site público',
      details: stringifyReason(event.reason),
      eventType: 'unhandled_rejection',
    });
  };

  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleRejection);
  return () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleRejection);
    window.__operationalTelemetryInstalled = false;
  };
}
