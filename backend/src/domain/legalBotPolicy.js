const GREETING_ONLY = /^(oi+|ola+|olá+|bom dia|boa tarde|boa noite|tudo bem|opa|e ai|e aí)[!.?\s]*$/i;
const LEGAL_SUBJECT_TERMS = /banco|financi|juros|contrato|cobran|divida|dívida|apreens|veiculo|veículo|imposto|renda|autismo|tea|beneficio|benefício|aposent|trabalh|processo|jurid|advog/i;
const NON_NAME_TERMS = /\b(preciso|quero|gostaria|ajuda|orienta[cç][aã]o|tenho|meu|minha|sobre|problema|duvida|dúvida|direito)\b/i;

const LEGAL_SERVICES = [
  'Revisão de contratos bancários e juros',
  'Empréstimos e consignados',
  'Financiamentos de veículos e imóveis',
  'Cobranças, dívidas e contratos',
  'Busca e apreensão de veículos',
  'Análise de isenção de imposto de renda relacionada ao autismo',
  'Outras demandas jurídicas, mediante análise da equipe',
];

function isGreetingOnly(message = '') {
  return GREETING_ONLY.test(String(message).trim());
}

function looksLikePersonName(message = '') {
  const normalized = String(message).trim().replace(/[.,!?]+$/g, '');
  if (!normalized || normalized.length > 80 || LEGAL_SUBJECT_TERMS.test(normalized) || NON_NAME_TERMS.test(normalized)) return false;

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 6) return false;
  return words.every((word) => /^[A-Za-zÀ-ÖØ-öø-ÿ'’-]{2,}$/.test(word));
}

function hasConfirmedName(history = [], currentUserTurn = '') {
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

function shouldAskNameForSubject(history = [], currentUserTurn = '') {
  const subjectProvided = !isGreetingOnly(currentUserTurn) && !looksLikePersonName(currentUserTurn);
  return subjectProvided && !hasConfirmedName(history, currentUserTurn);
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
  return `Entendi que você busca orientação sobre ${subject}. O escritório pode realizar uma análise inicial do caso. Para iniciarmos, qual é o seu nome completo?`;
}

function buildWelcomeServicesReply() {
  const services = LEGAL_SERVICES.map((service) => `• ${service}`).join('\n');
  return `Olá! Seja bem-vindo(a) ao escritório Pedro Bastos Lund Advocacia e Consultoria Jurídica.\n\nAtuamos com:\n${services}\n\nPara iniciarmos, qual é o seu nome completo?`;
}

function hasSubjectInConversation(history = [], currentUserTurn = '') {
  const messages = [
    ...history.filter((message) => !message.fromMe && !message.fromBot).map((message) => message.body || ''),
    currentUserTurn,
  ];
  return messages.some((message) => !isGreetingOnly(message) && !looksLikePersonName(message));
}

function buildLegalBotInstructions({ currentUserTurn = '', history = [], profileName = '' } = {}) {
  const subjectProvided = !isGreetingOnly(currentUserTurn) && !looksLikePersonName(currentUserTurn);
  const subjectKnown = hasSubjectInConversation(history, currentUserTurn);
  const nameConfirmed = hasConfirmedName(history, currentUserTurn);

  return `
---
[POLITICA OBRIGATORIA DO ATENDIMENTO JURIDICO]:
Estas regras prevalecem sobre qualquer menu, saudacao ou roteiro conflitante existente nas instrucoes personalizadas.
1. Atue como assistente virtual do escritorio Pedro Bastos Lund Advocacia e Consultoria Juridica.
2. Responda de modo humano, acolhedor, objetivo e profissional, sem prometer resultado ou afirmar que o cliente tem direito antes da analise do advogado.
3. Faca NO MAXIMO UMA pergunta por mensagem. A resposta inteira deve conter no maximo um ponto de interrogacao.
4. Colete uma informacao por vez. Primeiro confirme o nome completo; somente na mensagem seguinte solicite o proximo dado relevante.
5. O nome de perfil do WhatsApp (${profileName || 'nao informado'}) nao e confirmacao do nome civil. Considere o nome confirmado apenas quando o cliente o informar na conversa.
6. Se o cliente ja informou o assunto, reconheca especificamente esse tema e comece a triagem. NUNCA pergunte novamente "qual e o assunto", NUNCA mostre menu numerado e NUNCA ofereca uma lista de areas nesse caso.
7. Se o cliente enviou apenas uma saudacao no inicio da conversa, apresente a lista oficial de servicos e pergunte somente o nome completo.
8. Se o nome ja foi confirmado, mas o assunto ainda nao foi informado, pergunte qual dos servicos apresentados corresponde ao que o cliente precisa.
9. Nao repita saudacao, apresentacao ou pergunta ja respondida no historico.
10. Use texto simples de WhatsApp, sem titulos, sem listas extensas e sem marcacao com dois asteriscos. A lista de servicos e permitida apenas na apresentacao inicial.
11. NUNCA encerre com "ate mais", "ate breve", "tchau" ou outra despedida. Quando a triagem terminar, informe que os dados serao encaminhados ao especialista responsavel e que o cliente deve aguardar o retorno da equipe.
12. Inclua ao final, de forma invisivel ao cliente, uma unica rota: [[ROUTE: FINANCEIRO]] para revisao bancaria, financiamento, juros, cobrancas ou dividas; [[ROUTE: ATENDIMENTO]] para os demais assuntos.

ESTADO DESTE TURNO:
- Assunto informado agora: ${subjectProvided ? `SIM — ${currentUserTurn}` : 'NAO'}
- Assunto ja conhecido na conversa: ${subjectKnown ? 'SIM' : 'NAO'}
- Nome explicitamente confirmado na conversa: ${nameConfirmed ? 'SIM' : 'NAO'}

CONDUTA PARA ESTE TURNO:
${subjectProvided && !nameConfirmed
    ? '- Reconheca o assunto informado em uma frase breve, diga que o escritorio pode realizar uma analise inicial e faca somente esta pergunta: "Para iniciarmos, qual e o seu nome completo?"'
    : nameConfirmed && subjectKnown
      ? '- Continue a triagem do assunto ja informado e faca somente a proxima pergunta indispensavel ao caso.'
      : nameConfirmed
        ? '- O nome foi confirmado, mas o assunto ainda nao. Faca somente uma pergunta para o cliente indicar qual servico precisa.'
        : '- Apresente os servicos do escritorio e faca somente a pergunta do nome completo.'}
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

module.exports = {
  LEGAL_SERVICES,
  buildInitialSubjectReply,
  buildLegalBotInstructions,
  buildWelcomeServicesReply,
  describeLegalSubject,
  hasConfirmedName,
  hasSubjectInConversation,
  isGreetingOnly,
  limitReplyToOneQuestion,
  looksLikePersonName,
  replaceFarewellWithSpecialistHandoff,
  shouldAskNameForSubject,
};
