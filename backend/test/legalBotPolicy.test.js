const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildInitialSubjectReply,
  buildLegalBotInstructions,
  buildWelcomeServicesReply,
  hasConfirmedName,
  isHumanHandoffRequest,
  isVagueMessage,
  limitReplyToOneQuestion,
  replaceFarewellWithSpecialistHandoff,
  sanitizeBotReply,
  shouldAskNameForSubject,
} = require('../src/domain/legalBotPolicy');

test('assunto juridico informado avanca para a confirmacao do nome sem oferecer menu', () => {
  const prompt = buildLegalBotInstructions({
    currentUserTurn: 'isenção de imposto de renda para autismo',
    history: [],
    profileName: '',
  });

  assert.match(prompt, /Assunto informado agora: SIM/);
  assert.match(prompt, /faca somente a pergunta do nome/i);
  assert.match(prompt, /nao volte ao menu geral/i);
  assert.equal(shouldAskNameForSubject([], 'isenção de imposto de renda para autismo'), true);

  const reply = buildInitialSubjectReply('isenção de imposto de renda para autismo');
  assert.equal(reply, 'Entendi que você busca orientação sobre isenção de imposto de renda relacionada ao autismo. O escritório pode realizar uma análise inicial do caso. Qual é o seu nome?');
  assert.equal((reply.match(/\?/g) || []).length, 1);
});

test('resposta curta de nome e reconhecida depois de a IA perguntar o nome', () => {
  const history = [
    { fromMe: false, fromBot: false, body: 'Preciso revisar meu financiamento.' },
    { fromMe: true, fromBot: true, body: 'Para iniciarmos, qual é o seu nome completo?' },
  ];

  assert.equal(hasConfirmedName(history, 'Eduarda Marranghello'), true);

  const confirmedHistory = [
    ...history,
    { fromMe: false, fromBot: false, body: 'Eduarda Marranghello' },
    { fromMe: true, fromBot: true, body: 'Obrigada, Eduarda. Em qual cidade você reside?' },
  ];
  assert.equal(hasConfirmedName(confirmedHistory, 'Porto Alegre'), true);
});

test('limita a resposta final a somente uma pergunta', () => {
  const reply = 'Entendi o seu caso. Qual é o seu nome? Você mora em qual cidade? Possui documentos?';
  const limited = limitReplyToOneQuestion(reply);

  assert.equal((limited.match(/\?/g) || []).length, 1);
  assert.match(limited, /Qual é o seu nome\?/);
  assert.doesNotMatch(limited, /qual cidade/i);
  assert.doesNotMatch(limited, /Possui documentos/i);
});

test('saudacao inicial apresenta todos os servicos e pergunta somente o nome', () => {
  const reply = buildWelcomeServicesReply();

  assert.match(reply, /Bancos e Financiamentos/);
  assert.match(reply, /Cobranças e Dívidas/);
  assert.match(reply, /Direito do Consumidor/);
  assert.match(reply, /Direito Trabalhista/);
  assert.match(reply, /Família, Divórcio e Pensão/);
  assert.match(reply, /Inventário e Herança/);
  assert.match(reply, /Busca e apreensão de veículos/);
  assert.match(reply, /Isenção de Imposto de Renda/);
  assert.match(reply, /qual é o seu nome\?/i);
  assert.equal((reply.match(/\?/g) || []).length, 1);
});

test('primeira saudacao vaga sempre apresenta os servicos e pergunta o nome', () => {
  const reply = buildWelcomeServicesReply({ crmName: 'Eduarda Marranghello' });

  assert.doesNotMatch(reply, /Olá, Eduarda Marranghello!/);
  assert.match(reply, /1️⃣ Bancos e Financiamentos/);
  assert.match(reply, /1️⃣2️⃣ Falar com um atendente/);
  assert.match(reply, /qual é o seu nome\?/i);
  assert.equal(shouldAskNameForSubject([], 'quero revisar meu financiamento', 'Eduarda Marranghello'), false);
});

