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

// Contact.name e nullable no banco, e o valor padrao do parametro so cobre
// undefined — um contato sem nome chegava aqui como null e derrubava a tela.
export const initialsFor = (name) => String(name ?? '')
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
    ['lead-marcelo', 'Marcelo Nunes', '5511933377881', 'Ação indenizatória', 'CIVEL', 'CONTRATADO', 'ALTA', 'Contrato assinado e documentação inicial conferida.'],
  ].map(([id, name, phone, title, area, stage, urgency, summary], index) => ({
    id,
    contactId: `contact-${id}`,
    contact: { id: `contact-${id}`, name, phone, email: `${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '.')}@email.com` },
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

  const contacts = leads.map((lead, index) => ({
    ...lead.contact,
    createdAt: lead.createdAt,
    city: index % 2 ? 'Campinas' : 'São Paulo',
    state: 'SP',
    cpfCnpj: null,
    instanceId: index < 5 ? 'demo-whatsapp' : null,
  }));

  const contractedLead = leads.find((lead) => lead.id === 'lead-marcelo');
  const matters = [{
    id: 'matter-marcelo',
    leadId: contractedLead.id,
    contactId: contractedLead.contactId,
    contact: contractedLead.contact,
    lead: { id: contractedLead.id, title: contractedLead.title, stage: contractedLead.stage, urgency: contractedLead.urgency },
    title: contractedLead.title,
    area: contractedLead.area,
    status: 'ATIVO',
    description: contractedLead.summary,
    caseNumber: '1002458-31.2026.8.26.0100',
    court: '3ª Vara Cível',
    opposingParty: 'Empresa Exemplo Ltda.',
    openedAt: isoOffset(-72),
    createdAt: isoOffset(-72),
    updatedAt: isoOffset(-5),
    _count: { tasks: 2 },
  }];

  const tasks = [
    {
      id: 'task-documentos', leadId: contractedLead.id, matterId: 'matter-marcelo', title: 'Revisar documentos iniciais',
      description: 'Conferir contrato e comprovantes enviados.', type: 'DOCUMENTO', priority: 'ALTA', status: 'PENDENTE',
      dueAt: isoOffset(20), createdAt: isoOffset(-20), updatedAt: isoOffset(-20),
      lead: { id: contractedLead.id, title: contractedLead.title, stage: contractedLead.stage },
      matter: { id: 'matter-marcelo', title: contractedLead.title, status: 'ATIVO' },
    },
    {
      id: 'task-retorno', leadId: contractedLead.id, matterId: 'matter-marcelo', title: 'Retornar ao cliente',
      description: 'Apresentar próximos passos após a análise.', type: 'RETORNO', priority: 'MEDIA', status: 'EM_ANDAMENTO',
      dueAt: isoOffset(30), createdAt: isoOffset(-12), updatedAt: isoOffset(-4),
      lead: { id: contractedLead.id, title: contractedLead.title, stage: contractedLead.stage },
      matter: { id: 'matter-marcelo', title: contractedLead.title, status: 'ATIVO' },
    },
  ];

  const activities = [
    { id: 'activity-matter', entityType: 'matter', entityId: 'matter-marcelo', type: 'matter.created', payload: { status: 'ATIVO', area: 'CIVEL' }, actor: { name: 'Eduarda Andrade' }, createdAt: isoOffset(-72) },
    { id: 'activity-contracted', entityType: 'lead', entityId: contractedLead.id, type: 'lead.updated', payload: { fromStage: 'PROPOSTA_ENVIADA', toStage: 'CONTRATADO' }, actor: { name: 'Eduarda Andrade' }, createdAt: isoOffset(-73) },
    { id: 'activity-lead', entityType: 'lead', entityId: 'lead-mariana', type: 'lead.created', payload: { stage: 'QUALIFICACAO_IA', area: 'TRABALHISTA' }, actor: { name: 'Áurea IA' }, createdAt: isoOffset(-2) },
    { id: 'activity-task', entityType: 'task', entityId: 'task-retorno', type: 'task.created', payload: { type: 'RETORNO', priority: 'MEDIA' }, actor: { name: 'Eduarda Andrade' }, createdAt: isoOffset(-12) },
  ];

  return { leads, contacts, matters, tasks, activities };
}

export const DEMO_STORAGE_KEY = 'aurea-legal-workspace-v2';

export function readDemoWorkspace() {
  try {
    const saved = window.localStorage.getItem(DEMO_STORAGE_KEY);
    if (!saved) return createDemoWorkspace();
    const parsed = JSON.parse(saved);
    return {
      leads: parsed.leads || [],
      contacts: parsed.contacts || [],
      matters: parsed.matters || [],
      tasks: parsed.tasks || [],
      activities: parsed.activities || [],
    };
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

