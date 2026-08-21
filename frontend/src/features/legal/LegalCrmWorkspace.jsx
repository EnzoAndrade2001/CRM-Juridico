import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  CircleAlert,
  Clock3,
  FileCheck2,
  Filter,
  History,
  LoaderCircle,
  Plus,
  RotateCcw,
  Search,
  Save,
  Sparkles,
} from 'lucide-react';
import {
  initialsFor,
  labelFor,
  LEAD_STAGES,
  LEGAL_AREAS,
  MATTER_STATUSES,
  PRIORITIES,
  TASK_TYPES,
} from './legalWorkspace';
import LegalDocuments from './LegalDocuments';
import LegalModal from './LegalModal';

const PIPELINE_COLUMNS = [
  { id: 'NOVO_CONTATO', title: 'Novo contato', color: '#4f7cff', stages: ['NOVO_CONTATO'] },
  { id: 'QUALIFICACAO_IA', title: 'Triagem da IA', color: '#9b6bff', stages: ['QUALIFICACAO_IA', 'AGUARDANDO_DOCUMENTOS'] },
  { id: 'ANALISE_HUMANA', title: 'Análise humana', color: '#ef9f35', stages: ['ANALISE_HUMANA', 'CONSULTA_AGENDADA'] },
  { id: 'PROPOSTA_ENVIADA', title: 'Proposta enviada', color: '#20a67a', stages: ['PROPOSTA_ENVIADA'] },
  { id: 'CONTRATADO', title: 'Contratado', color: '#087c5c', stages: ['CONTRATADO'] },
  { id: 'NAO_CONVERTIDO', title: 'Não convertido', color: '#8a93a2', stages: ['NAO_CONVERTIDO'] },
];

const NEXT_STAGE = {
  NOVO_CONTATO: 'QUALIFICACAO_IA',
  QUALIFICACAO_IA: 'ANALISE_HUMANA',
  AGUARDANDO_DOCUMENTOS: 'ANALISE_HUMANA',
  ANALISE_HUMANA: 'PROPOSTA_ENVIADA',
  CONSULTA_AGENDADA: 'PROPOSTA_ENVIADA',
};

const EMPTY_LEAD = {
  contactId: '',
  ticketId: '',
  clientName: '',
  phone: '',
  email: '',
  title: '',
  area: 'CIVEL',
  stage: 'NOVO_CONTATO',
  urgency: 'MEDIA',
  summary: '',
  nextActionAt: '',
};

const EMPTY_TASK = {
  title: '',
  type: 'PROXIMA_ACAO',
  priority: 'MEDIA',
  dueAt: '',
  description: '',
};

function Avatar({ name }) {
  return <span className="jd-avatar jd-avatar--xs">{initialsFor(name)}</span>;
}

function Pill({ children, tone = 'neutral' }) {
  return <span className={`jd-pill jd-pill--${tone}`}>{children}</span>;
}

function Field({ label, children, full = false }) {
  return <label className={full ? 'jd-form-field jd-form-field--full' : 'jd-form-field'}><span>{label}</span>{children}</label>;
}

