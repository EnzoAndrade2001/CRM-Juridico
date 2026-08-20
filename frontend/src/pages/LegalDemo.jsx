import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Bell,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  CircleUserRound,
  Clock3,
  FileText,
  Files,
  Gauge,
  Inbox,
  LayoutDashboard,
  Megaphone,
  Menu,
  MessageCircleMore,
  MoreHorizontal,
  Paperclip,
  Plus,
  Scale,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Smartphone,
  UsersRound,
  X,
} from 'lucide-react';
import LegalCrmWorkspace from '../features/legal/LegalCrmWorkspace';
import LegalClients from '../features/legal/LegalClients';
import LegalOverviewPanel from '../features/legal/LegalOverview';
import LegalKnowledgeBase from '../features/legal/LegalKnowledgeBase';
import LegalDocuments from '../features/legal/LegalDocuments';
import useLegalWorkspace from '../features/legal/useLegalWorkspace';
import RealInbox from './Inbox';
import ConnectionsPage from './Connections';
import './legal-demo.css';

const navigation = [
  { id: 'visao-geral', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'atendimentos', label: 'Atendimentos', icon: MessageCircleMore, badge: 8 },
  { id: 'clientes', label: 'Clientes', icon: UsersRound },
  { id: 'documentos', label: 'Documentos', icon: Files },
  { id: 'crm', label: 'CRM jurídico', icon: BriefcaseBusiness },
  { id: 'campanhas', label: 'Campanhas', icon: Megaphone },
  { id: 'conhecimento', label: 'Base da IA', icon: BrainCircuit },
  { id: 'conexoes', label: 'Conexões', icon: Smartphone },
];

const conversations = [
  { name: 'Mariana Costa', initials: 'MC', subject: 'Rescisão trabalhista', time: 'agora', tag: 'Trabalhista', active: true, unread: 2 },
  { name: 'Rafael Mendes', initials: 'RM', subject: 'Guarda compartilhada', time: '8 min', tag: 'Família', unread: 1 },
  { name: 'Carlos Henrique', initials: 'CH', subject: 'Benefício negado pelo INSS', time: '21 min', tag: 'Previdenciário' },
  { name: 'Ana Beatriz Lima', initials: 'AL', subject: 'Revisão de contrato', time: '34 min', tag: 'Cível' },
  { name: 'João Ferreira', initials: 'JF', subject: 'Dúvida sobre inventário', time: '1 h', tag: 'Sucessões' },
];

const activity = [
  { icon: Bot, tone: 'violet', title: 'IA qualificou Mariana Costa', meta: 'Trabalhista · há 2 minutos' },
  { icon: UsersRound, tone: 'blue', title: 'Rafael foi atribuído à Dra. Eduarda', meta: 'Família · há 8 minutos' },
  { icon: FileText, tone: 'amber', title: 'Documento recebido de Carlos', meta: 'Previdenciário · há 21 minutos' },
  { icon: Check, tone: 'green', title: 'Proposta aceita por Beatriz Souza', meta: 'Trabalhista · há 42 minutos' },
];

function Avatar({ initials, size = 'md', violet = false }) {
  return <span className={`jd-avatar jd-avatar--${size} ${violet ? 'jd-avatar--violet' : ''}`}>{initials}</span>;
}

function StatusPill({ children, tone = 'neutral' }) {
  return <span className={`jd-pill jd-pill--${tone}`}>{children}</span>;
}

