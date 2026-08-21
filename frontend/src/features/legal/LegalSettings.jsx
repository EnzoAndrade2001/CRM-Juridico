import { useEffect, useState } from 'react';
import { Bot, Check, CircleAlert, KeyRound, LoaderCircle, Save, Sparkles } from 'lucide-react';
import { getSettings, saveSettings } from '../../services/api';

const EMPTY_SETTINGS = {
  botEnabled: false,
  botName: '',
  aiProvider: 'auto',
  openaiKey: '',
  geminiKey: '',
  systemPrompt: '',
  transferKeyword: 'atendente',
};

function messageForError(error, fallback) {
  return error?.response?.data?.error || error?.message || fallback;
}

export default function LegalSettings({ demoMode = false, onSettingsChanged }) {
  const [form, setForm] = useState(EMPTY_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!demoMode);
  const [loadError, setLoadError] = useState('');
  const [feedback, setFeedback] = useState(null);

  async function load() {
    if (demoMode) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await getSettings();
      setForm((current) => ({
        ...current,
        ...data,
        systemPrompt: data.botSystemPrompt || data.systemPrompt || '',
        transferKeyword: data.botTransferWord || data.transferKeyword || 'atendente',
      }));
    } catch (error) {
      setLoadError(messageForError(error, 'Não foi possível carregar as configurações.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [demoMode]);

  const update = (field) => (event) => {
    setFeedback(null);
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  async function handleSave(event) {
    event.preventDefault();
    if (demoMode || saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      await saveSettings(form);
      setFeedback({ tone: 'success', message: 'Configurações salvas e prontas para o próximo atendimento.' });
      onSettingsChanged?.();
    } catch (error) {
      setFeedback({ tone: 'error', message: messageForError(error, 'Não foi possível salvar. Revise os dados e tente novamente.') });
    } finally {
      setSaving(false);
    }
  }

  const providerLabel = form.aiProvider === 'openai'
    ? 'OpenAI · GPT-4o mini'
    : form.aiProvider === 'gemini'
      ? 'Google Gemini'
      : form.openaiKey
        ? 'Automático · OpenAI'
        : form.geminiKey
          ? 'Automático · Gemini'
          : 'Provedor pendente';

  if (loading) {
    return <div className="jd-workspace-loading" role="status" aria-live="polite"><LoaderCircle className="jd-spin-icon" size={22} /> Carregando configurações...</div>;
  }

  return (
    <div className="jd-page jd-settings-page">
      <div className="jd-section-intro">
        <div><h2>Automação do atendimento</h2><p>Defina quando a IA atua e quais credenciais serão usadas com segurança.</p></div>
        <span className={`jd-settings-provider ${form.openaiKey || form.geminiKey ? 'is-ready' : ''}`}><Sparkles size={15} /> {providerLabel}</span>
      </div>

      {demoMode && <div className="jd-settings-notice" role="status"><CircleAlert size={17} /><span><strong>Modo demonstração.</strong> As alterações desta tela não são enviadas ao servidor.</span></div>}
      {loadError && <div className="jd-workspace-error" role="alert"><CircleAlert size={17} /><span>{loadError}</span><button type="button" onClick={load}>Tentar novamente</button></div>}

      <form className="jd-settings-form" onSubmit={handleSave} aria-busy={saving}>
        <section className="jd-settings-card" aria-labelledby="jd-bot-settings-title">
          <header>
            <span><Bot size={21} /></span>
            <div><h3 id="jd-bot-settings-title">Robô de atendimento</h3><p>Controle a triagem automática e as instruções usadas no WhatsApp.</p></div>
          </header>

          <div className="jd-settings-toggle-row">
            <div><strong>Atendimento automático</strong><small id="jd-bot-enabled-help">{form.botEnabled ? 'Ativo e preparado para responder novos atendimentos.' : 'Desativado; as mensagens permanecem na fila humana.'}</small></div>
            <button
              type="button"
              className={`jd-switch ${form.botEnabled ? 'is-active' : ''}`}
              role="switch"
              aria-checked={form.botEnabled}
              aria-describedby="jd-bot-enabled-help"
              onClick={() => { setFeedback(null); setForm((current) => ({ ...current, botEnabled: !current.botEnabled })); }}
            ><span /></button>
          </div>

          <label className="jd-form-field" htmlFor="jd-bot-name"><span>Nome do robô</span><input id="jd-bot-name" value={form.botName || ''} onChange={update('botName')} placeholder="Assistente de Atendimento Jurídico" /></label>
          <label className="jd-form-field" htmlFor="jd-transfer-keyword"><span>Palavra-chave de transferência</span><input id="jd-transfer-keyword" value={form.transferKeyword || ''} onChange={update('transferKeyword')} placeholder="humano" aria-describedby="jd-transfer-help" /><small id="jd-transfer-help">Ao receber esta palavra, a IA interrompe a resposta e encaminha o atendimento à equipe.</small></label>
          <label className="jd-form-field" htmlFor="jd-system-prompt"><span>Instruções do sistema</span><textarea id="jd-system-prompt" rows="9" value={form.systemPrompt || ''} onChange={update('systemPrompt')} placeholder="Descreva o tom profissional, os serviços do escritório e as regras de triagem." aria-describedby="jd-prompt-help" /><small id="jd-prompt-help">Use somente orientações aprovadas pelo escritório e não inclua chaves ou dados sigilosos.</small></label>
        </section>

        <section className="jd-settings-card" aria-labelledby="jd-provider-settings-title">
          <header>
            <span><KeyRound size={21} /></span>
            <div><h3 id="jd-provider-settings-title">Provedor de IA</h3><p>Escolha o serviço responsável pelas respostas e transcrições.</p></div>
          </header>

          <label className="jd-form-field" htmlFor="jd-ai-provider"><span>Provedor ativo</span><select id="jd-ai-provider" value={form.aiProvider || 'auto'} onChange={update('aiProvider')}><option value="auto">Automático</option><option value="openai">OpenAI — GPT-4o mini e transcrição</option><option value="gemini">Google Gemini</option></select><small>No modo automático, o sistema prioriza a OpenAI quando a chave estiver configurada.</small></label>
          <label className="jd-form-field" htmlFor="jd-openai-key"><span>Chave OpenAI</span><input id="jd-openai-key" type="password" autoComplete="new-password" value={form.openaiKey || ''} onChange={update('openaiKey')} placeholder="sk-proj-..." aria-describedby="jd-openai-help" /><small id="jd-openai-help">Utilizada para respostas e transcrição de áudio em português.</small></label>
          <label className="jd-form-field" htmlFor="jd-gemini-key"><span>Chave Gemini</span><input id="jd-gemini-key" type="password" autoComplete="new-password" value={form.geminiKey || ''} onChange={update('geminiKey')} placeholder="AIza..." aria-describedby="jd-gemini-help" /><small id="jd-gemini-help">Alternativa usada somente quando o provedor selecionado permitir.</small></label>

          <div className="jd-settings-security-note"><KeyRound size={17} /><span>As chaves ficam restritas ao ambiente do escritório e nunca são exibidas integralmente após o salvamento.</span></div>
        </section>

        <footer className="jd-settings-actions">
          <div aria-live="polite">
            {feedback && <span className={`jd-settings-feedback is-${feedback.tone}`} role={feedback.tone === 'error' ? 'alert' : 'status'}>{feedback.tone === 'success' ? <Check size={16} /> : <CircleAlert size={16} />}{feedback.message}</span>}
          </div>
          <button type="submit" className="jd-primary" disabled={saving || demoMode || Boolean(loadError)}>{saving ? <><LoaderCircle className="jd-spin-icon" size={17} /> Salvando...</> : <><Save size={17} /> Salvar configurações</>}</button>
        </footer>
      </form>
    </div>
  );
}
