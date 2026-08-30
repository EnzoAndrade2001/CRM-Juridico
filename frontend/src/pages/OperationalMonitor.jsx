import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Database,
  Globe2,
  RefreshCw,
  Server,
  ShieldAlert,
  Wifi,
  WifiOff,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { getOperationalMonitor, updateOperationalEvent } from '../services/api';

const SOURCE_LABELS = {
  crm: 'CRM',
  integration: 'Integração',
  site: 'Site',
  landing: 'Landing page',
  system: 'Sistema',
};

const STATUS_LABELS = {
  pending: 'Pendente',
  processing: 'Processando',
  failed: 'Falhou',
  resolved: 'Resolvido',
  ignored: 'Ignorado',
};

const SEVERITY_LABELS = {
  info: 'Informativo',
  warning: 'Atenção',
  error: 'Erro',
  critical: 'Crítico',
};

const UPTIME_STATE_LABELS = {
  up: 'Online',
  down: 'Fora do ar',
  degraded: 'Degradado',
  provider_error: 'Sem leitura',
  not_configured: 'Não configurado',
  no_monitors: 'Sem monitores',
};

function formatDate(value) {
  if (!value) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function displaySource(source) {
  return SOURCE_LABELS[source] || source || 'Outro';
}

export default function OperationalMonitor() {
  const [monitor, setMonitor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('pending,processing,failed');
  const [source, setSource] = useState('');
  const [severity, setSeverity] = useState('');
  const [resolvingId, setResolvingId] = useState('');

  async function load({ silent = false } = {}) {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await getOperationalMonitor({
        status,
        ...(source ? { source } : {}),
        ...(severity ? { severity } : {}),
      });
      setMonitor(data);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Não foi possível carregar o monitor.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load({ silent: true }), 30000);
    return () => window.clearInterval(timer);
  }, [status, source, severity]);

  async function resolveEvent(id, nextStatus = 'resolved') {
    setResolvingId(id);
    try {
      await updateOperationalEvent(id, nextStatus);
      await load({ silent: true });
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Não foi possível atualizar o evento.');
    } finally {
      setResolvingId('');
    }
  }

  const summary = monitor?.summary || {};
  const uptime = monitor?.uptime || {};
  const events = monitor?.events || [];
  const connectionLabel = summary.disconnectedInstances > 0
    ? `${summary.disconnectedInstances} desconectada${summary.disconnectedInstances === 1 ? '' : 's'}`
    : 'Todas conectadas';

  const filteredDescription = useMemo(() => {
    if (source) return `${displaySource(source)}: eventos recentes`;
    if (severity) return `${SEVERITY_LABELS[severity]}: eventos recentes`;
    return 'Eventos recentes que precisam de acompanhamento';
  }, [source, severity]);
  const uptimeState = uptime.state || 'not_configured';
  const uptimeLabel = UPTIME_STATE_LABELS[uptimeState] || 'Sem leitura';

  return (
    <div style={styles.container} className="operational-monitor">
      <PageHeader
        kicker="Operação"
        title="Monitor operacional"
        subtitle="Acompanhe conexões, integrações e eventos pendentes do CRM, do site e das landing pages."
        compact
        actions={(
          <button type="button" onClick={() => load({ silent: true })} style={styles.refreshButton} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'monitor-spin' : ''} />
            Atualizar
          </button>
        )}
      />

      {error ? <div style={styles.errorBanner}><AlertCircle size={17} />{error}</div> : null}

      <div style={styles.kpiGrid} className="monitor-kpi-grid">
        <Metric icon={<Clock3 size={20} />} label="Pendentes" value={summary.pending ?? '--'} tone="warning" />
        <Metric icon={<AlertCircle size={20} />} label="Falhas" value={summary.failed ?? '--'} tone="danger" />
        <Metric icon={<ShieldAlert size={20} />} label="Críticos" value={summary.critical ?? '--'} tone="critical" />
        <Metric
          icon={summary.disconnectedInstances > 0 ? <WifiOff size={20} /> : <Wifi size={20} />}
          label="WhatsApp"
          value={loading ? '--' : connectionLabel}
          tone={summary.disconnectedInstances > 0 ? 'danger' : 'success'}
          compactValue
        />
      </div>

      <div style={styles.healthStrip}>
        <div style={styles.healthItem}><Server size={17} /> API do CRM <strong style={styles.uptime_up}>respondendo</strong></div>
        <div style={styles.healthItem}><Globe2 size={17} /> Uptime externo <strong style={styles[`uptime_${uptimeState}`]}>{uptime.configured ? `${uptime.counts?.down || 0} fora do ar` : uptimeLabel}</strong></div>
        <div style={styles.healthItem}><Database size={17} /> Sincronizações pendentes <strong>{summary.pendingSync ?? '--'}</strong></div>
        <div style={styles.healthItem}><Activity size={17} /> Leads pendentes <strong>{summary.pendingLandingLeads ?? '--'}</strong></div>
        <div style={styles.healthItem}><Activity size={17} /> Última leitura <strong>{formatDate(monitor?.generatedAt)}</strong></div>
      </div>

      {uptime.configured && uptime.monitors?.length ? (
        <section style={styles.uptimeSection}>
          <div style={styles.uptimeHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Disponibilidade externa</h2>
              <p style={styles.sectionDescription}>Leitura dos monitores configurados no UptimeRobot.</p>
            </div>
            <span style={{ ...styles.uptimeState, ...styles[`uptimeState_${uptimeState}`] }}>{uptimeLabel}</span>
          </div>
          <div style={styles.uptimeGrid}>
            {uptime.monitors.map((externalMonitor) => (
              <div key={externalMonitor.id} style={styles.uptimeMonitor}>
                <span style={{ ...styles.uptimeDot, background: uptimeDotColor(externalMonitor.status) }} />
                <div style={styles.uptimeMonitorBody}>
                  <strong style={styles.uptimeMonitorName}>{externalMonitor.friendlyName}</strong>
                  {externalMonitor.url ? <a href={externalMonitor.url} target="_blank" rel="noreferrer" style={styles.uptimeMonitorUrl}>{externalMonitor.url}</a> : null}
                </div>
                <span style={{ ...styles.uptimeMonitorStatus, color: uptimeDotColor(externalMonitor.status) }}>{UPTIME_STATE_LABELS[externalMonitor.status] || 'Aguardando'}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {uptimeState === 'not_configured' ? (
        <div style={styles.uptimeNotice}><Globe2 size={17} /> Configure o UptimeRobot no backend para monitorar o site e a API mesmo quando o CRM estiver indisponível.</div>
      ) : null}
      {uptimeState === 'provider_error' ? (
        <div style={styles.uptimeNotice}><AlertCircle size={17} /> O CRM não conseguiu consultar o provedor externo: {uptime.lastError || 'verifique a chave e a API do UptimeRobot.'}</div>
      ) : null}
      {uptimeState === 'no_monitors' ? (
        <div style={styles.uptimeNotice}><Globe2 size={17} /> A chave do UptimeRobot está ativa, mas nenhum monitor foi encontrado.</div>
      ) : null}

      <section style={styles.eventsSection}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Eventos</h2>
            <p style={styles.sectionDescription}>{filteredDescription}</p>
          </div>
          <div style={styles.filters}>
            <select value={status} onChange={(event) => setStatus(event.target.value)} style={styles.select} aria-label="Filtrar por status">
              <option value="pending,processing,failed">Ativos</option>
              <option value="failed">Falhas</option>
              <option value="pending,processing">Pendentes</option>
              <option value="resolved">Resolvidos</option>
              <option value="ignored">Ignorados</option>
              <option value="">Todos</option>
            </select>
            <select value={source} onChange={(event) => setSource(event.target.value)} style={styles.select} aria-label="Filtrar por origem">
              <option value="">Todas as origens</option>
              <option value="crm">CRM</option>
              <option value="integration">Integrações</option>
              <option value="site">Site</option>
              <option value="landing">Landing pages</option>
              <option value="system">Sistema</option>
            </select>
            <select value={severity} onChange={(event) => setSeverity(event.target.value)} style={styles.select} aria-label="Filtrar por gravidade">
              <option value="">Todas as gravidades</option>
              <option value="critical">Críticos</option>
              <option value="error">Erros</option>
              <option value="warning">Atenção</option>
            </select>
          </div>
        </div>

        {loading ? <LoadingRows /> : null}
        {!loading && !events.length ? (
          <div style={styles.emptyState}>
            <CheckCircle2 size={28} />
            <strong>Nenhum evento nesta filtragem</strong>
            <span>Quando uma conexão ou integração falhar, o registro aparecerá aqui.</span>
          </div>
        ) : null}
        {!loading && events.length ? (
          <div style={styles.eventList}>
            {events.map((event) => (
              <EventRow key={event.id} event={event} resolving={resolvingId === event.id} onResolve={resolveEvent} />
            ))}
          </div>
        ) : null}
      </section>
      <style>{`
        @keyframes monitorSpin { to { transform: rotate(360deg); } }
        .monitor-spin { animation: monitorSpin .9s linear infinite; }
        .operational-monitor pre { max-width: 100%; overflow: auto; white-space: pre-wrap; word-break: break-word; font: inherit; }
        @media (max-width: 900px) {
          .operational-monitor { padding: 1rem !important; }
          .monitor-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .uptimeGrid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 560px) {
          .monitor-kpi-grid { grid-template-columns: 1fr !important; }
          .uptimeGrid { grid-template-columns: 1fr !important; }
          .operational-monitor .event-row { flex-direction: column; }
          .operational-monitor .event-date { order: -1; }
          .operational-monitor .resolve-button { align-self: flex-start; }
        }
      `}</style>
    </div>
  );
}

function Metric({ icon, label, value, tone, compactValue = false }) {
  return (
    <div style={styles.metric}>
      <div style={{ ...styles.metricIcon, ...styles[`tone_${tone}`] }}>{icon}</div>
      <div style={styles.metricBody}>
        <span style={styles.metricLabel}>{label}</span>
        <strong style={{ ...styles.metricValue, ...(compactValue ? styles.metricValueCompact : {}) }}>{value}</strong>
      </div>
    </div>
  );
}

function EventRow({ event, resolving, onResolve }) {
  const details = event.details ? String(event.details) : '';
  const isClosed = ['resolved', 'ignored'].includes(event.status);
  return (
    <article style={styles.eventRow} className="event-row">
      <div style={{ ...styles.severityBar, background: severityColor(event.severity) }} />
      <div style={styles.eventMain}>
        <div style={styles.eventTopline}>
          <div style={styles.eventBadges}>
            <span style={{ ...styles.badge, ...statusStyle(event.status) }}>{STATUS_LABELS[event.status] || event.status}</span>
            <span style={{ ...styles.badge, ...severityStyle(event.severity) }}>{SEVERITY_LABELS[event.severity] || event.severity}</span>
            <span style={styles.sourceBadge}>{displaySource(event.source)}{event.channel ? ` · ${event.channel}` : ''}</span>
          </div>
          <time style={styles.eventDate} className="event-date">{formatDate(event.createdAt)}</time>
        </div>
        <h3 style={styles.eventSummary}>{event.summary}</h3>
        <div style={styles.eventMeta}>
          <span>{event.eventType}</span>
          <span>{event.attempts || 1} tentativa{(event.attempts || 1) === 1 ? '' : 's'}</span>
          {event.requestId ? <span>req. {event.requestId.slice(0, 12)}</span> : null}
        </div>
        {details ? <details style={styles.details}><summary>Ver detalhes</summary><pre>{details}</pre></details> : null}
      </div>
      {!isClosed ? (
        <button type="button" style={styles.resolveButton} className="resolve-button" onClick={() => onResolve(event.id)} disabled={resolving}>
          <CheckCircle2 size={16} />
          {resolving ? 'Atualizando' : 'Resolver'}
        </button>
      ) : null}
    </article>
  );
}

function LoadingRows() {
  return <div style={styles.loadingRows}>{[1, 2, 3].map((item) => <div key={item} style={styles.loadingRow} />)}</div>;
}

function severityColor(severity) {
  return { critical: '#ef4444', error: '#f97316', warning: '#d4a72c', info: '#3b82f6' }[severity] || '#64748b';
}

function uptimeDotColor(status) {
  return { up: '#16a34a', down: '#dc2626', degraded: '#d97706', paused: '#64748b', pending: '#2563eb' }[status] || '#64748b';
}

function severityStyle(severity) {
  return { color: severityColor(severity), background: `${severityColor(severity)}18` };
}

function statusStyle(status) {
  if (status === 'resolved') return { color: '#16a34a', background: '#16a34a18' };
  if (status === 'ignored') return { color: '#64748b', background: '#64748b18' };
  if (status === 'processing') return { color: '#2563eb', background: '#2563eb18' };
  return { color: '#c2410c', background: '#c2410c18' };
}

const styles = {
  container: { flex: 1, overflowY: 'auto', padding: 'var(--space-8)', background: 'var(--bg-base)' },
  refreshButton: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', minHeight: '40px', padding: '0 0.9rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-control, 10px)', background: 'var(--bg-panel)', color: 'var(--text-main)', fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer' },
  errorBanner: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--space-5)', padding: '0.8rem 1rem', border: '1px solid var(--danger-border)', borderRadius: '10px', background: 'var(--danger-light)', color: 'var(--danger-text)' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' },
  metric: { display: 'flex', alignItems: 'center', gap: '0.8rem', minHeight: '92px', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-panel)' },
  metricIcon: { width: '38px', height: '38px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', flexShrink: 0 },
  tone_warning: { color: '#b7791f', background: 'rgba(212, 167, 44, .14)' },
  tone_danger: { color: '#dc2626', background: 'rgba(239, 68, 68, .13)' },
  tone_critical: { color: '#b91c1c', background: 'rgba(185, 28, 28, .14)' },
  tone_success: { color: '#15803d', background: 'rgba(22, 163, 74, .13)' },
  uptime_up: { color: '#15803d' },
  uptime_down: { color: '#dc2626' },
  uptime_degraded: { color: '#b45309' },
  uptime_provider_error: { color: '#dc2626' },
  uptime_not_configured: { color: 'var(--text-muted)' },
  uptime_no_monitors: { color: 'var(--text-muted)' },
  metricBody: { minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  metricLabel: { color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 700 },
  metricValue: { color: 'var(--text-main)', fontSize: '1.5rem', lineHeight: 1.1 },
  metricValueCompact: { fontSize: '1rem', whiteSpace: 'nowrap' },
  healthStrip: { display: 'flex', flexWrap: 'wrap', gap: '1rem 2rem', padding: '0.85rem 1rem', marginBottom: 'var(--space-6)', border: '1px solid var(--border-color)', borderRadius: '10px', background: 'var(--bg-surface)', color: 'var(--text-muted)', fontSize: '0.82rem' },
  healthItem: { display: 'inline-flex', alignItems: 'center', gap: '0.45rem' },
  uptimeSection: { marginBottom: 'var(--space-6)', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-panel)', overflow: 'hidden' },
  uptimeHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem 1.2rem', borderBottom: '1px solid var(--border-color)' },
  uptimeState: { display: 'inline-flex', alignItems: 'center', minHeight: '26px', padding: '0 0.55rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 },
  uptimeState_up: { color: '#15803d', background: 'rgba(22, 163, 74, .13)' },
  uptimeState_down: { color: '#dc2626', background: 'rgba(239, 68, 68, .13)' },
  uptimeState_degraded: { color: '#b45309', background: 'rgba(217, 119, 6, .13)' },
  uptimeState_provider_error: { color: '#dc2626', background: 'rgba(239, 68, 68, .13)' },
  uptimeGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.7rem', padding: '0.9rem 1.2rem 1.1rem' },
  uptimeMonitor: { display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, padding: '0.7rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-surface)' },
  uptimeDot: { width: '9px', height: '9px', borderRadius: '50%', flexShrink: 0 },
  uptimeMonitorBody: { minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  uptimeMonitorName: { overflow: 'hidden', color: 'var(--text-main)', fontSize: '0.78rem', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  uptimeMonitorUrl: { overflow: 'hidden', color: 'var(--text-dim)', fontSize: '0.68rem', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  uptimeMonitorStatus: { fontSize: '0.68rem', fontWeight: 800, whiteSpace: 'nowrap' },
  uptimeNotice: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--space-6)', padding: '0.8rem 1rem', border: '1px solid var(--border-color)', borderRadius: '10px', background: 'var(--bg-surface)', color: 'var(--text-muted)', fontSize: '0.8rem' },
  eventsSection: { border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-panel)', overflow: 'hidden' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap', padding: '1.1rem 1.2rem', borderBottom: '1px solid var(--border-color)' },
  sectionTitle: { margin: 0, color: 'var(--text-main)', fontSize: '1rem', fontWeight: 800 },
  sectionDescription: { margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.8rem' },
  filters: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  select: { minHeight: '36px', padding: '0 0.65rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-surface)', color: 'var(--text-main)', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 650 },
  eventList: { display: 'flex', flexDirection: 'column' },
  eventRow: { position: 'relative', display: 'flex', gap: '1rem', padding: '1rem 1.2rem 1rem 1.35rem', borderBottom: '1px solid var(--border-color)' },
  severityBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px' },
  eventMain: { minWidth: 0, flex: 1 },
  eventTopline: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' },
  eventBadges: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap' },
  badge: { display: 'inline-flex', alignItems: 'center', minHeight: '22px', padding: '0 0.45rem', borderRadius: '5px', fontSize: '0.68rem', fontWeight: 800 },
  sourceBadge: { display: 'inline-flex', alignItems: 'center', minHeight: '22px', padding: '0 0.45rem', borderRadius: '5px', background: 'var(--bg-surface)', color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 700 },
  eventDate: { color: 'var(--text-dim)', fontSize: '0.72rem', whiteSpace: 'nowrap' },
  eventSummary: { margin: '0.6rem 0 0.35rem', color: 'var(--text-main)', fontSize: '0.92rem', lineHeight: 1.35 },
  eventMeta: { display: 'flex', gap: '0.8rem', flexWrap: 'wrap', color: 'var(--text-dim)', fontSize: '0.72rem' },
  details: { marginTop: '0.65rem', color: 'var(--text-muted)', fontSize: '0.75rem' },
  resolveButton: { alignSelf: 'center', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', minHeight: '34px', padding: '0 0.7rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'transparent', color: 'var(--text-main)', fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: 750, cursor: 'pointer', whiteSpace: 'nowrap' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.45rem', padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' },
  loadingRows: { display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '1rem 1.2rem' },
  loadingRow: { height: '74px', borderRadius: '8px', background: 'var(--bg-surface)', animation: 'pulse-sk 1.5s ease-in-out infinite' },
};