function Sidebar({ active, setActive, open, setOpen }) {
  return (
    <>
      {open && <button className="jd-overlay" type="button" aria-label="Fechar menu" onClick={() => setOpen(false)} />}
      <aside className={`jd-sidebar ${open ? 'is-open' : ''}`}>
        <div className="jd-brand">
          <span className="jd-brand__mark"><Scale size={21} strokeWidth={2.2} /></span>
          <span><strong>CRM Jurídico</strong><small>ATENDIMENTO PRO PEDRO LUND</small></span>
          <button className="jd-sidebar__close" type="button" onClick={() => setOpen(false)}><X size={20} /></button>
        </div>
        <p className="jd-nav-label">ESCRITÓRIO</p>
        <nav className="jd-nav">
          {navigation.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              type="button"
              className={active === id ? 'active' : ''}
              onClick={() => { setActive(id); setOpen(false); }}
            >
              <Icon size={18} /><span>{label}</span>{badge && <b>{badge}</b>}
            </button>
          ))}
        </nav>
        <div className="jd-ai-card">
          <span className="jd-ai-card__icon"><Sparkles size={18} /></span>
          <div><strong>IA em operação</strong><small>94% resolvidos sem espera</small></div>
          <span className="jd-live-dot" />
        </div>
        <div className="jd-user-card">
          <Avatar initials="EA" size="sm" />
          <span><strong>Dra. Eduarda</strong><small>Administradora</small></span>
          <MoreHorizontal size={18} />
        </div>
      </aside>
    </>
  );
}

function Header({ title, subtitle, setMenuOpen }) {
  return (
    <header className="jd-header">
      <button className="jd-menu-button" type="button" onClick={() => setMenuOpen(true)}><Menu size={22} /></button>
      <div className="jd-header__title"><h1>{title}</h1><p>{subtitle}</p></div>
      <label className="jd-search"><Search size={17} /><input placeholder="Buscar cliente, atendimento..." /></label>
      <button className="jd-icon-button" type="button" aria-label="Notificações"><Bell size={19} /><span /></button>
      <button className="jd-profile" type="button"><Avatar initials="EA" size="xs" /><span>Dra. Eduarda</span><ChevronDown size={15} /></button>
    </header>
  );
}

function Overview({ onNavigate }) {
  const metrics = [
    { label: 'Novos contatos', value: '38', change: '+12%', icon: UsersRound, tone: 'blue', note: 'nos últimos 7 dias' },
    { label: 'Em atendimento', value: '14', change: '8 com IA', icon: MessageCircleMore, tone: 'violet', note: '6 com a equipe' },
    { label: 'Conversão', value: '31%', change: '+4,2%', icon: Gauge, tone: 'green', note: 'comparado ao mês anterior' },
    { label: 'Tempo de resposta', value: '18s', change: '-42%', icon: Clock3, tone: 'amber', note: 'média com atendimento IA' },
  ];
  return (
    <div className="jd-page jd-page--overview">
      <section className="jd-welcome">
        <div><p>SEGUNDA-FEIRA, 17 DE AGOSTO</p><h2>Bom dia, Dra. Eduarda.</h2><span>A IA já realizou 23 atendimentos hoje. Existem 4 casos aguardando sua análise.</span></div>
        <button type="button" onClick={() => onNavigate('atendimentos')}><Inbox size={18} /> Ver atendimentos <ArrowUpRight size={16} /></button>
      </section>
      <section className="jd-metrics">
        {metrics.map(({ label, value, change, icon: Icon, tone, note }) => (
          <article className="jd-metric" key={label}>
            <div className={`jd-metric__icon jd-tone--${tone}`}><Icon size={20} /></div>
            <span>{label}</span><strong>{value}</strong>
            <p><b className={`jd-text--${tone}`}>{change}</b> {note}</p>
          </article>
        ))}
      </section>
      <section className="jd-overview-grid">
        <article className="jd-card jd-funnel-card">
          <div className="jd-card__heading"><div><h3>Funil de oportunidades</h3><p>Distribuição dos contatos ativos</p></div><button type="button" onClick={() => onNavigate('crm')}>Ver CRM <ArrowUpRight size={15} /></button></div>
          <div className="jd-funnel">
            {[
              ['Novos contatos', 38, '100%', '#4f7cff'],
              ['Qualificados pela IA', 27, '71%', '#8b63e8'],
              ['Análise do advogado', 14, '37%', '#ec9a33'],
              ['Propostas enviadas', 9, '24%', '#20a67a'],
              ['Contratados', 6, '16%', '#087c5c'],
            ].map(([label, value, width, color]) => (
              <div className="jd-funnel__row" key={label}><span>{label}</span><div><i style={{ width, background: color }} /></div><strong>{value}</strong></div>
            ))}
          </div>
          <div className="jd-funnel__footer"><span><Sparkles size={15} /> A IA qualificou <strong>71%</strong> dos novos contatos</span><b>+9% neste mês</b></div>
        </article>
        <article className="jd-card jd-activity-card">
          <div className="jd-card__heading"><div><h3>Atividade recente</h3><p>Atualizações em tempo real</p></div><button className="jd-more" type="button"><MoreHorizontal size={19} /></button></div>
          <div className="jd-activity-list">
            {activity.map(({ icon: Icon, tone, title, meta }) => <div className="jd-activity" key={title}><span className={`jd-tone--${tone}`}><Icon size={17} /></span><div><strong>{title}</strong><small>{meta}</small></div></div>)}
          </div>
          <button className="jd-link-button" type="button">Ver toda a atividade</button>
        </article>
      </section>
      <section className="jd-card jd-attention">
        <div className="jd-card__heading"><div><h3>Precisam da sua atenção</h3><p>Atendimentos transferidos pela IA ou aguardando uma decisão</p></div><StatusPill tone="amber">4 pendentes</StatusPill></div>
        <div className="jd-attention__table">
          {[
            ['MC', 'Mariana Costa', 'Rescisão trabalhista', 'Trabalhista', 'Documentação recebida', 'agora'],
            ['RM', 'Rafael Mendes', 'Guarda compartilhada', 'Família', 'Solicitou falar com advogado', '8 min'],
            ['CH', 'Carlos Henrique', 'Benefício negado pelo INSS', 'Previdenciário', 'Prazo identificado pela IA', '21 min'],
          ].map(([initials, name, subject, area, reason, time]) => (
            <button type="button" key={name} onClick={() => onNavigate('atendimentos')}><Avatar initials={initials} size="sm" /><span><strong>{name}</strong><small>{subject}</small></span><StatusPill tone="blue">{area}</StatusPill><span className="jd-attention__reason"><Sparkles size={14} />{reason}</span><time>{time}</time><ArrowUpRight size={17} /></button>
          ))}
        </div>
      </section>
    </div>
  );
}

