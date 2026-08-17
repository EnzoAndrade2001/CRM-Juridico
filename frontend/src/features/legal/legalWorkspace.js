export const LEGAL_AREAS = [
  ['CIVEL', 'Cível'],
  ['TRABALHISTA', 'Trabalhista'],
  ['FAMILIA', 'Família'],
  ['PREVIDENCIARIO', 'Previdenciário'],
  ['SUCESSOES', 'Sucessões'],
  ['CONSUMIDOR', 'Consumidor'],
  ['EMPRESARIAL', 'Empresarial'],
  ['OUTRO', 'Outro'],
];

export const LEAD_STAGES = [
  ['NOVO_CONTATO', 'Novo contato'],
  ['QUALIFICACAO_IA', 'Qualificação IA'],
  ['AGUARDANDO_DOCUMENTOS', 'Aguardando documentos'],
  ['ANALISE_HUMANA', 'Análise humana'],
  ['CONSULTA_AGENDADA', 'Consulta agendada'],
  ['PROPOSTA_ENVIADA', 'Proposta enviada'],
  ['CONTRATADO', 'Contratado'],
  ['NAO_CONVERTIDO', 'Não convertido'],
];

export const PRIORITIES = [
  ['BAIXA', 'Baixa'],
  ['MEDIA', 'Média'],
  ['ALTA', 'Alta'],
  ['URGENTE', 'Urgente'],
];

export const MATTER_STATUSES = [
  ['TRIAGEM', 'Triagem'],
  ['ATIVO', 'Ativo'],
  ['SUSPENSO', 'Suspenso'],
  ['ENCERRADO', 'Encerrado'],
  ['ARQUIVADO', 'Arquivado'],
];

export const TASK_TYPES = [
  ['PROXIMA_ACAO', 'Próxima ação'],
  ['PRAZO', 'Prazo'],
  ['AUDIENCIA', 'Audiência'],
  ['DOCUMENTO', 'Documento'],
  ['RETORNO', 'Retorno'],
  ['OUTRO', 'Outro'],
];

export const TASK_STATUSES = [
  ['PENDENTE', 'Pendente'],
  ['EM_ANDAMENTO', 'Em andamento'],
  ['CONCLUIDA', 'Concluída'],
  ['CANCELADA', 'Cancelada'],
];

export const labelFor = (options, value) => options.find(([key]) => key === value)?.[1] || value;

export const initialsFor = (name = '') => name
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase())
  .join('') || 'CL';

const isoOffset = (hours) => new Date(Date.now() + (hours * 60 * 60 * 1000)).toISOString();

export function createDemoWorkspace() {
  const leads = [
    ['lead-mariana', 'Mariana Costa', '5511998721140', 'Revisão de verbas rescisórias', 'TRABALHISTA', 'QUALIFICACAO_IA', 'MEDIA', 'Cliente desligada sem justa causa; termo de rescisão recebido.'],
    ['lead-rafael', 'Rafael Mendes', '5511981342250', 'Guarda compartilhada', 'FAMILIA', 'ANALISE_HUMANA', 'ALTA', 'Solicitou orientação de uma advogada sobre guarda compartilhada.'],
    ['lead-carlos', 'Carlos Henrique', '5511977123321', 'Benefício negado pelo INSS', 'PREVIDENCIARIO', 'AGUARDANDO_DOCUMENTOS', 'URGENTE', 'Aguardando carta de indeferimento e documentos médicos.'],
    ['lead-ana', 'Ana Beatriz Lima', '5511966229182', 'Revisão de contrato', 'CIVEL', 'ANALISE_HUMANA', 'BAIXA', 'Contrato particular enviado para revisão.'],
    ['lead-beatriz', 'Beatriz Souza', '5511955412218', 'Acordo trabalhista', 'TRABALHISTA', 'PROPOSTA_ENVIADA', 'MEDIA', 'Proposta de honorários enviada.'],
    ['lead-andre', 'André Ribeiro', '5511944819021', 'Cobrança indevida', 'CONSUMIDOR', 'NOVO_CONTATO', 'MEDIA', 'Novo contato recebido pelo WhatsApp.'],
  ].map(([id, name, phone, title, area, stage, urgency, summary], index) => ({
    id,
    contactId: `contact-${id}`,
    contact: { id: `contact-${id}`, name, phone },
    title,
    area,
    stage,
    urgency,
    summary,
    source: 'whatsapp',
    nextActionAt: isoOffset(index + 3),
    createdAt: isoOffset(-(index + 1) * 8),
    updatedAt: isoOffset(-index),
    _count: { tasks: index % 3 },
  }));

  return {
    leads,
    matters: [],
    tasks: [],
  };
}

export const DEMO_STORAGE_KEY = 'aurea-legal-workspace-v1';

export function readDemoWorkspace() {
  try {
    const saved = window.localStorage.getItem(DEMO_STORAGE_KEY);
    return saved ? JSON.parse(saved) : createDemoWorkspace();
  } catch {
    return createDemoWorkspace();
  }
}

export function writeDemoWorkspace(workspace) {
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(workspace));
}

export function makeLocalId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}-${globalThis.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

