import { useEffect, useMemo, useState } from 'react';
import {
  BrainCircuit,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { createKnowledge, deleteKnowledge, getKnowledge, updateKnowledge } from '../../services/api';
import { toast } from '../../utils/toast';
import LegalModal from './LegalModal';

const EMPTY_FORM = { question: '', answer: '', tags: '' };

function errorMessage(error) {
  return error?.response?.data?.error || error?.message || 'Não foi possível concluir a operação.';
}

export default function LegalKnowledgeBase() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  async function load() {
    setLoading(true);
    try {
      const response = await getKnowledge();
      setItems(Array.isArray(response.data) ? response.data : []);
      setError('');
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const visibleItems = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (!term) return items;
    return items.filter((item) => `${item.question || ''} ${item.answer || ''} ${item.tags || ''}`.toLocaleLowerCase('pt-BR').includes(term));
  }, [items, search]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setForm({ question: item.question || '', answer: item.answer || '', tags: item.tags || '' });
    setModalOpen(true);
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) await updateKnowledge(editing.id, form);
      else await createKnowledge(form);
      setModalOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await load();
      toast.success(editing ? 'Orientação atualizada.' : 'Orientação adicionada à base da IA.');
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item) {
    try {
      await updateKnowledge(item.id, { active: !item.active });
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, active: !entry.active } : entry));
      toast.success(item.active ? 'Orientação arquivada para a IA.' : 'Orientação ativada para a IA.');
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }

  function remove(item) {
    toast.confirm(`Excluir a orientação “${item.question}”?`, async () => {
      try {
        await deleteKnowledge(item.id);
        setItems((current) => current.filter((entry) => entry.id !== item.id));
        toast.success('Orientação removida.');
      } catch (requestError) {
        setError(errorMessage(requestError));
      }
    });
  }

  const activeCount = items.filter((item) => item.active).length;

  return (
    <div className="jd-page jd-knowledge-page">
      <div className="jd-section-intro">
        <div><h2>Base da IA</h2><p>Conteúdo aprovado para orientar a triagem e as respostas do atendimento jurídico.</p></div>
        <button type="button" className="jd-primary" onClick={openCreate}><Plus size={17} /> Nova orientação</button>
      </div>

      {error && <div className="jd-workspace-error"><CircleAlert size={17} /><span>{error}</span><button type="button" onClick={load}>Tentar novamente</button></div>}

      <section className="jd-knowledge-stats">
        <article><BrainCircuit size={20} /><span><strong>{items.length}</strong> orientações cadastradas</span></article>
        <article><ShieldCheck size={20} /><span><strong>{activeCount}</strong> disponíveis para a IA</span></article>
        <article><EyeOff size={20} /><span><strong>{items.length - activeCount}</strong> arquivadas</span></article>
      </section>

      <section className="jd-card jd-knowledge-card">
        <header><div><h3>Conteúdo jurídico aprovado</h3><p>{visibleItems.length} registro(s) encontrado(s)</p></div><label><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar pergunta, resposta ou tag" aria-label="Buscar na base da IA" /></label></header>
        {loading ? <div className="jd-workspace-loading"><BrainCircuit size={22} /> Carregando base da IA...</div> : (
          <div className="jd-knowledge-grid">
            {visibleItems.map((item) => (
              <article className={`jd-knowledge-item ${item.active ? '' : 'is-archived'}`} key={item.id}>
                <div className="jd-knowledge-item__top"><span className={item.active ? 'jd-knowledge-status is-active' : 'jd-knowledge-status'}>{item.active ? <Check size={13} /> : <EyeOff size={13} />} {item.active ? 'Ativa' : 'Arquivada'}</span><small>{item.createdAt ? new Intl.DateTimeFormat('pt-BR').format(new Date(item.createdAt)) : ''}</small></div>
                <h4>{item.question}</h4>
                <p>{item.answer}</p>
                {item.tags && <div className="jd-knowledge-tags">{item.tags.split(',').map((tag) => <span key={tag}>{tag.trim()}</span>)}</div>}
                <footer><button type="button" className="jd-secondary" onClick={() => openEdit(item)}><Pencil size={14} /> Editar</button><button type="button" className="jd-secondary" onClick={() => toggle(item)}>{item.active ? <EyeOff size={14} /> : <Eye size={14} />} {item.active ? 'Arquivar' : 'Ativar'}</button><button type="button" className="jd-icon-danger" onClick={() => remove(item)} aria-label="Excluir orientação"><Trash2 size={15} /></button></footer>
              </article>
            ))}
            {!visibleItems.length && <div className="jd-knowledge-empty"><BrainCircuit size={27} /><strong>{search ? 'Nenhum conteúdo encontrado' : 'A base da IA ainda está vazia'}</strong><span>Adicione orientações aprovadas pela advogada para a IA usar na triagem.</span><button type="button" className="jd-primary" onClick={openCreate}><Plus size={16} /> Adicionar orientação</button></div>}
          </div>
        )}
      </section>

      {modalOpen && <LegalModal title={editing ? 'Editar orientação' : 'Nova orientação'} subtitle="Apenas conteúdo aprovado deve ficar ativo para a IA." onClose={() => setModalOpen(false)} wide><form onSubmit={save}><div className="jd-form-grid"><label className="jd-form-field jd-form-field--full"><span>Pergunta ou tópico</span><input required maxLength={500} value={form.question} onChange={(event) => setForm((current) => ({ ...current, question: event.target.value }))} placeholder="Ex.: Quais documentos solicitar em uma revisão bancária?" /></label><label className="jd-form-field jd-form-field--full"><span>Resposta orientadora</span><textarea required rows="8" maxLength={10000} value={form.answer} onChange={(event) => setForm((current) => ({ ...current, answer: event.target.value }))} placeholder="Escreva a orientação jurídica aprovada pelo escritório." /></label><label className="jd-form-field jd-form-field--full"><span>Tags</span><input maxLength={300} value={form.tags} onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))} placeholder="revisional, documentos, triagem" /></label></div><div className="jd-modal__actions"><button type="button" className="jd-secondary" onClick={() => setModalOpen(false)}>Cancelar</button><button type="submit" className="jd-primary" disabled={saving}>{saving ? 'Salvando...' : <><Check size={16} /> Salvar orientação</>}</button></div></form></LegalModal>}
    </div>
  );
}