function OpportunityForm({ workspace, initialStage, initialContactId = '', initialTicketId = '', onClose }) {
  const [form, setForm] = useState({ ...EMPTY_LEAD, stage: initialStage || EMPTY_LEAD.stage, contactId: initialContactId, ticketId: initialTicketId, source: initialTicketId ? 'whatsapp' : 'manual' });
  const [formError, setFormError] = useState('');
  const usesExistingContact = !workspace.demoMode && Boolean(form.contactId);
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setFormError('');
    try {
      await workspace.addLead({
        ...form,
        nextActionAt: form.nextActionAt ? new Date(form.nextActionAt).toISOString() : null,
      });
      onClose();
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <LegalModal title="Nova oportunidade" subtitle="Cadastre o contato e a demanda jurídica inicial." onClose={onClose} wide>
      <form onSubmit={submit}>
        <div className="jd-form-grid">
          {!workspace.demoMode && (
            <Field label="Cliente já cadastrado" full>
              <select value={form.contactId} onChange={update('contactId')}>
                <option value="">Cadastrar novo cliente</option>
                {workspace.contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name || contact.phone} · {contact.phone}</option>)}
              </select>
            </Field>
          )}
          {!usesExistingContact && <Field label="Nome do cliente"><input required value={form.clientName} onChange={update('clientName')} placeholder="Nome completo" /></Field>}
          {!usesExistingContact && <Field label="WhatsApp"><input required value={form.phone} onChange={update('phone')} placeholder="(11) 99999-9999" /></Field>}
          {!usesExistingContact && <Field label="E-mail"><input type="email" value={form.email} onChange={update('email')} placeholder="cliente@email.com" /></Field>}
          <Field label="Área jurídica">
            <select value={form.area} onChange={update('area')}>{LEGAL_AREAS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          </Field>
          <Field label="Assunto" full><input required value={form.title} onChange={update('title')} placeholder="Ex.: Revisão de verbas rescisórias" /></Field>
          <Field label="Etapa"><select value={form.stage} onChange={update('stage')}>{LEAD_STAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Prioridade"><select value={form.urgency} onChange={update('urgency')}>{PRIORITIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Próxima ação"><input type="datetime-local" value={form.nextActionAt} onChange={update('nextActionAt')} /></Field>
          <Field label="Resumo" full><textarea rows="4" value={form.summary} onChange={update('summary')} placeholder="Registre os principais fatos informados pelo cliente." /></Field>
        </div>
        {form.ticketId && <div className="jd-inline-success"><FileCheck2 size={17} /> Esta oportunidade ficará vinculada ao atendimento selecionado no Inbox.</div>}
        {formError && <div className="jd-form-error"><CircleAlert size={16} />{formError}</div>}
        <footer className="jd-modal__actions"><button type="button" className="jd-secondary" onClick={onClose}>Cancelar</button><button className="jd-primary" disabled={workspace.saving}><Plus size={16} />{workspace.saving ? 'Salvando...' : 'Criar oportunidade'}</button></footer>
      </form>
    </LegalModal>
  );
}

function TaskForm({ workspace, lead, matter, onClose }) {
  const [form, setForm] = useState(EMPTY_TASK);
  const [formError, setFormError] = useState('');
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setFormError('');
    try {
      await workspace.addTask({
        ...form,
        leadId: lead?.id || matter?.leadId || null,
        matterId: matter?.id || null,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
      });
      onClose();
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <LegalModal title="Nova tarefa" subtitle={`Vinculada a ${matter?.title || lead?.title || 'o fluxo jurídico'}.`} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="jd-form-grid">
          <Field label="Tarefa" full><input required value={form.title} onChange={update('title')} placeholder="Ex.: Revisar documentos recebidos" /></Field>
          <Field label="Tipo"><select value={form.type} onChange={update('type')}>{TASK_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Prioridade"><select value={form.priority} onChange={update('priority')}>{PRIORITIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Prazo" full><input type="datetime-local" value={form.dueAt} onChange={update('dueAt')} /></Field>
          <Field label="Observações" full><textarea rows="3" value={form.description} onChange={update('description')} /></Field>
        </div>
        {formError && <div className="jd-form-error"><CircleAlert size={16} />{formError}</div>}
        <footer className="jd-modal__actions"><button type="button" className="jd-secondary" onClick={onClose}>Cancelar</button><button className="jd-primary" disabled={workspace.saving}><CalendarClock size={16} />{workspace.saving ? 'Salvando...' : 'Criar tarefa'}</button></footer>
      </form>
    </LegalModal>
  );
}

const ACTIVITY_TEXT = {
  'lead.created': 'Oportunidade criada',
  'lead.updated': 'Oportunidade atualizada',
  'matter.created': 'Caso jurídico criado',
  'matter.updated': 'Caso jurídico atualizado',
  'task.created': 'Tarefa criada',
  'task.updated': 'Tarefa atualizada',
};

function ActivityTimeline({ activities = [] }) {
  return (
    <section className="jd-history">
      <h4><History size={16} /> Histórico de alterações</h4>
      {activities.map((item) => (
        <article key={item.id}>
          <i />
          <span><strong>{ACTIVITY_TEXT[item.type] || 'Registro atualizado'}</strong><small>{item.actor?.name || 'Sistema'} · {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.createdAt))}</small></span>
        </article>
      ))}
      {!activities.length && <p>Nenhuma alteração registrada até o momento.</p>}
    </section>
  );
}