function InboxDemo() {
  const [mode, setMode] = useState('IA ativa');
  const [sent, setSent] = useState(false);
  return (
    <div className="jd-inbox">
      <aside className="jd-conversations">
        <div className="jd-conversations__top"><div><h2>Atendimentos</h2><StatusPill tone="blue">8 novos</StatusPill></div><label><Search size={16} /><input placeholder="Buscar conversas" /></label></div>
        <div className="jd-conversation-tabs"><button className="active" type="button">Todos <b>14</b></button><button type="button">Minha fila <b>4</b></button><button type="button">IA <b>8</b></button></div>
        <div className="jd-conversation-list">
          {conversations.map((item) => <button type="button" className={item.active ? 'active' : ''} key={item.name}><Avatar initials={item.initials} size="sm" violet={item.active} /><span><span><strong>{item.name}</strong><time>{item.time}</time></span><small>{item.subject}</small><em>{item.tag}</em></span>{item.unread && <b>{item.unread}</b>}</button>)}
        </div>
      </aside>
      <section className="jd-chat">
        <header className="jd-chat__header"><Avatar initials="MC" size="sm" violet /><div><h3>Mariana Costa</h3><p><span /> online agora · WhatsApp</p></div><StatusPill tone={mode === 'IA ativa' ? 'violet' : 'green'}><Sparkles size={13} /> {mode}</StatusPill><button type="button" className="jd-takeover" onClick={() => setMode(mode === 'IA ativa' ? 'Humano assumiu' : 'IA ativa')}>{mode === 'IA ativa' ? 'Assumir conversa' : 'Devolver para IA'}</button><button type="button" className="jd-more"><MoreHorizontal size={20} /></button></header>
        <div className="jd-ai-summary"><span><Sparkles size={17} /></span><div><strong>Resumo inteligente</strong><p>Mariana foi desligada sem justa causa há 12 dias e relata divergência nas verbas rescisórias. Já enviou o termo de rescisão. A IA identificou possível diferença no aviso-prévio.</p></div><StatusPill tone="amber">Requer análise</StatusPill></div>
        <div className="jd-messages">
          <div className="jd-day-separator"><span>Hoje, 09:42</span></div>
          <div className="jd-message jd-message--client"><div>Olá, fui demitida e acho que o valor da minha rescisão está errado. Vocês podem me ajudar?</div><time>09:42</time></div>
          <div className="jd-message-row"><span className="jd-bot-avatar"><Bot size={17} /></span><div className="jd-message jd-message--ai"><div><b><Sparkles size={13} /> Áurea IA</b>Olá, Mariana! Posso fazer uma análise inicial para encaminhar seu caso à equipe trabalhista. Sua demissão foi sem justa causa? E em qual data aconteceu?</div><time>09:42 <Check size={12} /></time></div></div>
          <div className="jd-message jd-message--client"><div>Foi sem justa causa, no dia 5 deste mês. Trabalhei lá por 3 anos.</div><time>09:44</time></div>
          <div className="jd-message-row"><span className="jd-bot-avatar"><Bot size={17} /></span><div className="jd-message jd-message--ai"><div><b><Sparkles size={13} /> Áurea IA</b>Entendi. Para que a advogada possa conferir os valores, você consegue enviar uma foto ou PDF do termo de rescisão?</div><time>09:44 <Check size={12} /></time></div></div>
          <div className="jd-document"><span><FileText size={21} /></span><div><strong>termo_rescisao.pdf</strong><small>PDF · 1,8 MB</small></div><Check size={17} /></div>
          <div className="jd-system-message"><ShieldCheck size={15} /> Documento recebido e vinculado ao atendimento</div>
          {sent && <div className="jd-message jd-message--human"><div><b>Dra. Eduarda</b>Olá, Mariana. Recebi o resumo e o documento. Vou analisar os valores e já retorno para você.</div><time>agora <Check size={12} /></time></div>}
        </div>
        <footer className="jd-composer"><button type="button"><Paperclip size={19} /></button><input placeholder={mode === 'IA ativa' ? 'Assuma a conversa para responder...' : 'Digite sua mensagem...'} disabled={mode === 'IA ativa'} /><button type="button" className="jd-send" disabled={mode === 'IA ativa'} onClick={() => setSent(true)}><Send size={18} /></button></footer>
      </section>
      <aside className="jd-client-panel">
        <div className="jd-client-profile"><Avatar initials="MC" size="lg" violet /><h3>Mariana Costa</h3><p>+55 11 99872-1140</p><div><StatusPill tone="blue">Trabalhista</StatusPill><StatusPill tone="green">Qualificado</StatusPill></div></div>
        <div className="jd-panel-section"><h4>QUALIFICAÇÃO DA IA <Sparkles size={14} /></h4><dl><div><dt>Motivo</dt><dd>Verbas rescisórias</dd></div><div><dt>Urgência</dt><dd><StatusPill tone="amber">Média</StatusPill></dd></div><div><dt>Demissão</dt><dd>05/08/2026</dd></div><div><dt>Tempo na empresa</dt><dd>3 anos</dd></div><div><dt>Documentos</dt><dd>1 recebido</dd></div></dl></div>
        <div className="jd-panel-section"><h4>RESPONSÁVEL</h4><div className="jd-responsible"><Avatar initials="EA" size="xs" /><span><strong>Dra. Eduarda Andrade</strong><small>Equipe Trabalhista</small></span><ChevronDown size={15} /></div></div>
        <div className="jd-panel-section"><h4>PRÓXIMA AÇÃO</h4><button type="button" className="jd-next-action"><CalendarDays size={17} /><span><strong>Analisar documentação</strong><small>Hoje, até 14:00</small></span></button></div>
        <button type="button" className="jd-open-client"><CircleUserRound size={17} /> Abrir perfil completo</button>
      </aside>
    </div>
  );
}

