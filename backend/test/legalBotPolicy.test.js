const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildInitialSubjectReply,
  buildLegalBotInstructions,
  buildWelcomeServicesReply,
  hasConfirmedName,
  limitReplyToOneQuestion,
  replaceFarewellWithSpecialistHandoff,
  shouldAskNameForSubject,
} = require('../src/domain/legalBotPolicy');

test('assunto juridico informado avanca para a confirmacao do nome sem oferecer menu', () => {
  const prompt = buildLegalBotInstructions({
    currentUserTurn: 'isenção de imposto de renda para autismo',
    history: [],
    profileName: 'Eduarda Marranghello',
  });

  assert.match(prompt, /Assunto informado agora: SIM/);
  assert.match(prompt, /qual e o seu nome completo/i);
  assert.match(prompt, /NUNCA mostre menu numerado/i);
  assert.equal(shouldAskNameForSubject([], 'isenção de imposto de renda para autismo'), true);

  const reply = buildInitialSubjectReply('isenção de imposto de renda para autismo');
  assert.equal(reply, 'Entendi que você busca orientação sobre isenção de imposto de renda relacionada ao autismo. O escritório pode realizar uma análise inicial do caso. Para iniciarmos, qual é o seu nome completo?');
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

  assert.match(reply, /Revisão de contratos bancários/);
  assert.match(reply, /Empréstimos e consignados/);
  assert.match(reply, /Financiamentos de veículos e imóveis/);
  assert.match(reply, /Cobranças, dívidas e contratos/);
  assert.match(reply, /Busca e apreensão de veículos/);
  assert.match(reply, /isenção de imposto de renda relacionada ao autismo/i);
  assert.match(reply, /qual é o seu nome completo\?/i);
  assert.equal((reply.match(/\?/g) || []).length, 1);
});

test('despedida e substituida pela espera do especialista', () => {
  const reply = replaceFarewellWithSpecialistHandoff('Obrigado pelas informações. Até mais!');

  assert.doesNotMatch(reply, /até mais/i);
  assert.match(reply, /encaminhadas ao especialista responsável/i);
  assert.match(reply, /aguarde o retorno da equipe/i);
});
