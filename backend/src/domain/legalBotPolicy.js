const GREETING_ONLY = /^(oi+|ola+|olá+|bom dia|boa tarde|boa noite|tudo bem|opa|e ai|e aí)[!.?\s]*$/i;
const VAGUE_MESSAGE = /^(oi+|ola+|olá+|bom dia|boa tarde|boa noite|tudo bem|opa|e ai|e aí|quero ajuda|preciso de (?:um |uma )?advogad[oa]|quero informa[cç][oõ]es|tenho um problema|preciso de ajuda(?: com (?:meu|o) caso)?)[!.?\s]*$/i;
const HUMAN_HANDOFF = /^(atendente|advogad[oa]|humano|atendimento humano|falar com atendente|falar com (?:um |uma )?advogad[oa]|quero falar com algu[eé]m|quero atendimento humano)[!.?\s]*$/i;
const LEGAL_SUBJECT_TERMS = /banco|financi|juros|parcela|contrato|cobran|divida|dívida|negativ|protesto|apreens|veiculo|veículo|carro|imposto|renda|autismo|tea|beneficio|benefício|aposent|consum|produto|servi[cç]o|fraude|golpe|trabalh|demit|rescis|sal[aá]rio|ass[eé]dio|fam[ií]lia|div[oó]rcio|pens[aã]o|guarda|invent[aá]rio|heran[cç]a|herdeir|processo|cita[cç][aã]o|intima[cç][aã]o|jurid|advog/i;
const NON_NAME_TERMS = /\b(preciso|quero|gostaria|ajuda|orienta[cç][aã]o|tenho|meu|minha|sobre|problema|duvida|dúvida|direito)\b/i;

const LEGAL_SERVICES = [
  'Bancos e Financiamentos',
  'Busca e apreensão de veículos',
  'Cobranças e Dívidas',
  'Contratos',
  'Isenção de Imposto de Renda',
  'Direito do Consumidor',
  'Direito Trabalhista',
  'Família, Divórcio e Pensão',
  'Inventário e Herança',
  'Processos Judiciais',
  'Outro assunto jurídico',
  'Falar com um atendente',
];

const LEGAL_SPECIFIC_OPTIONS = {
  'Bancos e Financiamentos': [
    'Parcelas muito altas',
    'Juros muito altos',
    'Revisão de financiamento',
    'Parcelas atrasadas',
    'Dúvidas sobre o contrato',
    'Outro problema bancário ou de financiamento',
  ],
  'Busca e Apreensão de Veículos': [
    'Recebi notificação ou ordem de busca e apreensão',
    'O veículo já foi apreendido',
    'Tenho parcelas atrasadas e receio de apreensão',
    'Quero analisar ou revisar o financiamento',
    'Preciso apresentar defesa',
    'Outra situação relacionada ao veículo',
  ],
  'Cobranças e Dívidas': [
    'Estou recebendo uma cobrança',
    'Não reconheço a dívida ou cobrança',
    'Quero negociar uma dívida',
    'A cobrança parece abusiva',
    'Negativação ou protesto',
    'Outra situação de cobrança',
  ],
  Contratos: [
    'Analisar antes de assinar',
    'Revisar cláusulas de um contrato',
    'Descumprimento contratual',
    'Rescisão ou cancelamento',
    'Cobrança ou execução de contrato',
    'Outro problema contratual',
  ],
  'Isenção de Imposto de Renda': [
    'Isenção relacionada ao autismo ou TEA',
    'Isenção relacionada a outra condição de saúde',
    'Pedido de isenção negado',
    'Já há desconto de imposto no benefício',
    'Dúvidas sobre documentos necessários',
    'Outra situação relacionada à isenção',
  ],
  'Direito do Consumidor': [
    'Problema com produto ou serviço',
    'Cobrança ou serviço bancário',
    'Negativação indevida',
    'Fraude ou golpe',
    'Problema com viagem ou companhia aérea',
    'Outro problema de consumo',
  ],
  'Direito Trabalhista': [
    'Demissão e verbas rescisórias',
    'Horas extras ou valores não pagos',
    'Assédio no trabalho',
    'Reconhecimento de vínculo',
    'Acidente ou doença relacionada ao trabalho',
    'Outra questão trabalhista',
  ],
  'Família, Divórcio e Pensão': [
    'Divórcio',
    'Pensão alimentícia',
    'Guarda ou convivência',
    'União estável',
    'Partilha de bens',
    'Outra questão familiar',
  ],
  'Inventário e Herança': [
    'Iniciar inventário',
    'Inventário em andamento',
    'Inventário extrajudicial',
    'Partilha de bens ou conflito entre herdeiros',
    'Dúvidas sobre documentos ou tributos',
    'Outra questão sucessória',
  ],
  'Processos Judiciais': [
    'Consultar ou entender um processo',
    'Recebi citação ou intimação',
    'Preciso apresentar defesa',
    'Cumprimento ou execução de decisão',
    'Dúvida sobre prazo ou andamento',
    'Outra questão processual',
  ],
};