test('mensagens vagas e pedidos humanos seguem fluxos diferentes', () => {
  assert.equal(isVagueMessage('Preciso de um advogado'), true);
  assert.equal(isVagueMessage('Boa noite, tudo bem com vocês?'), true);
  assert.equal(isVagueMessage('Olá, gostaria de mais informações'), true);
  assert.equal(isVagueMessage('Bom dia, meu carro foi apreendido'), false);
  assert.equal(isVagueMessage('Boa tarde, fui demitido ontem'), false);
  assert.equal(isVagueMessage('isenção de imposto de renda'), false);
  assert.equal(isHumanHandoffRequest('advogado'), true);
  assert.equal(isHumanHandoffRequest('quero falar com alguém'), true);
  assert.equal(isHumanHandoffRequest('gostaria de falar com uma advogada, por favor'), true);
  assert.equal(isHumanHandoffRequest('preciso de um advogado'), false);
});

test('prompt mestre inclui menus especificos, mensagens oficiais e origem do lead', () => {
  const prompt = buildLegalBotInstructions({
    currentUserTurn: 'quero revisar meu financiamento',
    history: [],
    source: 'landing-revisional',
    tags: '["revisional"]',
  });

  assert.match(prompt, /Parcelas muito altas/);
  assert.match(prompt, /Recebi notificação ou ordem de busca e apreensão/);
  assert.match(prompt, /landing-revisional/);
  assert.match(prompt, /Perfeito! Vou encaminhar você ao setor especializado\./);
  assert.match(prompt, /Nao use emojis decorativos/);
  assert.match(prompt, /1️⃣, 2️⃣, 3️⃣/);
  assert.match(prompt, /Essa possibilidade precisa ser analisada pela nossa equipe jurídica\./);
});

test('despedida e substituida pela espera do especialista', () => {
  const reply = replaceFarewellWithSpecialistHandoff('Obrigado pelas informações. Até mais!');

  assert.doesNotMatch(reply, /até mais/i);
  assert.match(reply, /encaminhadas ao especialista responsável/i);
  assert.match(reply, /aguarde o retorno da equipe/i);
});

test('remove marcadores internos e emojis antes de enviar a resposta', () => {
  const reply = sanitizeBotReply('Perfeito! Vou encaminhar você ao setor especializado. 👍\n\n[[HANDOFF]]\n[[ROUTE: ATENDIMENTO]]');

  assert.equal(reply, 'Perfeito! Vou encaminhar você ao setor especializado.');
  assert.doesNotMatch(reply, /HANDOFF|ROUTE|👍/);
});

test('remove marcadores com espacos e emojis com modificador de pele', () => {
  const reply = sanitizeBotReply('Perfeito! Vou encaminhar você ao setor especializado. 👍🏽 [ [ HANDOFF ] ] [[ ROUTE : ATENDIMENTO ]]');

  assert.equal(reply, 'Perfeito! Vou encaminhar você ao setor especializado.');
  assert.doesNotMatch(reply, /HANDOFF|ROUTE|👍|🏽/);
});

test('preserva somente emojis numericos usados em menus de opcoes', () => {
  const reply = sanitizeBotReply('1️⃣ Parcelas muito altas\n2️⃣ Juros muito altos 👍');

  assert.equal(reply, '1️⃣ Parcelas muito altas\n2️⃣ Juros muito altos');
});

test('saudacao inicial do roteiro pergunta somente o perfil do contato', () => {
  const { buildInitialGreetingReply } = require('../src/domain/legalBotPolicy');
  const reply = buildInitialGreetingReply();

  assert.match(reply, /1️⃣ Sim, já sou cliente/);
  assert.match(reply, /2️⃣ Não, ainda não sou cliente/);
  assert.match(reply, /3️⃣ Só preciso de uma informação rápida/);
  assert.equal((reply.match(/\?/g) || []).length, 1);
});

test('gatilhos de urgencia disparam escalonamento e casos comuns nao', () => {
  const { isUrgentMessage } = require('../src/domain/legalBotPolicy');

  assert.equal(isUrgentMessage('tenho audiência amanhã e preciso de ajuda'), true);
  assert.equal(isUrgentMessage('meu prazo está vencendo'), true);
  assert.equal(isUrgentMessage('meu filho foi preso em flagrante'), true);
  assert.equal(isUrgentMessage('é urgente'), true);
  assert.equal(isUrgentMessage('quero revisar meu financiamento'), false);
  assert.equal(isUrgentMessage('preciso falar sobre pensão'), false);
});