function CrmDemo({ workspace }) {
  return <LegalCrmWorkspace workspace={workspace} />;
}

function CampaignsDemo() {
  const [created, setCreated] = useState(false);
  const campaigns = [
    ['Orientação trabalhista — Agosto', 'Clientes trabalhistas', '1.248', 'Em andamento', '72%', 'blue'],
    ['Documentos para revisão de benefício', 'Previdenciário · Qualificados', '386', 'Agendada · 19/08', '—', 'violet'],
    ['Pesquisa pós-consulta', 'Consultas realizadas', '214', 'Concluída', '89%', 'green'],
  ];
  return <div className="jd-page"><div className="jd-section-intro"><div><h2>Campanhas</h2><p>Comunicação segmentada com revisão, limites e controle de descadastro.</p></div><button className="jd-primary" type="button" onClick={() => setCreated(true)}><Plus size={17} /> Nova campanha</button></div>{created && <div className="jd-demo-toast"><Check size={17} /> Rascunho criado. Nenhuma mensagem real será enviada neste ambiente.</div>}<section className="jd-campaign-stats"><article><Megaphone size={20} /><span><strong>3</strong> campanhas neste mês</span></article><article><Send size={20} /><span><strong>1.848</strong> mensagens entregues</span></article><article><MessageCircleMore size={20} /><span><strong>412</strong> respostas recebidas</span></article><article><ShieldCheck size={20} /><span><strong>99,2%</strong> entrega válida</span></article></section><section className="jd-card jd-campaign-table"><div className="jd-card__heading"><div><h3>Campanhas recentes</h3><p>Dados fictícios para demonstração</p></div><label className="jd-small-search"><Search size={15} /><input placeholder="Buscar campanha" /></label></div><div className="jd-table-head"><span>Campanha</span><span>Público</span><span>Contatos</span><span>Status</span><span>Entrega</span><span /></div>{campaigns.map(([name, audience, contacts, status, delivery, tone]) => <div className="jd-table-row" key={name}><span><b>{name}</b><small>Criada por Eduarda Andrade</small></span><span>{audience}</span><strong>{contacts}</strong><span><StatusPill tone={tone}>{status}</StatusPill></span><strong>{delivery}</strong><button type="button"><MoreHorizontal size={18} /></button></div>)}</section></div>;
}

