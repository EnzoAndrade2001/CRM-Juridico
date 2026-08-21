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
  assert.match(reply, /1\. Bancos e Financiamentos/);
  assert.match(reply, /0\. Falar com um atendente/);
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
  assert.match(prompt, /Perfeito! Vou encaminhar você ao setor especializado\. 👍/);
  assert.match(prompt, /Essa possibilidade precisa ser analisada pela nossa equipe jurídica\./);
});

test('despedida e substituida pela espera do especialista', () => {
  const reply = replaceFarewellWithSpecialistHandoff('Obrigado pelas informações. Até mais!');

  assert.doesNotMatch(reply, /até mais/i);
  assert.match(reply, /encaminhadas ao especialista responsável/i);
  assert.match(reply, /aguarde o retorno da equipe/i);
});