test('duas incompreensoes seguidas atingem o limite de fallback', () => {
  const { hasReachedFallbackLimit } = require('../src/domain/legalBotPolicy');
  const history = [
    { fromMe: false, fromBot: false, body: 'aaa' },
    { fromMe: true, fromBot: true, body: 'Desculpe, não entendi. Pode reformular?' },
    { fromMe: false, fromBot: false, body: 'bbb' },
    { fromMe: true, fromBot: true, body: 'Desculpe, não entendi novamente.' },
  ];

  assert.equal(hasReachedFallbackLimit(history), true);
  assert.equal(hasReachedFallbackLimit(history.slice(0, 2)), false);
});

test('prompt mestre traz os tres fluxos, escalonamento e dados de handoff', () => {
  const prompt = buildLegalBotInstructions({
    currentUserTurn: 'quero saber o horário de funcionamento',
    history: [],
  });

  assert.match(prompt, /FLUXO A — JA E CLIENTE/);
  assert.match(prompt, /FLUXO B — AINDA NAO E CLIENTE/);
  assert.match(prompt, /FLUXO C — INFORMACAO RAPIDA/);
  assert.match(prompt, /ESCALONAMENTO IMEDIATO/);
  assert.match(prompt, /FALLBACK/);
  assert.match(prompt, /DADOS OBRIGATORIOS PARA O HANDOFF/);
  assert.match(prompt, /Nome completo/);
  assert.match(prompt, /Urgência \(sim\/não\)/);
  assert.match(prompt, /Nunca dê orientacao juridica/);
});

test('prompt sinaliza urgencia e perfil do contato no estado do turno', () => {
  const prompt = buildLegalBotInstructions({
    currentUserTurn: 'tenho audiência amanhã',
    history: [],
    isKnownClient: true,
  });

  assert.match(prompt, /Urgencia detectada nesta mensagem: SIM/);
  assert.match(prompt, /Perfil do contato: CLIENTE \(siga o FLUXO A\)/);
  assert.match(prompt, /aplique a regra 41 de escalonamento imediato/);
});

test('turno de abertura orienta a IA a aplicar a etapa 1 do roteiro', () => {
  const prompt = buildLegalBotInstructions({
    currentUserTurn: 'Boa tarde',
    history: [],
    isOpeningTurn: true,
  });

  assert.match(prompt, /Turno de abertura da conversa: SIM/);
  assert.match(prompt, /Aplique a regra 20/);
  assert.match(prompt, /1️⃣ Sim, já sou cliente/);
  assert.match(prompt, /Nao mostre o menu de areas e nao peca o nome ainda/);
});

test('turno seguinte da mesma conversa nao repete a etapa 1', () => {
  const prompt = buildLegalBotInstructions({
    currentUserTurn: 'Boa tarde',
    history: [{ fromMe: true, fromBot: true, body: 'Você já é nosso(a) cliente?' }],
    isOpeningTurn: false,
  });

  assert.match(prompt, /Turno de abertura da conversa: NAO/);
  assert.doesNotMatch(prompt.split('CONDUTA PARA ESTE TURNO:')[1], /Aplique a regra 20/);
});

test('abertura com assunto ainda aplica a pergunta de perfil da etapa 1', () => {
  const prompt = buildLegalBotInstructions({
    currentUserTurn: 'quero revisar meu financiamento',
    history: [],
    isOpeningTurn: true,
  });
  const conduct = prompt.split('CONDUTA PARA ESTE TURNO:')[1];

  assert.match(conduct, /Aplique a regra 20/);
  assert.match(conduct, /1️⃣ Sim, já sou cliente/);
  assert.match(conduct, /reconheca em UMA frase antes da pergunta de perfil/);
  assert.match(prompt, /A etapa 1 e OBRIGATORIA na abertura/);
});