function PlaceholderPage({ type }) {
  const content = {
    clientes: ['Clientes', 'Base central de contatos, documentos e histórico jurídico.', UsersRound, '1.284 clientes cadastrados'],
    conhecimento: ['Base de conhecimento da IA', 'Conteúdo revisado pelo escritório para orientar o atendimento automático.', BrainCircuit, '46 orientações aprovadas'],
    documentos: ['Documentos jurídicos', 'Solicitações, arquivos e revisões vinculados aos clientes e casos.', Files, 'Dossiê documental do escritório'],
    conexoes: ['Conexões WhatsApp', 'Números, QR Code e canais de atendimento do escritório.', Smartphone, 'Pareamento do WhatsApp'],
  }[type];
  const [title, description, Icon, stat] = content;
  return <div className="jd-page"><div className="jd-section-intro"><div><h2>{title}</h2><p>{description}</p></div><button type="button" className="jd-primary"><Plus size={17} /> Adicionar</button></div><section className="jd-placeholder-hero"><span><Icon size={30} /></span><p>AMBIENTE DE DEMONSTRAÇÃO</p><h3>{stat}</h3><small>Esta tela representa o módulo que será detalhado após a validação do fluxo principal.</small><button type="button">Visualizar exemplo <ArrowUpRight size={16} /></button></section></div>;
}