// ---------------------------------------------------------------------------
// ROTEIRO DE ATENDIMENTO — menus fixos de cada etapa (WhatsApp)
// ---------------------------------------------------------------------------

// Etapa 1 — triagem de perfil do contato.
const CLIENT_STATUS_OPTIONS = [
  'Sim, já sou cliente',
  'Não, ainda não sou cliente',
  'Só preciso de uma informação rápida',
];

// Fluxo A (cliente) — etapa 2.
const CLIENT_MENU_OPTIONS = [
  'Falar sobre um processo/caso em andamento',
  'Assuntos financeiros (boletos, pagamentos, honorários)',
  'Falar diretamente com meu advogado(a) responsável',
  'Agendar uma reunião',
  'Outro assunto',
];

// Fluxo A — 2.1 área do caso em andamento.
const CLIENT_CASE_AREAS = [
  'Cível',
  'Trabalhista',
  'Família',
  'Criminal',
  'Tributário',
  'Outra',
];

// Fluxo A — 2.2 financeiro.
const FINANCIAL_OPTIONS = [
  '2ª via de boleto',
  'Dúvida sobre cobrança',
  'Negociação de valores',
  'Outro',
];

// Fluxo A/B — formato de reunião ou consulta.
const MEETING_FORMAT_OPTIONS = [
  'Presencial',
  'Videochamada',
  'Ligação telefônica',
];

// Fluxo B (não cliente) — etapa 3.
const PROSPECT_AREAS = [
  'Cível (contratos, indenizações, dívidas)',
  'Trabalhista',
  'Família (divórcio, pensão, guarda)',
  'Criminal',
  'Tributário/Empresarial',
  'Não sei / preciso de orientação',
];

// Fluxo B — após o relato do caso.
const PROSPECT_NEXT_STEP_OPTIONS = [
  'Sim, quero agendar',
  'Antes, quero saber sobre valores/honorários',
  'Só quero mais informações por enquanto',
];

// Fluxo C — informação rápida (FAQ institucional).
const QUICK_INFO_OPTIONS = [
  'Endereço/horário de funcionamento',
  'Áreas de atuação do escritório',
  'Formas de contato/pagamento',
  'Outra dúvida',
];

// Campos obrigatórios no handoff para o time humano.
const HANDOFF_REQUIRED_FIELDS = [
  'Nome completo',
  'Cliente ou não-cliente',
  'Área do direito',
  'Resumo da demanda',
  'Telefone/WhatsApp (capturado automaticamente)',
  'Preferência de contato (financeiro/advogado/agenda)',
  'Urgência (sim/não)',
  'Nº do processo (quando o contato for cliente e o caso já tiver processo)',
];

// Gatilhos de escalonamento imediato: pulam a triagem e vão direto ao humano.
// Sem \b no fim: em JS a fronteira de palavra nao reconhece letras acentuadas
// como "amanhã" ou "prisão", o que anularia metade dos gatilhos.
const URGENCY_TERMS = /(?:^|[^\wÀ-ÿ])(urgente|urg[eê]ncia|emerg[eê]ncia|pris[aã]o|preso|prend(?:eram|eu|ido)|flagrante|delegacia|audi[eê]ncia\s+(?:hoje|amanh[aã]|agora|de\s+manh[aã])|prazo\s+(?:(?:est[aá]|t[aá])\s+)?(?:vencendo|vencido|vence\s+hoje|vence\s+amanh[aã]|final|fatal|acabando|estourando|terminando)|[uú]ltimo\s+dia\s+do\s+prazo|liminar\s+urgente|mandado\s+de\s+pris[aã]o)/i;

// Frases usadas pela IA quando não compreende a resposta do contato.
const CLARIFICATION_PATTERN = /\b(n[aã]o (?:consegui )?entend[ie]|n[aã]o compreendi|pode(?:ria)? (?:repetir|reformular)|n[aã]o ficou claro|poderia explicar melhor)\b/i;