function LeadDetail({ workspace, lead, onClose, onTask }) {
  const [detail, setDetail] = useState(lead);
  const [detailLoading, setDetailLoading] = useState(true);
  const [stage, setStage] = useState(lead.stage);
  const [lostReason, setLostReason] = useState(lead.lostReason || '');
  const [formError, setFormError] = useState('');
  const matter = workspace.matters.find((item) => item.leadId === lead.id) || detail.matter;

  useEffect(() => {
    let active = true;
    workspace.loadLeadDetail(lead.id)
      .then((loaded) => {
        if (!active) return;
        setDetail(loaded);
        setStage(loaded.stage);
        setLostReason(loaded.lostReason || '');
      })
      .catch((error) => active && setFormError(error.message))
      .finally(() => active && setDetailLoading(false));
    return () => { active = false; };
  }, [lead.id, workspace.loadLeadDetail]);

  async function save() {
    setFormError('');
    try {
      await workspace.editLead(lead.id, { stage, ...(stage === 'NAO_CONVERTIDO' ? { lostReason } : {}) });
      onClose();
    } catch (error) {
      setFormError(error.message);
    }
  }

  async function convert() {
    setFormError('');
    try {
      await workspace.addMatter(lead);
      onClose();
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <LegalModal title={detail.contact?.name || 'Oportunidade'} subtitle={detail.title} onClose={onClose} wide>
      <div className="jd-lead-detail">
        <div className="jd-lead-detail__summary">
          <Avatar name={detail.contact?.name} />
          <dl>
            <div><dt>Área</dt><dd>{labelFor(LEGAL_AREAS, detail.area)}</dd></div>
            <div><dt>Prioridade</dt><dd>{labelFor(PRIORITIES, detail.urgency)}</dd></div>
            <div><dt>WhatsApp</dt><dd>{detail.contact?.phone || 'Não informado'}</dd></div>
            <div><dt>Tarefas</dt><dd>{detail.tasks?.length ?? workspace.tasks.filter((task) => task.leadId === lead.id).length}</dd></div>
          </dl>
        </div>
        {detail.ticket && <div className="jd-inline-success"><FileCheck2 size={17} /> Atendimento do Inbox vinculado a esta oportunidade.</div>}
        <p className="jd-lead-detail__text">{detail.summary || 'Nenhum resumo informado.'}</p>
        <div className="jd-form-grid">
          <Field label="Etapa atual" full><select value={stage} onChange={(event) => setStage(event.target.value)}>{LEAD_STAGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          {stage === 'NAO_CONVERTIDO' && <Field label="Motivo da não conversão" full><textarea required value={lostReason} onChange={(event) => setLostReason(event.target.value)} /></Field>}
        </div>
        {matter && <div className="jd-inline-success"><FileCheck2 size={17} /> Caso jurídico já criado: <strong>{matter.title || lead.title}</strong></div>}
        {detailLoading ? <div className="jd-detail-loading"><LoaderCircle size={17} /> Carregando histórico...</div> : <ActivityTimeline activities={detail.activities} />}
        {formError && <div className="jd-form-error"><CircleAlert size={16} />{formError}</div>}
      </div>
      <footer className="jd-modal__actions jd-modal__actions--spread">
        <button type="button" className="jd-secondary" onClick={() => onTask(lead, matter)}><CalendarClock size={16} /> Nova tarefa</button>
        <span />
        {!matter && <button type="button" className="jd-secondary jd-secondary--green" disabled={workspace.saving} onClick={convert}><BriefcaseBusiness size={16} /> Converter em caso</button>}
        <button type="button" className="jd-primary" disabled={workspace.saving} onClick={save}>{workspace.saving ? 'Salvando...' : 'Salvar etapa'}</button>
      </footer>
    </LegalModal>
  );
}

function Pipeline({ workspace, search, area, onCreate, onSelect }) {
  const visibleLeads = useMemo(() => workspace.leads.filter((lead) => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    const matchesSearch = !term || `${lead.contact?.name || ''} ${lead.title} ${lead.summary || ''}`.toLocaleLowerCase('pt-BR').includes(term);
    return matchesSearch && (!area || lead.area === area);
  }), [area, search, workspace.leads]);

  async function advance(event, lead) {
    event.stopPropagation();
    const next = NEXT_STAGE[lead.stage];
    if (next) await workspace.editLead(lead.id, { stage: next });
  }

  return (
    <div className="jd-kanban jd-kanban--functional">
      {PIPELINE_COLUMNS.map((column) => {
        const cards = visibleLeads.filter((lead) => column.stages.includes(lead.stage));
        return (
          <section className="jd-kanban__column" key={column.id}>
            <header><i style={{ background: column.color }} /><strong>{column.title}</strong><span>{cards.length}</span></header>
            <div>
              {cards.map((lead) => (
                <article key={lead.id}>
                  <button type="button" className="jd-kanban__open" aria-label={`Abrir oportunidade de ${lead.contact?.name || 'cliente sem nome'}: ${lead.title}`} onClick={() => onSelect(lead)}>
                    <span className="jd-kanban__tag"><span>{labelFor(LEGAL_AREAS, lead.area)}</span>{lead.stage === 'QUALIFICACAO_IA' && <b><Sparkles size={12} /> IA ativa</b>}</span>
                    <strong>{lead.contact?.name || 'Cliente sem nome'}</strong>
                    <span className="jd-kanban__subject">{lead.title}</span>
                  </button>
                  <footer><Avatar name={lead.contact?.name} /><time><Clock3 size={13} /> {labelFor(PRIORITIES, lead.urgency)}</time>{NEXT_STAGE[lead.stage] && <button type="button" title="Avançar etapa" onClick={(event) => advance(event, lead)}><ArrowRight size={15} /></button>}</footer>
                </article>
              ))}
              {!cards.length && <div className="jd-column-empty">Nenhuma oportunidade</div>}
            </div>
            <button type="button" className="jd-add-card" onClick={() => onCreate(column.id)}><Plus size={15} /> Adicionar oportunidade</button>
          </section>
        );
      })}
    </div>
  );
}

function MatterDetail({ workspace, matter, onClose, onTask }) {
  const [detail, setDetail] = useState(matter);
  const [form, setForm] = useState({
    status: matter.status,
    caseNumber: matter.caseNumber || '',
    court: matter.court || '',
    opposingParty: matter.opposingParty || '',
    description: matter.description || '',
  });
  const [detailLoading, setDetailLoading] = useState(true);
  const [formError, setFormError] = useState('');
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  useEffect(() => {
    let active = true;
    workspace.loadMatterDetail(matter.id)
      .then((loaded) => {
        if (!active) return;
        setDetail(loaded);
        setForm({
          status: loaded.status,
          caseNumber: loaded.caseNumber || '',
          court: loaded.court || '',
          opposingParty: loaded.opposingParty || '',
          description: loaded.description || '',
        });
      })
      .catch((error) => active && setFormError(error.message))
      .finally(() => active && setDetailLoading(false));
    return () => { active = false; };
  }, [matter.id, workspace.loadMatterDetail]);

  async function save() {
    setFormError('');
    try {
      await workspace.editMatter(matter.id, {
        ...form,
        caseNumber: form.caseNumber || null,
        court: form.court || null,
        opposingParty: form.opposingParty || null,
        description: form.description || null,
      });
      onClose();
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <LegalModal title={detail.contact?.name || 'Caso jurídico'} subtitle={detail.title} onClose={onClose} wide>
      <div className="jd-lead-detail jd-matter-detail">
        <div className="jd-lead-detail__summary"><Avatar name={detail.contact?.name} /><dl><div><dt>Área</dt><dd>{labelFor(LEGAL_AREAS, detail.area)}</dd></div><div><dt>Situação</dt><dd>{labelFor(MATTER_STATUSES, detail.status)}</dd></div><div><dt>Cliente</dt><dd>{detail.contact?.name}</dd></div><div><dt>Tarefas</dt><dd>{detail.tasks?.length ?? 0}</dd></div></dl></div>
        <div className="jd-form-grid jd-matter-form">
          <Field label="Situação"><select value={form.status} onChange={update('status')}>{MATTER_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Número do processo"><input value={form.caseNumber} onChange={update('caseNumber')} placeholder="0000000-00.0000.0.00.0000" /></Field>
          <Field label="Vara ou tribunal"><input value={form.court} onChange={update('court')} /></Field>
          <Field label="Parte contrária"><input value={form.opposingParty} onChange={update('opposingParty')} /></Field>
          <Field label="Descrição" full><textarea rows="3" value={form.description} onChange={update('description')} /></Field>
        </div>
        {detailLoading ? <div className="jd-detail-loading"><LoaderCircle size={17} /> Carregando histórico...</div> : <ActivityTimeline activities={detail.activities} />}
        {!workspace.demoMode && <LegalDocuments workspace={workspace} contactId={detail.contactId || detail.contact?.id} leadId={detail.leadId} matterId={detail.id} compact />}
        {formError && <div className="jd-form-error"><CircleAlert size={16} />{formError}</div>}
      </div>
      <footer className="jd-modal__actions jd-modal__actions--spread"><button type="button" className="jd-secondary" onClick={() => onTask(null, detail)}><CalendarClock size={16} /> Nova tarefa</button><span /><button type="button" className="jd-primary" disabled={workspace.saving} onClick={save}><Save size={16} />{workspace.saving ? 'Salvando...' : 'Salvar caso'}</button></footer>
    </LegalModal>
  );
}

function Matters({ workspace, onSelect }) {
  return (
    <section className="jd-card jd-legal-list">
      <div className="jd-legal-list__head"><span>Cliente e caso</span><span>Área</span><span>Situação</span><span>Processo</span><span>Tarefas</span><span /></div>
      {workspace.matters.map((matter) => (
        <div className="jd-legal-list__row" key={matter.id}>
          <span className="jd-person-cell"><Avatar name={matter.contact?.name} /><span><strong>{matter.contact?.name}</strong><small>{matter.title}</small></span></span>
          <span>{labelFor(LEGAL_AREAS, matter.area)}</span>
          <select value={matter.status} onChange={(event) => workspace.editMatter(matter.id, { status: event.target.value })}>{MATTER_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <span>{matter.caseNumber || 'Ainda sem número'}</span>
          <strong>{workspace.tasks.filter((task) => task.matterId === matter.id).length}</strong>
          <button type="button" onClick={() => onSelect(matter)}>Abrir</button>
        </div>
      ))}
      {!workspace.matters.length && <div className="jd-legal-empty"><BriefcaseBusiness size={25} /><strong>Nenhum caso criado</strong><span>Abra uma oportunidade e use “Converter em caso”.</span></div>}
    </section>
  );
}

function Tasks({ workspace }) {
  return (
    <section className="jd-card jd-legal-list jd-task-list">
      <div className="jd-legal-list__head"><span>Tarefa</span><span>Vínculo</span><span>Tipo</span><span>Prazo</span><span>Prioridade</span><span>Status</span></div>
      {workspace.tasks.map((task) => (
        <div className={`jd-legal-list__row ${task.status === 'CONCLUIDA' ? 'is-complete' : ''}`} key={task.id}>
          <span><strong>{task.title}</strong><small>{task.description}</small></span>
          <span>{task.matter?.title || task.lead?.title || 'Oportunidade'}</span>
          <span>{labelFor(TASK_TYPES, task.type)}</span>
          <span>{task.dueAt ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(task.dueAt)) : 'Sem prazo'}</span>
          <span>{labelFor(PRIORITIES, task.priority)}</span>
          <button type="button" disabled={task.status === 'CONCLUIDA'} onClick={() => workspace.editTask(task.id, { status: 'CONCLUIDA' })}>{task.status === 'CONCLUIDA' ? <><Check size={15} /> Concluída</> : 'Concluir'}</button>
        </div>
      ))}
      {!workspace.tasks.length && <div className="jd-legal-empty"><CalendarClock size={25} /><strong>Nenhuma tarefa registrada</strong><span>Crie uma tarefa a partir de uma oportunidade ou caso.</span></div>}
    </section>
  );
}

export default function LegalCrmWorkspace({ workspace }) {
  const [tab, setTab] = useState('pipeline');
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('');
  const [createStage, setCreateStage] = useState(null);
  const [createContext, setCreateContext] = useState({ contactId: '', ticketId: '' });
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedMatter, setSelectedMatter] = useState(null);
  const [taskTarget, setTaskTarget] = useState(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const contactId = url.searchParams.get('contactId') || '';
    const ticketId = url.searchParams.get('ticketId') || '';
    if (!contactId && !ticketId) return;
    setCreateContext({ contactId, ticketId });
    setCreateStage('NOVO_CONTATO');
    url.searchParams.delete('contactId');
    url.searchParams.delete('ticketId');
    window.history.replaceState({}, '', url);
  }, []);

  function openTask(lead, matter) {
    setSelectedLead(null);
    setSelectedMatter(null);
    setTaskTarget({ lead, matter });
  }

  return (
    <div className="jd-page jd-crm">
      <div className="jd-section-intro">
        <div><h2>Gestão jurídica</h2><p>Do primeiro atendimento até as tarefas do caso.</p></div>
        <div>
          {workspace.demoMode && <button type="button" className="jd-secondary" onClick={workspace.resetDemo}><RotateCcw size={16} /> Restaurar dados</button>}
          <button type="button" className="jd-primary" onClick={() => { setCreateContext({ contactId: '', ticketId: '' }); setCreateStage('NOVO_CONTATO'); }}><Plus size={17} /> Nova oportunidade</button>
        </div>
      </div>

      {workspace.error && <div className="jd-workspace-error"><CircleAlert size={17} /><span>{workspace.error}</span><button type="button" onClick={workspace.refresh}>Tentar novamente</button></div>}

      <div className="jd-workspace-toolbar">
        <nav>
          <button type="button" className={tab === 'pipeline' ? 'active' : ''} onClick={() => setTab('pipeline')}>Pipeline <b>{workspace.leads.length}</b></button>
          <button type="button" className={tab === 'matters' ? 'active' : ''} onClick={() => setTab('matters')}>Casos <b>{workspace.matters.length}</b></button>
          <button type="button" className={tab === 'tasks' ? 'active' : ''} onClick={() => setTab('tasks')}>Tarefas <b>{workspace.tasks.filter((task) => !['CONCLUIDA', 'CANCELADA'].includes(task.status)).length}</b></button>
        </nav>
        {tab === 'pipeline' && <div className="jd-workspace-filters"><label><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente ou assunto" aria-label="Buscar cliente ou assunto no funil" /></label><label><Filter size={14} /><select value={area} onChange={(event) => setArea(event.target.value)} aria-label="Filtrar oportunidades por área"><option value="">Todas as áreas</option>{LEGAL_AREAS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>}
      </div>

      {workspace.loading ? <div className="jd-workspace-loading"><LoaderCircle size={25} /> Carregando dados jurídicos...</div> : (
        <>
          {tab === 'pipeline' && <Pipeline workspace={workspace} search={search} area={area} onCreate={setCreateStage} onSelect={setSelectedLead} />}
          {tab === 'matters' && <Matters workspace={workspace} onSelect={setSelectedMatter} />}
          {tab === 'tasks' && <Tasks workspace={workspace} />}
        </>
      )}

      {createStage && <OpportunityForm workspace={workspace} initialStage={createStage} initialContactId={createContext.contactId} initialTicketId={createContext.ticketId} onClose={() => { setCreateStage(null); setCreateContext({ contactId: '', ticketId: '' }); }} />}
      {selectedLead && <LeadDetail workspace={workspace} lead={selectedLead} onClose={() => setSelectedLead(null)} onTask={openTask} />}
      {selectedMatter && <MatterDetail workspace={workspace} matter={selectedMatter} onClose={() => setSelectedMatter(null)} onTask={openTask} />}
      {taskTarget && <TaskForm workspace={workspace} lead={taskTarget.lead} matter={taskTarget.matter} onClose={() => setTaskTarget(null)} />}
    </div>
  );
}
