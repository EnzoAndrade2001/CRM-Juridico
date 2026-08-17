import {
  ArrowUpRight,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  CircleAlert,
  Clock3,
  FileText,
  Inbox,
  MessageCircleMore,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { initialsFor, labelFor, LEGAL_AREAS, LEAD_STAGES } from './legalWorkspace';

function Avatar({ name }) {
  return <span className="jd-avatar jd-avatar--sm">{initialsFor(name)}</span>;
}

function Pill({ children, tone = 'neutral' }) {
  return <span className={`jd-pill jd-pill--${tone}`}>{children}</span>;
}

const ACTIVITY_LABELS = {
  'lead.created': ['Nova oportunidade cadastrada', MessageCircleMore, 'blue'],
  'lead.updated': ['Etapa da oportunidade atualizada', Sparkles, 'violet'],
  'matter.created': ['Novo caso jurídico criado', BriefcaseBusiness, 'green'],
  'matter.updated': ['Situação do caso atualizada', FileText, 'amber'],
  'task.created': ['Nova tarefa adicionada', CalendarClock, 'blue'],
  'task.updated': ['Tarefa atualizada', Check, 'green'],
};

function relativeTime(value) {
  if (!value) return '';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 2) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  if (minutes < 1440) return `há ${Math.round(minutes / 60)} h`;
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
}

export default function LegalOverview({ workspace, onNavigate }) {
  const { summary } = workspace;
  const activeMatters = Object.entries(summary.mattersByStatus || {})
    .filter(([status]) => ['TRIAGEM', 'ATIVO', 'SUSPENSO'].includes(status))
    .reduce((total, [, count]) => total + count, 0);
  const contracted = summary.leadsByStage?.CONTRATADO || 0;
  const eligibleLeads = workspace.leads.filter((lead) => lead.stage !== 'NAO_CONVERTIDO').length;
  const conversion = eligibleLeads ? Math.round((contracted / eligibleLeads) * 100) : 0;
  const lastWeek = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const recentClients = workspace.contacts.filter((contact) => new Date(contact.createdAt || 0).getTime() >= lastWeek).length;
  const metrics = [
    { label: 'Novos clientes', value: recentClients, icon: UsersRound, tone: 'blue', note: 'nos últimos 7 dias' },
    { label: 'Oportunidades ativas', value: eligibleLeads, icon: MessageCircleMore, tone: 'violet', note: `${workspace.leads.length} no total` },
    { label: 'Casos em andamento', value: activeMatters, icon: BriefcaseBusiness, tone: 'green', note: `${workspace.matters.length} casos cadastrados` },
    { label: 'Tarefas pendentes', value: summary.tasks?.open || 0, icon: CalendarClock, tone: 'amber', note: `${summary.tasks?.overdue || 0} atrasada(s)` },
  ];
  const funnel = [
    ['Novos contatos', 'NOVO_CONTATO', '#4f7cff'],
    ['Triagem da IA', 'QUALIFICACAO_IA', '#8b63e8'],
    ['Análise humana', 'ANALISE_HUMANA', '#ec9a33'],
    ['Propostas enviadas', 'PROPOSTA_ENVIADA', '#20a67a'],
    ['Contratados', 'CONTRATADO', '#087c5c'],
  ];
  const maxFunnel = Math.max(1, ...funnel.map(([, stage]) => summary.leadsByStage?.[stage] || 0));
  const attention = workspace.leads
    .filter((lead) => ['URGENTE', 'ALTA'].includes(lead.urgency) || ['ANALISE_HUMANA', 'AGUARDANDO_DOCUMENTOS'].includes(lead.stage))
    .slice(0, 4);

  if (workspace.loading) return <div className="jd-workspace-loading"><Clock3 size={24} /> Carregando visão geral...</div>;

  return (
    <div className="jd-page jd-page--overview">
      {workspace.error && <div className="jd-workspace-error"><CircleAlert size={17} /><span>{workspace.error}</span><button type="button" onClick={workspace.refresh}>Tentar novamente</button></div>}
      <section className="jd-welcome"><div><p>PAINEL DO ESCRITÓRIO</p><h2>Bom dia, Dra. Eduarda.</h2><span>Existem {attention.length} oportunidades que merecem atenção e {summary.tasks?.open || 0} tarefas abertas.</span></div><button type="button" onClick={() => onNavigate('crm')}><Inbox size={18} /> Abrir gestão jurídica <ArrowUpRight size={16} /></button></section>
      <section className="jd-metrics">{metrics.map(({ label, value, icon: Icon, tone, note }) => <article className="jd-metric" key={label}><div className={`jd-metric__icon jd-tone--${tone}`}><Icon size={20} /></div><span>{label}</span><strong>{value}</strong><p>{note}</p></article>)}</section>
      <section className="jd-overview-grid">
        <article className="jd-card jd-funnel-card"><div className="jd-card__heading"><div><h3>Funil de oportunidades</h3><p>Dados atuais do pipeline jurídico</p></div><button type="button" onClick={() => onNavigate('crm')}>Ver CRM <ArrowUpRight size={15} /></button></div><div className="jd-funnel">{funnel.map(([label, stage, color]) => { const value = summary.leadsByStage?.[stage] || 0; return <div className="jd-funnel__row" key={stage}><span>{label}</span><div><i style={{ width: `${Math.max(value ? 8 : 0, (value / maxFunnel) * 100)}%`, background: color }} /></div><strong>{value}</strong></div>; })}</div><div className="jd-funnel__footer"><span><Sparkles size={15} /> Conversão atual em contratos</span><b>{conversion}%</b></div></article>
        <article className="jd-card jd-activity-card"><div className="jd-card__heading"><div><h3>Atividade recente</h3><p>Alterações registradas pelo sistema</p></div></div><div className="jd-activity-list">{summary.recentActivities?.slice(0, 5).map((item) => { const [label, Icon, tone] = ACTIVITY_LABELS[item.type] || ['Registro jurídico atualizado', Bot, 'violet']; return <div className="jd-activity" key={item.id}><span className={`jd-tone--${tone}`}><Icon size={17} /></span><div><strong>{label}</strong><small>{item.actor?.name || 'Sistema'} · {relativeTime(item.createdAt)}</small></div></div>; })}{!summary.recentActivities?.length && <div className="jd-overview-empty">Nenhuma atividade registrada.</div>}</div></article>
      </section>
      <section className="jd-card jd-attention"><div className="jd-card__heading"><div><h3>Precisam da sua atenção</h3><p>Prioridades e etapas que dependem do escritório</p></div><Pill tone="amber">{attention.length} pendente(s)</Pill></div><div className="jd-attention__table">{attention.map((lead) => <button type="button" key={lead.id} onClick={() => onNavigate('crm')}><Avatar name={lead.contact?.name} /><span><strong>{lead.contact?.name}</strong><small>{lead.title}</small></span><Pill tone="blue">{labelFor(LEGAL_AREAS, lead.area)}</Pill><span className="jd-attention__reason"><Sparkles size={14} />{labelFor(LEAD_STAGES, lead.stage)}</span><time>{relativeTime(lead.updatedAt)}</time><ArrowUpRight size={17} /></button>)}{!attention.length && <div className="jd-overview-empty">Nenhuma oportunidade prioritária neste momento.</div>}</div></section>
    </div>
  );
}