// Analise de imagens recebidas no WhatsApp. O texto gerado aqui vira a
// "Análise visual automática" que o atendente le no CRM e que a IA recebe como
// contexto do turno, entao ele descreve o que esta visivel e nunca interpreta
// juridicamente o documento.
const LEGAL_IMAGE_ANALYSIS_PROMPT = [
  'Você analisa imagens enviadas por clientes ao WhatsApp de um escritório de advocacia.',
  'Diga primeiro o que é o documento ou a foto (por exemplo: contrato, boleto, notificação extrajudicial, citação ou intimação, petição, decisão judicial, comprovante de pagamento, extrato bancário, holerite, carteira de trabalho, documento pessoal, laudo ou receituário médico, print de conversa, foto de veículo, foto de local ou de dano).',
  'Depois destaque apenas os dados visíveis que ajudam a triagem: nomes das partes, empresa ou banco envolvido, número de processo, contrato ou boleto, valores, datas e prazos.',
  'Nunca interprete juridicamente, não avalie chances de êxito, não indique providências e não invente dado que não esteja legível.',
  'Se a imagem estiver ilegível, cortada ou não tiver relação com um caso jurídico, diga isso em uma frase.',
  'Não transcreva senhas, códigos de segurança nem números completos de cartão.',
  'Responda em português, de forma objetiva, em até 4 frases.',
].join(' ');

// Ficha do contato (memoria de longo prazo). O que interessa a um escritorio e
// o que alimenta o handoff do roteiro, nao dado de equipamento.
const LEGAL_CLIENT_NOTES_INSTRUCTION = [
  'A ficha consolidada do contato para o escritório de advocacia.',
  'Capture somente: se é cliente ou ainda não é cliente, área do direito, resumo objetivo da demanda,',
  'número do processo, parte contrária (banco, empresa ou pessoa), prazos e datas citados,',
  'preferência de contato (financeiro, advogado responsável ou agenda) e se o caso é urgente.',
  'Registre CPF, CNPJ ou endereço apenas se o contato os informar espontaneamente.',
  'Não registre opinião jurídica, avaliação de chances nem dado irrelevante para a triagem.',
  'Atualize a ficha atual com as informações novas da conversa.',
].join(' ');

// Termos que indicam que a mensagem traz dado digno de entrar na ficha.
const LEGAL_MEMORY_TERMS = /nome|cpf|cnpj|\brg\b|\boab\b|processo|protocolo|contrato|boleto|banco|financiamento|presta[cç][aã]o|audi[eê]ncia|prazo|intima[cç][aã]o|cita[cç][aã]o|advogad|endere[cç]o|e-?mail|whatsapp|urgente|reuni[aã]o|agendar|honor[aá]rio/i;

// Numero de processo no padrao CNJ tem 20 digitos; aceitamos 15+ para tolerar
// o contato que digita so um trecho ou omite separadores.
function looksLikeCaseNumber(message = '') {
  const digits = String(message).replace(/\D/g, '');
  return digits.length >= 15;
}

function isLegalMemoryRelevant(message = '') {
  const normalized = String(message || '').trim();
  if (!normalized) return false;
  return LEGAL_MEMORY_TERMS.test(normalized) || looksLikeCaseNumber(normalized);
}

const ENCERRAMENTO_PADRAO ='Muito obrigado pelo contato! Se precisar de mais alguma coisa, é só chamar por aqui. PBL Advocacia e Consultoria Jurídica.';

function isGreetingOnly(message = '') {
  return GREETING_ONLY.test(String(message).trim());
}

function isVagueMessage(message = '') {
  const normalized = String(message).trim();
  if (!normalized) return false;
  if (VAGUE_MESSAGE.test(normalized)) return true;
  if (LEGAL_SUBJECT_TERMS.test(normalized)) return false;

  // Saudações acompanhadas apenas de cortesia ou pedido genérico continuam vagas.
  // Se houver um tema jurídico reconhecível, a verificação acima preserva o fluxo específico.
  return /^(?:oi+|ola+|olá+|bom dia|boa tarde|boa noite|tudo bem|opa|e ai|e aí)(?=[\s,!.?]|$)/i.test(normalized);
}

function isHumanHandoffRequest(message = '', configuredKeyword = '') {
  const normalized = String(message).trim();
  if (HUMAN_HANDOFF.test(normalized)) return true;
  if (/\b(?:quero|gostaria|preciso)\s+(?:de\s+)?(?:falar|conversar)\s+com\s+(?:um\s+|uma\s+)?(?:atendente|advogad[oa]|pessoa|humano)\b/i.test(normalized)) return true;
  if (/\b(?:me\s+)?(?:chame|passe|transfira|encaminhe)\s+(?:para|pra|pro|a)\s+(?:um\s+|uma\s+)?(?:atendente|advogad[oa]|pessoa|equipe)\b/i.test(normalized)) return true;
  const keyword = String(configuredKeyword || '').trim().toLowerCase();
  return Boolean(keyword && normalized.toLowerCase() === keyword);
}

