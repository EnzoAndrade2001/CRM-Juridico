import { useEffect, useMemo, useState } from 'react';
import {
  BriefcaseBusiness,
  Check,
  CircleAlert,
  Mail,
  MapPin,
  MessageCircleMore,
  Pencil,
  Phone,
  Plus,
  Search,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { initialsFor, labelFor, LEGAL_AREAS, LEAD_STAGES, MATTER_STATUSES } from './legalWorkspace';
import LegalDocuments from './LegalDocuments';

const EMPTY_CLIENT = { name: '', phone: '', email: '', cpfCnpj: '', city: '', state: '', notes: '' };

function Avatar({ name, large = false }) {
  return <span className={`jd-avatar ${large ? 'jd-avatar--lg' : 'jd-avatar--sm'}`}>{initialsFor(name)}</span>;
}

function Modal({ title, subtitle, children, onClose, wide = false }) {
  return (
    <div className="jd-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`jd-modal ${wide ? 'jd-modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div><button type="button" onClick={onClose} aria-label="Fechar"><X size={19} /></button></header>
        {children}
      </section>
    </div>
  );
}

function Field({ label, children, full = false }) {
  return <label className={full ? 'jd-form-field jd-form-field--full' : 'jd-form-field'}><span>{label}</span>{children}</label>;
}

function ClientForm({ workspace, client, onClose }) {
  const [form, setForm] = useState(client ? {
    name: client.name || '', phone: client.phone || '', email: client.email || '', cpfCnpj: client.cpfCnpj || '',
    city: client.city || '', state: client.state || '', notes: client.notes || '',
  } : EMPTY_CLIENT);
  const [formError, setFormError] = useState('');
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setFormError('');
    try {
      if (client) await workspace.editClient(client.id, form);
      else await workspace.addClient(form);
      onClose();
    } catch (error) {
      setFormError(error.message);
    }
  }

  return (
    <Modal title={client ? 'Editar cliente' : 'Novo cliente'} subtitle="Dados centrais utilizados em todos os atendimentos e casos." onClose={onClose} wide>
      <form onSubmit={submit}>
        <div className="jd-form-grid">
          <Field label="Nome completo" full><input required value={form.name} onChange={update('name')} placeholder="Nome do cliente" /></Field>
          <Field label="Telefone/WhatsApp"><input required value={form.phone} onChange={update('phone')} placeholder="(11) 99999-9999" /></Field>
          <Field label="E-mail"><input type="email" value={form.email} onChange={update('email')} placeholder="cliente@email.com" /></Field>
          <Field label="CPF ou CNPJ"><input value={form.cpfCnpj} onChange={update('cpfCnpj')} placeholder="Somente se necessário" /></Field>
          <Field label="Cidade"><input value={form.city} onChange={update('city')} /></Field>
          <Field label="Estado"><input maxLength="2" value={form.state} onChange={update('state')} placeholder="SP" /></Field>
          <Field label="Observações" full><textarea rows="3" value={form.notes} onChange={update('notes')} placeholder="Informações administrativas sobre o cliente." /></Field>
        </div>
        {!client && <div className="jd-client-form-note"><Check size={16} /> O cliente pode ser cadastrado antes de existir uma conexão no WhatsApp.</div>}
        {formError && <div className="jd-form-error"><CircleAlert size={16} />{formError}</div>}
        <footer className="jd-modal__actions"><button type="button" className="jd-secondary" onClick={onClose}>Cancelar</button><button className="jd-primary" disabled={workspace.saving}>{client ? <Pencil size={16} /> : <Plus size={16} />}{workspace.saving ? 'Salvando...' : client ? 'Salvar alterações' : 'Cadastrar cliente'}</button></footer>
      </form>
    </Modal>
  );
}

function ClientDetail({ workspace, client, onClose, onEdit, onOpenCrm }) {
  const leads = client.leads || workspace.leads.filter((lead) => lead.contactId === client.id);
  const matters = client.matters || workspace.matters.filter((matter) => matter.contactId === client.id);
  const matterIds = new Set(matters.map((matter) => matter.id));
  const leadIds = new Set(leads.map((lead) => lead.id));
  const tasks = client.tasks || workspace.tasks.filter((task) => matterIds.has(task.matterId) || leadIds.has(task.leadId));
  return (
    <Modal title={client.name || 'Cliente'} subtitle="Perfil jurídico e vínculos do CRM." onClose={onClose} wide>
      <div className="jd-client-detail">
        <section className="jd-client-detail__identity">
          <Avatar name={client.name} large />
          <div><h4>{client.name}</h4><p>{client.cpfCnpj || 'Documento não informado'}</p><span>{client.instanceId ? 'WhatsApp vinculado' : 'Cadastro interno'}</span></div>
          <button type="button" className="jd-secondary" onClick={onEdit}><Pencil size={15} /> Editar</button>
        </section>
        <section className="jd-client-contact-grid">
          <div><Phone size={16} /><span><small>Telefone</small><strong>{client.phone || 'Não informado'}</strong></span></div>
          <div><Mail size={16} /><span><small>E-mail</small><strong>{client.email || 'Não informado'}</strong></span></div>
          <div><MapPin size={16} /><span><small>Localização</small><strong>{[client.city, client.state].filter(Boolean).join(' / ') || 'Não informada'}</strong></span></div>
        </section>
        <section className="jd-client-links">
          <header><h4>Relacionamento jurídico</h4><button type="button" onClick={onOpenCrm}><Plus size={15} /> Nova oportunidade</button></header>
          <div className="jd-client-link-metrics"><span><strong>{leads.length}</strong> oportunidades</span><span><strong>{matters.length}</strong> casos</span><span><strong>{tasks.filter((task) => !['CONCLUIDA', 'CANCELADA'].includes(task.status)).length}</strong> tarefas abertas</span></div>
          {leads.map((lead) => <article key={lead.id}><MessageCircleMore size={16} /><span><strong>{lead.title}</strong><small>{labelFor(LEGAL_AREAS, lead.area)}</small></span><b>{labelFor(LEAD_STAGES, lead.stage)}</b></article>)}
          {matters.map((matter) => <article key={matter.id}><BriefcaseBusiness size={16} /><span><strong>{matter.title}</strong><small>{matter.caseNumber || 'Sem número de processo'}</small></span><b>{labelFor(MATTER_STATUSES, matter.status)}</b></article>)}
          {!leads.length && !matters.length && <div className="jd-client-no-links">Este cliente ainda não possui oportunidade ou caso.</div>}
        </section>
        {client.activities?.length > 0 && <section className="jd-history"><h4>Histórico cadastral</h4>{client.activities.slice(0, 8).map((item) => <article key={item.id}><i /><span><strong>{item.type === 'client.created' ? 'Cliente cadastrado' : 'Dados do cliente atualizados'}</strong><small>{item.actor?.name || 'Sistema'} · {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.createdAt))}</small></span></article>)}</section>}
        {!workspace.demoMode && <LegalDocuments workspace={workspace} contactId={client.id} compact />}
      </div>
    </Modal>
  );
}