export default function LegalDemo({ demoMode = false, initialScreen = 'visao-geral' }) {
  const [active, setActive] = useState(() => {
    const requestedScreen = new URLSearchParams(window.location.search).get('tela');
    if (navigation.some(({ id }) => id === requestedScreen)) return requestedScreen;
    return navigation.some(({ id }) => id === initialScreen) ? initialScreen : 'visao-geral';
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const legalWorkspace = useLegalWorkspace({ demoMode });
  function openLegalClient(client, ticketId = null) {
    const url = new URL(window.location.href);
    url.searchParams.set('tela', 'clientes');
    url.searchParams.delete('contactId');
    if (client?.id) url.searchParams.set('clientId', client.id);
    if (ticketId) url.searchParams.set('ticketId', ticketId);
    window.history.replaceState({}, '', url);
    setActive('clientes');
  }
  function openLegalDocuments(contact, ticketId = null) {
    const url = new URL(window.location.href);
    url.searchParams.set('tela', 'documentos');
    if (contact?.id) url.searchParams.set('contactId', contact.id);
    else url.searchParams.delete('contactId');
    if (ticketId) url.searchParams.set('ticketId', ticketId);
    window.history.replaceState({}, '', url);
    setActive('documentos');
  }
  useEffect(() => {
    document.title = 'CRM Jurídico — Atendimento PRO Pedro Lund';
    const url = new URL(window.location.href);
    if (active === 'visao-geral') url.searchParams.delete('tela');
    else url.searchParams.set('tela', active);
    window.history.replaceState({}, '', url);
  }, [active]);
  const header = useMemo(() => ({
    'visao-geral': ['Visão geral', 'Acompanhe o escritório em tempo real'],
    atendimentos: ['Atendimentos', 'Conversas do WhatsApp e triagem inteligente'],
    clientes: ['Clientes', 'Relacionamento e histórico centralizado'],
    crm: ['CRM jurídico', 'Oportunidades e contratações'],
    campanhas: ['Campanhas', 'Comunicação segmentada e responsável'],
    conhecimento: ['Base da IA', 'Conteúdo aprovado pelo escritório'],
    documentos: ['Documentos jurídicos', 'Solicitações, arquivos e revisões vinculados aos clientes e casos'],
    conexoes: ['Conexões WhatsApp', 'Gerencie os números e o pareamento da Evolution API'],
  }[active]), [active]);
  return (
    <div className="legal-demo">
      <div className="jd-demo-ribbon"><span><Sparkles size={14} /> {demoMode ? 'DEMONSTRAÇÃO INTERATIVA' : 'AMBIENTE DO ESCRITÓRIO'}</span><p>{demoMode ? 'Dados fictícios · alterações salvas neste navegador' : 'Dados protegidos do escritório'}</p></div>
      <Sidebar active={active} setActive={setActive} open={menuOpen} setOpen={setMenuOpen} />
      <main className="jd-main">
        <Header title={header[0]} subtitle={header[1]} setMenuOpen={setMenuOpen} />
        {active === 'visao-geral' && <LegalOverviewPanel workspace={legalWorkspace} onNavigate={setActive} />}
        {active === 'atendimentos' && (demoMode ? <InboxDemo /> : <RealInbox legalMode onOpenLegalClient={openLegalClient} onOpenLegalDocuments={openLegalDocuments} />)}
        {active === 'clientes' && <LegalClients workspace={legalWorkspace} onNavigate={setActive} />}
        {active === 'crm' && <CrmDemo workspace={legalWorkspace} />}
        {active === 'documentos' && (demoMode ? <PlaceholderPage type={active} /> : <LegalDocuments workspace={legalWorkspace} contactId={new URLSearchParams(window.location.search).get('contactId')} />)}
        {active === 'campanhas' && <CampaignsDemo />}
        {active === 'conhecimento' && (demoMode ? <PlaceholderPage type={active} /> : <LegalKnowledgeBase />)}
        {active === 'conexoes' && (demoMode ? <PlaceholderPage type={active} /> : <div className="jd-connections-shell"><ConnectionsPage /></div>)}
      </main>
    </div>
  );
}