function isReliableCrmName(name = '') {
  const normalized = String(name).trim();
  if (!normalized || normalized === '.' || normalized.length < 3) return false;
  if (/^grupo\b/i.test(normalized) || /\d{5,}/.test(normalized) || normalized.includes('+')) return false;
  return looksLikePersonName(normalized);
}

function looksLikePersonName(message = '') {
  const normalized = String(message).trim().replace(/[.,!?]+$/g, '');
  if (!normalized || normalized.length > 80 || LEGAL_SUBJECT_TERMS.test(normalized) || NON_NAME_TERMS.test(normalized)) return false;

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 6) return false;
  return words.every((word) => /^[A-Za-zÀ-ÖØ-öø-ÿ'’-]{2,}$/.test(word));
}

function hasConfirmedName(history = [], currentUserTurn = '', crmName = '') {
  if (isReliableCrmName(crmName)) return true;
  const explicitName = history.some((message) => {
    if (message.fromMe || message.fromBot) return false;
    return /\b(?:meu nome (?:é|e)|me chamo|pode me chamar de)\s+[A-Za-zÀ-ÖØ-öø-ÿ]/i.test(message.body || '');
  });
  if (explicitName) return true;

  const asksName = (message) => /\b(?:qual|informe|poderia informar|me diga).{0,35}\bnome\b|\bnome completo\b/i.test(message?.body || '');
  for (let index = 0; index < history.length - 1; index += 1) {
    const assistantMessage = history[index];
    const nextMessage = history[index + 1];
    if ((assistantMessage.fromMe || assistantMessage.fromBot)
      && asksName(assistantMessage)
      && !nextMessage.fromMe
      && !nextMessage.fromBot
      && looksLikePersonName(nextMessage.body)) {
      return true;
    }
  }

  const lastAssistantMessage = [...history].reverse().find((message) => message.fromMe || message.fromBot);
  return asksName(lastAssistantMessage) && looksLikePersonName(currentUserTurn);
}

function shouldAskNameForSubject(history = [], currentUserTurn = '', crmName = '') {
  const subjectProvided = !isVagueMessage(currentUserTurn) && !looksLikePersonName(currentUserTurn);
  return subjectProvided && !hasConfirmedName(history, currentUserTurn, crmName);
}

function describeLegalSubject(message = '') {
  const normalized = String(message).trim().toLowerCase();
  if (/imposto.{0,30}renda|isen[cç][aã]o.{0,30}(autismo|tea)/i.test(normalized)) {
    return 'isenção de imposto de renda relacionada ao autismo';
  }
  if (/busca.{0,15}apreens/i.test(normalized)) return 'busca e apreensão de veículo';
  if (/revisional|juros|financi|banco|contrato banc/i.test(normalized)) return 'revisão de contrato bancário';
  if (/cobran|d[ií]vida/i.test(normalized)) return 'cobranças e dívidas';

  const compact = normalized.replace(/\s+/g, ' ').replace(/[?!.]+$/g, '').slice(0, 140);
  return compact || 'a situação informada';
}

function buildInitialSubjectReply(message = '') {
  const subject = describeLegalSubject(message);
  return `Entendi que você busca orientação sobre ${subject}. O escritório pode realizar uma análise inicial do caso. Qual é o seu nome?`;
}

function formatOptionMarker(index) {
  const number = Number(index) + 1;
  if (number <= 9) return `${number}\uFE0F\u20E3`;
  if (number === 10) return '\u{1F51F}';
  return String(number).split('').map((digit) => `${digit}\uFE0F\u20E3`).join('');
}

function buildOptionList(options = []) {
  return options.map((option, index) => `${formatOptionMarker(index)} ${option}`).join('\n');
}

function buildWelcomeServicesReply() {
  const services = buildOptionList(LEGAL_SERVICES);
  return `Olá! Seja bem-vindo(a) à PBL Advocacia e Consultoria Jurídica.\n\nÁreas de atendimento:\n${services}\n\nQual é o seu nome?`;
}

// Etapa 1 do roteiro: saudação e identificação do perfil do contato.
function buildInitialGreetingReply() {
  return `Olá! Seja bem-vindo(a) à PBL Advocacia e Consultoria Jurídica. Sou a assistente virtual do escritório e vou ajudar a direcionar o seu atendimento.\n\nPara começar, você já é nosso(a) cliente?\n${buildOptionList(CLIENT_STATUS_OPTIONS)}`;
}

// Gatilho transversal: urgência real pula a triagem e vai direto ao humano.
function isUrgentMessage(message = '') {
  return URGENCY_TERMS.test(String(message || ''));
}

// Fallback do roteiro: duas incompreensões seguidas encerram a triagem automática.
function countTrailingClarifications(history = []) {
  let count = 0;
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const message = history[index];
    if (!message.fromMe && !message.fromBot) continue;
    if (!CLARIFICATION_PATTERN.test(message.body || '')) break;
    count += 1;
  }
  return count;
}

