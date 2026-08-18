import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CircleAlert,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  Filter,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import {
  createLegalDocument,
  downloadLegalDocument,
  getLegalDocuments,
  updateLegalDocument,
  uploadLegalDocumentFile,
} from '../../services/api';

const DOCUMENT_KINDS = [
  ['IDENTIDADE', 'Documento de identidade'],
  ['COMPROVANTE_RESIDENCIA', 'Comprovante de residência'],
  ['COMPROVANTE_RENDA', 'Comprovante de renda'],
  ['CONTRATO', 'Contrato'],
  ['PROCURACAO', 'Procuração'],
  ['RESCISAO', 'Rescisão'],
  ['DECISAO_JUDICIAL', 'Decisão judicial'],
  ['LAUDO', 'Laudo'],
  ['COMPROVANTE_PAGAMENTO', 'Comprovante de pagamento'],
  ['OUTRO', 'Outro documento'],
];

const DOCUMENT_STATUSES = [
  ['SOLICITADO', 'Solicitado', 'pending'],
  ['RECEBIDO', 'Recebido', 'received'],
  ['EM_ANALISE', 'Em análise', 'review'],
  ['APROVADO', 'Aprovado', 'approved'],
  ['RECUSADO', 'Recusado', 'rejected'],
  ['ARQUIVADO', 'Arquivado', 'archived'],
];

const EMPTY_FORM = {
  title: '',
  kind: 'OUTRO',
  description: '',
  dueAt: '',
  contactId: '',
  file: null,
};

function labelFor(options, value, fallback = value || '—') {
  return options.find(([key]) => key === value)?.[1] || fallback;
}

function statusMeta(status) {
  const item = DOCUMENT_STATUSES.find(([key]) => key === status);
  return item || [status || '—', status || '—', 'neutral'];
}

function errorMessage(error) {
  return error?.response?.data?.error || error?.message || 'Não foi possível concluir a operação.';
}

function formatDate(value, withTime = false) {
  if (!value) return 'Sem prazo';
  try {
    return new Intl.DateTimeFormat('pt-BR', withTime
      ? { dateStyle: 'short', timeStyle: 'short' }
      : { dateStyle: 'short' }).format(new Date(value));
  } catch {
    return 'Data inválida';
  }
}

function formatFileSize(size) {
  if (!size) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function Modal({ title, subtitle, children, onClose }) {
  return (
    <div className="jd-modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="jd-modal jd-modal--wide" role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
          <button type="button" onClick={onClose} aria-label="Fechar"><X size={19} /></button>
        </header>
        {children}
      </section>
    </div>
  );
}

function DocumentStatus({ status }) {
  const [, label, tone] = statusMeta(status);
  return <span className={`jd-document-status jd-document-status--${tone}`}>{label}</span>;
}

function DocumentForm({ form, setForm, contacts, fixedContactId, saving, error, onClose, onSubmit }) {
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  return (
    <Modal title="Solicitar documento" subtitle="Registre a pendência ou já anexe o arquivo recebido." onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="jd-form-grid">
          {!fixedContactId && (
            <label className="jd-form-field jd-form-field--full">
              <span>Cliente</span>
              <select required value={form.contactId} onChange={update('contactId')}>
                <option value="">Selecione o cliente</option>
                {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.name || 'Cliente sem nome'}</option>)}
              </select>
            </label>
          )}
          <label className="jd-form-field jd-form-field--full"><span>Título da solicitação</span><input required maxLength={180} value={form.title} onChange={update('title')} placeholder="Ex.: Contrato de financiamento assinado" /></label>
          <label className="jd-form-field"><span>Tipo de documento</span><select value={form.kind} onChange={update('kind')}>{DOCUMENT_KINDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="jd-form-field"><span>Prazo para envio</span><input type="datetime-local" value={form.dueAt} onChange={update('dueAt')} /></label>
          <label className="jd-form-field jd-form-field--full"><span>Orientação ao cliente</span><textarea rows="3" maxLength={5000} value={form.description} onChange={update('description')} placeholder="Explique o que deve ser enviado e em qual formato." /></label>
          <label className="jd-form-field jd-form-field--full jd-document-file-field"><span>Arquivo (opcional)</span><input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={(event) => setForm((current) => ({ ...current, file: event.target.files?.[0] || null }))} /><small>{form.file ? `${form.file.name} · ${formatFileSize(form.file.size)}` : 'PDF, imagens ou documentos Word · limite de 20 MB'}</small></label>
        </div>
        {error && <div className="jd-form-error"><CircleAlert size={16} />{error}</div>}
        <footer className="jd-modal__actions"><button type="button" className="jd-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="jd-primary" disabled={saving}>{saving ? <><LoaderCircle size={16} className="jd-spin-icon" /> Salvando...</> : <><Check size={16} /> {form.file ? 'Registrar documento' : 'Solicitar documento'}</>}</button></footer>
      </form>
    </Modal>
  );
}

