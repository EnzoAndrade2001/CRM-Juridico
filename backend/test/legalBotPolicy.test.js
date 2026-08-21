const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildInitialSubjectReply,
  buildLegalBotInstructions,
  hasConfirmedName,
  limitReplyToOneQuestion,
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