function hasReachedFallbackLimit(history = [], limit = 2) {
  return countTrailingClarifications(history) >= limit;
}

function hasSubjectInConversation(history = [], currentUserTurn = '') {
  const messages = [
    ...history.filter((message) => !message.fromMe && !message.fromBot).map((message) => message.body || ''),
    currentUserTurn,
  ];
  return messages.some((message) => !isVagueMessage(message) && !looksLikePersonName(message));
}

function formatSpecificOptionsForPrompt() {
  return Object.entries(LEGAL_SPECIFIC_OPTIONS)
    .map(([area, options]) => `${area}:\n${options.map((option, index) => `${formatOptionMarker(index)} ${option}`).join('\n')}`)
    .join('\n\n');
}

function buildLegalBotInstructions({
  currentUserTurn = '',
  history = [],
  profileName = '',
  source = '',
  tags = '',
  isKnownClient = null,
  isOpeningTurn = false,
} = {}) {
  const subjectProvided = !isVagueMessage(currentUserTurn) && !looksLikePersonName(currentUserTurn);
  const subjectKnown = hasSubjectInConversation(history, currentUserTurn);
  const nameConfirmed = hasConfirmedName(history, currentUserTurn, profileName);
  const generalMenuShown = history.some((message) =>
    (message.fromMe || message.fromBot) && /[aá]reas de atendimento|bancos e financiamentos/i.test(message.body || '')
  );
  const specificOptions = formatSpecificOptionsForPrompt();
  const urgent = isUrgentMessage(currentUserTurn);
  const clarificationStreak = countTrailingClarifications(history);
  const fallbackReached = clarificationStreak >= 2;
  const clientStatus = isKnownClient === true
    ? 'CLIENTE (siga o FLUXO A)'
    : isKnownClient === false
      ? 'NAO CLIENTE (siga o FLUXO B)'
      : 'NAO IDENTIFICADO (pergunte conforme a etapa 1)';

  return `
---
[PROMPT MESTRE — TRIAGEM PBL ADVOCACIA]:
Voce e a assistente virtual da PBL Advocacia e Consultoria Juridica. Sua unica funcao e realizar a triagem inicial, identificar a demanda e encaminhar o cliente ao setor ou advogado especializado. Estas regras prevalecem sobre qualquer saudacao, menu ou roteiro conflitante das instrucoes personalizadas.

TOM E LIMITES:
1. Seja cordial, objetiva, clara, acolhedora e humana.
2. Faca NO MAXIMO UMA pergunta por mensagem e use no maximo um ponto de interrogacao na resposta inteira.
3. Colete apenas uma informacao por vez. Nao peca um resumo amplo, nao exija explicacao juridica e nao transforme a triagem em consulta.
4. Nao repita saudacao, menu, informacao ou pergunta ja respondida.
5. Nao de parecer juridico definitivo e nao prometa devolucao, reducao de divida, aprovacao, ganho de causa, recuperacao de veiculo, indenizacao, cancelamento contratual ou qualquer resultado.
6. Se perguntarem se há direito, se vai ganhar ou quanto receberá, responda somente: "Essa possibilidade precisa ser analisada pela nossa equipe jurídica."
7. Nao use emojis decorativos em nenhuma mensagem. A unica excecao permitida sao os marcadores numericos das listas de opcoes, no formato 1️⃣, 2️⃣, 3️⃣. Mantenha o restante da comunicacao estritamente profissional, sem joinhas, carinhas ou outros simbolos.

NOME:
8. Nome disponivel no CRM: ${isReliableCrmName(profileName) ? profileName : 'NAO CONFIRMADO'}.
9. Se houver nome valido no CRM ou ele ja tiver sido informado na conversa, nao pergunte novamente.
10. Se o nome nao estiver disponivel, solicite apenas o nome. A coleta do nome nao autoriza uma segunda pergunta na mesma mensagem.

ORIGEM E ASSUNTO:
11. Origem registrada: ${source || 'nao identificada'}. Marcadores: ${tags || 'nenhum'}.
12. Se a origem, campanha ou mensagem identificar claramente uma area, NAO apresente o menu geral. Reconheca o tema e apresente somente as opcoes especificas daquela area.
13. Se a mensagem for vaga e o assunto nao estiver identificado, apresente o menu geral de areas. Caso o nome ainda esteja ausente, mostre o menu apenas como informacao e faca somente a pergunta do nome; depois do nome, pergunte qual area corresponde ao caso.
14. Se o cliente ja informou o assunto em texto livre, nao pergunte novamente qual e o assunto e nao volte ao menu geral.

FLUXO OBRIGATORIO:
15. Identifique origem/assunto -> use menu especifico ou geral -> obtenha/confirme o nome -> registre a escolha especifica -> faca NO MAXIMO UMA pergunta complementar objetiva -> encaminhe.
16. Depois que o cliente responder a pergunta complementar, nao faca novas perguntas. Responda EXATAMENTE: "Perfeito! Vou encaminhar você ao setor especializado." e acrescente [[HANDOFF]] e uma rota interna.
17. Se o cliente pedir atendimento humano com "atendente", "advogado", "quero falar com alguem" ou equivalente, interrompa a triagem e responda EXATAMENTE: "Claro! Vou encaminhar você para nossa equipe." Acrescente [[HANDOFF]] e [[ROUTE: ATENDIMENTO]].
18. Nunca encerre com "ate mais", "ate breve", "tchau" ou despedida semelhante, pois o cliente aguardara o especialista.
19. Use texto simples de WhatsApp. Quando apresentar opcoes, use os marcadores numericos 1️⃣, 2️⃣, 3️⃣ e assim por diante, um por linha. Fora das opcoes, evite listas e nunca use marcacao com dois asteriscos.

ROTAS INTERNAS INVISIVEIS:
- Use [[ROUTE: FINANCEIRO]] para bancos, financiamentos, juros, revisional, cobrancas, dividas, boletos, honorarios e pagamentos.
- Use [[ROUTE: ATENDIMENTO]] para os demais assuntos, incluindo agendamentos, duvidas institucionais e falar com o advogado responsavel.
- As tags [[ROUTE: ...]] e [[HANDOFF]] nunca devem aparecer no texto visivel ao cliente.

ROTEIRO DE ATENDIMENTO — ETAPA 1 (SAUDACAO E PERFIL):
20. Na primeira mensagem de uma conversa nova, apresente-se e pergunte SOMENTE se o contato ja e cliente, com estas opcoes:
${buildOptionList(CLIENT_STATUS_OPTIONS)}
21. A resposta define o fluxo: 1 = FLUXO A (cliente), 2 = FLUXO B (nao cliente), 3 = FLUXO C (informacao rapida). Nunca pergunte isso duas vezes.
22. A etapa 1 e OBRIGATORIA na abertura, mesmo que o contato ja tenha dito o assunto na primeira mensagem. Nesse caso, reconheca o assunto em UMA frase afirmativa e em seguida faca a pergunta de perfil com as tres opcoes. A unica excecao e a urgencia da regra 41, que pula a etapa 1.

FLUXO A — JA E CLIENTE:
23. Peca o nome completo OU o numero do processo/caso para identificacao. Uma coisa por mensagem.
24. Depois de identificado, ofereca:
${buildOptionList(CLIENT_MENU_OPTIONS)}
25. A.1 Processo em andamento: pergunte a area do caso entre ${CLIENT_CASE_AREAS.join(', ')}; depois colete o numero do processo (se houver) e o resumo da duvida em texto livre; encaminhe ao time juridico com [[HANDOFF]] e [[ROUTE: ATENDIMENTO]].
26. A.2 Financeiro: pergunte do que se trata entre as opcoes:
${buildOptionList(FINANCIAL_OPTIONS)}
   Colete nome e CPF/CNPJ quando necessario e encaminhe com [[HANDOFF]] e [[ROUTE: FINANCEIRO]].
27. A.3 Falar com o advogado responsavel: informe que vai verificar a disponibilidade, peca um resumo breve do assunto e encaminhe com [[HANDOFF]] e [[ROUTE: ATENDIMENTO]]. Nao afirme que o advogado esta disponivel nem prometa horario de retorno.
28. A.4 Agendar reuniao: pergunte o formato entre ${MEETING_FORMAT_OPTIONS.join(', ')} e depois a disponibilidade de dia e horario; encaminhe a secretaria com [[HANDOFF]] e [[ROUTE: ATENDIMENTO]]. Nunca confirme um horario por conta propria.
29. A.5 Outro assunto: peca o detalhamento em texto livre e encaminhe a triagem humana com o resumo.

FLUXO B — AINDA NAO E CLIENTE:
30. Pergunte a area relacionada a necessidade:
${buildOptionList(PROSPECT_AREAS)}
31. Depois da escolha, peca uma descricao breve da situacao em texto livre. Nao avalie o caso nem antecipe chances de exito.
32. Com o relato em maos, ofereca o proximo passo:
${buildOptionList(PROSPECT_NEXT_STEP_OPTIONS)}
33. B.1 Agendar consulta: colete nome completo, melhor dia e horario e a preferencia entre ${MEETING_FORMAT_OPTIONS.join(', ')}; encaminhe a secretaria com [[HANDOFF]].
34. B.2 Valores/honorarios: responda EXATAMENTE "Nossos valores variam conforme a complexidade do caso. Um de nossos advogados pode passar uma estimativa depois de entender melhor a situacao." e ofereca a conversa inicial sem compromisso. Nunca cite valores, tabelas ou percentuais.
35. B.3 Mais informacoes: registre o interesse, informe que o escritorio pode enviar material sobre a area e oferecer um contato posterior, e encaminhe com [[HANDOFF]].

FLUXO C — INFORMACAO RAPIDA:
36. Pergunte sobre o que o contato quer saber:
${buildOptionList(QUICK_INFO_OPTIONS)}
37. Responda apenas com informacao institucional ja cadastrada na base de conhecimento. Se a informacao nao estiver na base, nao invente: encaminhe com [[HANDOFF]] e [[ROUTE: ATENDIMENTO]].
38. Ao final da resposta institucional, ofereca ajuda adicional ou a conexao com um advogado, em uma unica pergunta.
39. Somente no FLUXO C, quando o contato disser que nao precisa de mais nada, e permitido encerrar com: "${ENCERRAMENTO_PADRAO}" Nos fluxos A e B a regra 18 continua valendo e nao ha despedida.

REGRAS TRANSVERSAIS DE CONDUCAO:
40. Antes de avancar de etapa, confirme o entendimento em uma frase afirmativa, no formato "Entendi que voce precisa de X." Isso nao consome a pergunta do turno.
41. ESCALONAMENTO IMEDIATO: se a mensagem indicar urgencia, prisao, flagrante, audiencia hoje ou amanha, prazo vencendo ou mandado, pule TODAS as etapas de triagem e responda EXATAMENTE: "Entendi que o seu caso e urgente. Vou encaminhar voce agora para o nosso atendimento prioritario." Acrescente [[HANDOFF]] e [[ROUTE: ATENDIMENTO]].
42. FALLBACK: se voce nao entender a resposta do contato duas vezes seguidas, pare de tentar e encaminhe para o humano com [[HANDOFF]].
43. A opcao de falar com um atendente humano permanece valida em qualquer etapa, mesmo que nao esteja escrita no menu daquele momento.
44. Nunca dê orientacao juridica, parecer, prazo legal, estrategia processual ou interpretacao de lei. Sua funcao e triagem, coleta de dados e encaminhamento.

DADOS OBRIGATORIOS PARA O HANDOFF:
${HANDOFF_REQUIRED_FIELDS.map((field) => `- ${field}`).join('\n')}
45. Colete esses campos ao longo da conversa, um por mensagem, na ordem natural do fluxo. Nao repita a coleta de um campo ja preenchido pelo CRM ou pela conversa. Nunca segure o encaminhamento de um caso urgente para completar campos.

OPCOES ESPECIFICAS POR AREA:
${specificOptions}

ESTADO DESTE TURNO:
- Assunto informado agora: ${subjectProvided ? `SIM — ${currentUserTurn}` : 'NAO'}
- Assunto ja conhecido na conversa: ${subjectKnown ? 'SIM' : 'NAO'}
- Nome disponivel/confirmado: ${nameConfirmed ? 'SIM' : 'NAO'}
- Menu geral ja apresentado: ${generalMenuShown ? 'SIM' : 'NAO'}
- Perfil do contato: ${clientStatus}
- Turno de abertura da conversa: ${isOpeningTurn ? 'SIM' : 'NAO'}
- Urgencia detectada nesta mensagem: ${urgent ? 'SIM' : 'NAO'}
- Incompreensoes seguidas ate agora: ${clarificationStreak}

CONDUTA PARA ESTE TURNO:
${urgent
    ? '- Caso urgente. Ignore o restante da triagem e aplique a regra 41 de escalonamento imediato.'
    : fallbackReached
      ? '- Voce ja nao entendeu duas vezes seguidas. Aplique a regra 42 e encaminhe para o atendimento humano.'
      : isOpeningTurn
        ? `- Turno de abertura. Aplique a regra 20: apresente-se e pergunte SOMENTE se o contato ja e cliente, exatamente com estas opcoes:\n${buildOptionList(CLIENT_STATUS_OPTIONS)}\n- Nao mostre o menu de areas e nao peca o nome ainda.${subjectProvided ? '\n- O contato ja adiantou o assunto: reconheca em UMA frase antes da pergunta de perfil, e nao pergunte nada sobre o tema ainda.' : ''}`
        : subjectProvided && !nameConfirmed
    ? '- Reconheca o assunto informado e faca somente a pergunta do nome. Nao mostre o menu geral.'
    : nameConfirmed && subjectKnown
      ? '- Continue exatamente do ponto atual da triagem. Mostre somente as opcoes da area quando ainda faltarem; se a situacao especifica ja foi escolhida, faca uma unica pergunta complementar; se ela ja foi respondida, encaminhe.'
      : nameConfirmed
        ? generalMenuShown
          ? '- O nome esta confirmado e o menu geral ja foi mostrado. Nao repita o menu; faca somente a pergunta para o cliente escolher uma das areas apresentadas.'
          : '- O nome esta confirmado, mas o assunto nao. Apresente o menu geral e faca somente a pergunta para escolher a area.'
        : '- Apresente o menu geral apenas como informacao e faca somente a pergunta do nome.'}
`;
}

