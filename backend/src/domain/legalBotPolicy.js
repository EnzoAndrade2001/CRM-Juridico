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

function buildWelcomeServicesReply() {
  const services = LEGAL_SERVICES.map((service, index) => {
    const number = index === LEGAL_SERVICES.length - 1 ? 0 : index + 1;
    return `${number}. ${service}`;
  }).join('\n');
  return `Olá! Seja bem-vindo(a) à PBL Advocacia e Consultoria Jurídica.\n\nÁreas de atendimento:\n${services}\n\nQual é o seu nome?`;
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
    .map(([area, options]) => `${area}:\n${options.map((option, index) => `${index + 1}. ${option}`).join('\n')}`)
    .join('\n\n');
}

function buildLegalBotInstructions({ currentUserTurn = '', history = [], profileName = '', source = '', tags = '' } = {}) {
  const subjectProvided = !isVagueMessage(currentUserTurn) && !looksLikePersonName(currentUserTurn);
  const subjectKnown = hasSubjectInConversation(history, currentUserTurn);
  const nameConfirmed = hasConfirmedName(history, currentUserTurn, profileName);
  const generalMenuShown = history.some((message) =>
    (message.fromMe || message.fromBot) && /[aá]reas de atendimento|bancos e financiamentos/i.test(message.body || '')
  );
  const specificOptions = formatSpecificOptionsForPrompt();

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
7. Nao use emojis em nenhuma mensagem. Mantenha uma comunicacao estritamente profissional.

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
19. Use texto simples de WhatsApp. Menus podem ser numerados; fora deles, evite listas e nunca use marcacao com dois asteriscos.

ROTAS INTERNAS INVISIVEIS:
- Use [[ROUTE: FINANCEIRO]] para bancos, financiamentos, juros, revisional, cobrancas e dividas.
- Use [[ROUTE: ATENDIMENTO]] para os demais assuntos.
- As tags [[ROUTE: ...]] e [[HANDOFF]] nunca devem aparecer no texto visivel ao cliente.

OPCOES ESPECIFICAS POR AREA:
${specificOptions}

ESTADO DESTE TURNO:
- Assunto informado agora: ${subjectProvided ? `SIM — ${currentUserTurn}` : 'NAO'}
- Assunto ja conhecido na conversa: ${subjectKnown ? 'SIM' : 'NAO'}
- Nome disponivel/confirmado: ${nameConfirmed ? 'SIM' : 'NAO'}
- Menu geral ja apresentado: ${generalMenuShown ? 'SIM' : 'NAO'}

CONDUTA PARA ESTE TURNO:
${subjectProvided && !nameConfirmed
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
  return String(reply)
    // Marcadores de controle pertencem somente ao backend e nunca ao cliente.
    // Aceita espacos extras para cobrir pequenas variacoes produzidas pelo modelo.
    .replace(/\[\s*\[\s*ROUTE\s*:[^\]]*\]\s*\]/gi, '')
    .replace(/\[\s*\[\s*HANDOFF\s*\]\s*\]/gi, '')
    // Remove pictogramas, modificadores de tom de pele e sequencias de emoji.
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0F\u200D]/gu, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

module.exports = {
  LEGAL_SERVICES,
  LEGAL_SPECIFIC_OPTIONS,
  buildInitialSubjectReply,
  buildLegalBotInstructions,
  buildWelcomeServicesReply,
  describeLegalSubject,
  formatSpecificOptionsForPrompt,
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