function ReviewForm({ document, status, setStatus, notes, setNotes, saving, error, onClose, onSubmit }) {
  return (
    <Modal title="Revisar documento" subtitle={document.title} onClose={onClose}>
      <form onSubmit={onSubmit}>
        <div className="jd-form-grid">
          <label className="jd-form-field jd-form-field--full"><span>Situação</span><select value={status} onChange={(event) => setStatus(event.target.value)}>{DOCUMENT_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="jd-form-field jd-form-field--full"><span>Observação da análise {status === 'RECUSADO' ? '(obrigatória)' : '(opcional)'}</span><textarea rows="5" required={status === 'RECUSADO'} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Registre o parecer, pendência ou motivo da recusa." /></label>
        </div>
        {error && <div className="jd-form-error"><CircleAlert size={16} />{error}</div>}
        <footer className="jd-modal__actions"><button type="button" className="jd-secondary" onClick={onClose}>Cancelar</button><button type="submit" className="jd-primary" disabled={saving}>{saving ? 'Salvando...' : <><ShieldCheck size={16} /> Atualizar situação</>}</button></footer>
      </form>
    </Modal>
  );
}

export default function LegalDocuments({ workspace, contactId = null, leadId = null, matterId = null, compact = false }) {
  const contacts = workspace?.contacts || [];
  const fixedContactId = contactId || null;
  const fileInputRef = useRef(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [reviewing, setReviewing] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('EM_ANALISE');
  const [reviewNotes, setReviewNotes] = useState('');
  const [form, setForm] = useState({ ...EMPTY_FORM, contactId: fixedContactId || '' });
  const [uploadingId, setUploadingId] = useState(null);

  const queryParams = useMemo(() => ({
    ...(fixedContactId && { contactId: fixedContactId }),
    ...(leadId && { leadId }),
    ...(matterId && { matterId }),
    limit: 100,
  }), [fixedContactId, leadId, matterId]);

  async function load() {
    setLoading(true);
    try {
      const response = await getLegalDocuments(queryParams);
      setDocuments(Array.isArray(response.data?.items) ? response.data.items : []);
      setError('');
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [queryParams]);

  const visibleDocuments = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return documents.filter((document) => {
      const matchesSearch = !term || `${document.title || ''} ${document.fileName || ''} ${document.contact?.name || ''}`.toLocaleLowerCase('pt-BR').includes(term);
      return matchesSearch && (!statusFilter || document.status === statusFilter) && (!kindFilter || document.kind === kindFilter);
    });
  }, [documents, kindFilter, search, statusFilter]);

  const stats = useMemo(() => ({
    total: documents.length,
    pending: documents.filter((document) => document.status === 'SOLICITADO').length,
    received: documents.filter((document) => ['RECEBIDO', 'EM_ANALISE'].includes(document.status)).length,
    approved: documents.filter((document) => document.status === 'APROVADO').length,
  }), [documents]);

  function openCreate() {
    setForm({ ...EMPTY_FORM, contactId: fixedContactId || '' });
    setError('');
    setCreateOpen(true);
  }

  async function submitCreate(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('kind', form.kind);
      formData.append('description', form.description || '');
      formData.append('contactId', fixedContactId || form.contactId);
      if (leadId) formData.append('leadId', leadId);
      if (matterId) formData.append('matterId', matterId);
      if (form.dueAt) formData.append('dueAt', new Date(form.dueAt).toISOString());
      if (form.file) formData.append('file', form.file);
      await createLegalDocument(formData);
      setCreateOpen(false);
      await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function uploadFile(event) {
    const file = event.target.files?.[0];
    const id = event.target.dataset.documentId;
    event.target.value = '';
    if (!file || !id) return;
    setUploadingId(id);
    setError('');
    try {
      const response = await uploadLegalDocumentFile(id, file);
      setDocuments((current) => current.map((document) => document.id === id ? response.data : document));
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setUploadingId(null);
    }
  }

  function selectUpload(document) {
    fileInputRef.current.dataset.documentId = document.id;
    fileInputRef.current.click();
  }

  function openReview(document) {
    setReviewing(document);
    setReviewStatus(document.status === 'SOLICITADO' ? 'EM_ANALISE' : document.status);
    setReviewNotes(document.reviewNotes || '');
    setError('');
  }

  async function submitReview(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await updateLegalDocument(reviewing.id, { status: reviewStatus, reviewNotes: reviewNotes || null });
      setDocuments((current) => current.map((document) => document.id === reviewing.id ? response.data : document));
      setReviewing(null);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function download(document) {
    setError('');
    try {
      const response = await downloadLegalDocument(document.id);
      const url = URL.createObjectURL(response.data);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = document.fileName || document.title || 'documento';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  return (
    <section className={compact ? 'jd-documents jd-documents--compact' : 'jd-page jd-document-page'}>
      <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" hidden onChange={uploadFile} />
      <div className="jd-section-intro jd-document-intro"><div><h2>{compact ? 'Documentos do caso' : 'Documentos jurídicos'}</h2><p>{compact ? 'Solicitações, arquivos e pareceres vinculados a este cliente.' : 'Centralize as solicitações, recebimentos e revisões do escritório.'}</p></div><div className="jd-document-intro__actions"><button type="button" className="jd-secondary" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? 'jd-spin-icon' : ''} /> Atualizar</button><button type="button" className="jd-primary" onClick={openCreate}><Plus size={17} /> Solicitar documento</button></div></div>
      {error && <div className="jd-workspace-error"><CircleAlert size={17} /><span>{error}</span><button type="button" onClick={load}>Tentar novamente</button></div>}
      <div className="jd-document-stats"><article><FileText size={20} /><span><strong>{stats.total}</strong> documentos</span></article><article><Clock3 size={20} /><span><strong>{stats.pending}</strong> aguardando envio</span></article><article><Upload size={20} /><span><strong>{stats.received}</strong> recebidos / em análise</span></article><article><FileCheck2 size={20} /><span><strong>{stats.approved}</strong> aprovados</span></article></div>
      <section className="jd-card jd-document-card">
        <header><div><h3>{compact ? 'Dossiê documental' : 'Dossiê do escritório'}</h3><p>{visibleDocuments.length} registro(s) encontrado(s)</p></div><div className="jd-document-filters"><label><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar documento ou cliente" /></label><label><Filter size={14} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Todas as situações</option>{DOCUMENT_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><select value={kindFilter} onChange={(event) => setKindFilter(event.target.value)} aria-label="Filtrar por tipo"><option value="">Todos os tipos</option>{DOCUMENT_KINDS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></header>
        {loading ? <div className="jd-workspace-loading"><LoaderCircle size={23} /> Carregando documentos...</div> : visibleDocuments.length ? <div className="jd-document-list">{visibleDocuments.map((document) => <article className="jd-document-row" key={document.id}><div className="jd-document-row__icon"><FileText size={19} /></div><div className="jd-document-row__main"><strong>{document.title}</strong><span>{labelFor(DOCUMENT_KINDS, document.kind)}{document.contact?.name ? ` · ${document.contact.name}` : ''}</span>{document.description && <small>{document.description}</small>}</div><div className="jd-document-row__meta"><DocumentStatus status={document.status} /><span>{document.dueAt ? `Prazo: ${formatDate(document.dueAt)}` : formatDate(document.createdAt)}</span>{document.fileName && <small>{document.fileName}{document.fileSize ? ` · ${formatFileSize(document.fileSize)}` : ''}</small>}</div><div className="jd-document-row__actions">{document.hasFile && <button type="button" className="jd-icon-button jd-document-action" onClick={() => download(document)} title="Baixar arquivo"><Download size={16} /></button>}<button type="button" className="jd-icon-button jd-document-action" onClick={() => selectUpload(document)} disabled={uploadingId === document.id} title="Anexar ou substituir arquivo">{uploadingId === document.id ? <LoaderCircle size={16} className="jd-spin-icon" /> : <Upload size={16} />}</button><button type="button" className="jd-secondary jd-document-review-button" onClick={() => openReview(document)}><ShieldCheck size={14} /> Revisar</button></div></article>)}</div> : <div className="jd-document-empty"><FileText size={28} /><strong>{search || statusFilter || kindFilter ? 'Nenhum documento encontrado' : 'Nenhum documento cadastrado'}</strong><span>{search || statusFilter || kindFilter ? 'Altere os filtros para ver outros registros.' : 'Solicite o primeiro documento para começar o dossiê jurídico.'}</span>{!search && !statusFilter && !kindFilter && <button type="button" className="jd-primary" onClick={openCreate}><Plus size={16} /> Solicitar documento</button>}</div>}
      </section>
      {createOpen && <DocumentForm form={form} setForm={setForm} contacts={contacts} fixedContactId={fixedContactId} saving={saving} error={error} onClose={() => setCreateOpen(false)} onSubmit={submitCreate} />}
      {reviewing && <ReviewForm document={reviewing} status={reviewStatus} setStatus={setReviewStatus} notes={reviewNotes} setNotes={setReviewNotes} saving={saving} error={error} onClose={() => setReviewing(null)} onSubmit={submitReview} />}
    </section>
  );
}