export default function LegalClients({ workspace, onNavigate }) {
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const clients = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return workspace.contacts.filter((client) => !term || `${client.name || ''} ${client.phone || ''} ${client.email || ''} ${client.cpfCnpj || ''}`.toLocaleLowerCase('pt-BR').includes(term));
  }, [search, workspace.contacts]);
  const linkedIds = new Set([...workspace.leads.map((lead) => lead.contactId), ...workspace.matters.map((matter) => matter.contactId)]);
  const whatsappCount = workspace.contacts.filter((client) => client.instanceId).length;

  async function openClient(client) {
    setSelected(client);
    try {
      const detail = await workspace.loadClientDetail(client.id);
      setSelected((current) => current?.id === client.id ? detail : current);
    } catch {
      // Mantém os dados já carregados da lista caso o dossiê fique temporariamente indisponível.
    }
  }

  useEffect(() => {
    const clientId = new URLSearchParams(window.location.search).get('clientId');
    if (!clientId || !workspace.contacts.length) return;
    const client = workspace.contacts.find((item) => item.id === clientId);
    if (!client) return;
    const url = new URL(window.location.href);
    url.searchParams.delete('clientId');
    window.history.replaceState({}, '', url);
    openClient(client);
  }, [workspace.contacts]);

  return (
    <div className="jd-page jd-clients-page">
      <div className="jd-section-intro"><div><h2>Clientes</h2><p>Cadastro central, dados de contato e relacionamento jurídico.</p></div><button type="button" className="jd-primary" onClick={() => setCreating(true)}><Plus size={17} /> Novo cliente</button></div>
      {workspace.error && <div className="jd-workspace-error"><CircleAlert size={17} /><span>{workspace.error}</span><button type="button" onClick={workspace.refresh}>Tentar novamente</button></div>}
      <section className="jd-client-stats">
        <article><UsersRound size={20} /><span><strong>{workspace.contacts.length}</strong> clientes cadastrados</span></article>
        <article><BriefcaseBusiness size={20} /><span><strong>{linkedIds.size}</strong> com demanda jurídica</span></article>
        <article><MessageCircleMore size={20} /><span><strong>{whatsappCount}</strong> vinculados ao WhatsApp</span></article>
      </section>
      <section className="jd-card jd-client-table">
        <header><div><h3>Base de clientes</h3><p>{clients.length} registro(s) encontrado(s)</p></div><label><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar nome, telefone, e-mail ou documento" /></label></header>
        <div className="jd-client-table__head"><span>Cliente</span><span>Contato</span><span>Localização</span><span>Oportunidades</span><span>Casos</span><span /></div>
        {clients.map((client) => {
          const leadCount = workspace.leads.filter((lead) => lead.contactId === client.id).length;
          const matterCount = workspace.matters.filter((matter) => matter.contactId === client.id).length;
          return <button type="button" className="jd-client-table__row" key={client.id} onClick={() => openClient(client)}><span className="jd-person-cell"><Avatar name={client.name} /><span><strong>{client.name || 'Cliente sem nome'}</strong><small>{client.cpfCnpj || (client.instanceId ? 'WhatsApp vinculado' : 'Cadastro interno')}</small></span></span><span><strong>{client.phone}</strong><small>{client.email || 'Sem e-mail'}</small></span><span>{[client.city, client.state].filter(Boolean).join(' / ') || 'Não informada'}</span><b>{leadCount}</b><b>{matterCount}</b><UserRound size={17} /></button>;
        })}
        {!clients.length && <div className="jd-legal-empty"><UsersRound size={25} /><strong>Nenhum cliente encontrado</strong><span>Cadastre o primeiro cliente ou altere a busca.</span></div>}
      </section>
      {creating && <ClientForm workspace={workspace} onClose={() => setCreating(false)} />}
      {editing && <ClientForm workspace={workspace} client={editing} onClose={() => { setEditing(null); setSelected(null); }} />}
      {selected && !editing && <ClientDetail workspace={workspace} client={selected} onClose={() => setSelected(null)} onEdit={() => setEditing(selected)} onOpenCrm={() => { setSelected(null); onNavigate('crm'); }} />}
    </div>
  );
}