function replaceFarewellWithSpecialistHandoff(reply = '') {
  const farewellPattern = /\b(até mais|ate mais|até breve|ate breve|tchau|nos falamos em breve)\b[.!]?/gi;
  const original = String(reply);
  if (!farewellPattern.test(original)) return original;

  const withoutFarewell = original.replace(farewellPattern, '').replace(/\s{2,}/g, ' ').trim();
  if (/encaminhad.{0,40}especialista|aguarde.{0,40}(retorno|equipe)/i.test(withoutFarewell)) {
    return withoutFarewell;
  }
  return `${withoutFarewell}${withoutFarewell ? ' ' : ''}Suas informações serão encaminhadas ao especialista responsável. Por favor, aguarde o retorno da equipe.`;
}

function limitReplyToOneQuestion(reply = '') {
  let questionSeen = false;
  const filtered = String(reply)
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => {
      if (!sentence.includes('?')) return true;
      if (questionSeen) return false;
      questionSeen = true;
      return true;
    })
    .join(' ');

  let emittedQuestion = false;
  return filtered.replace(/\?/g, () => {
    if (emittedQuestion) return '.';
    emittedQuestion = true;
    return '?';
  });
}

function sanitizeBotReply(reply = '') {
  const numericMarkers = [];
  const protectedReply = String(reply).replace(/(?:[0-9]\uFE0F?\u20E3|\u{1F51F})/gu, (marker) => {
    const token = `\uE000${numericMarkers.length}\uE001`;
    numericMarkers.push(marker);
    return token;
  });

  const cleanedReply = protectedReply
    // Marcadores de controle pertencem somente ao backend e nunca ao cliente.
    // Aceita espacos extras para cobrir pequenas variacoes produzidas pelo modelo.
    .replace(/\[\s*\[\s*ROUTE\s*:[^\]]*\]\s*\]/gi, '')
    .replace(/\[\s*\[\s*HANDOFF\s*\]\s*\]/gi, '')
    // Remove pictogramas, modificadores de tom de pele e sequencias de emoji.
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0F\u200D]/gu, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  return cleanedReply.replace(/\uE000(\d+)\uE001/g, (_token, index) => numericMarkers[Number(index)] || '');
}

module.exports = {
  CLIENT_CASE_AREAS,
  CLIENT_MENU_OPTIONS,
  CLIENT_STATUS_OPTIONS,
  ENCERRAMENTO_PADRAO,
  FINANCIAL_OPTIONS,
  HANDOFF_REQUIRED_FIELDS,
  LEGAL_CLIENT_NOTES_INSTRUCTION,
  LEGAL_IMAGE_ANALYSIS_PROMPT,
  LEGAL_SERVICES,
  LEGAL_SPECIFIC_OPTIONS,
  MEETING_FORMAT_OPTIONS,
  PROSPECT_AREAS,
  PROSPECT_NEXT_STEP_OPTIONS,
  QUICK_INFO_OPTIONS,
  buildInitialGreetingReply,
  buildOptionList,
  countTrailingClarifications,
  hasReachedFallbackLimit,
  isLegalMemoryRelevant,
  isUrgentMessage,
  buildInitialSubjectReply,
  buildLegalBotInstructions,
  buildWelcomeServicesReply,
  describeLegalSubject,
  formatSpecificOptionsForPrompt,
  formatOptionMarker,
  hasConfirmedName,
  hasSubjectInConversation,
  isGreetingOnly,
  isHumanHandoffRequest,
  isReliableCrmName,
  isVagueMessage,
  limitReplyToOneQuestion,
  looksLikePersonName,
  replaceFarewellWithSpecialistHandoff,
  sanitizeBotReply,
  shouldAskNameForSubject,
};
