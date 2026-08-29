/**
 * passwordPolicy.js — Regras mínimas de senha para as contas do escritório.
 *
 * O CRM guarda dado sensível de cliente: processo, documento, relato de caso.
 * Uma senha curta ou óbvia é o caminho mais barato para chegar nisso, e o
 * bloqueio por tentativas do login não protege contra senha adivinhável em
 * poucas tentativas.
 *
 * O custo de hash também sobe de 10 para 12 rounds: cada tentativa de quebra
 * offline, caso o banco vaze, fica quatro vezes mais cara.
 */
const MIN_LENGTH = 12;
const BCRYPT_ROUNDS = 12;

// Senhas que aparecem no topo de qualquer lista de vazamento, mais as
// variações previsíveis do contexto deste sistema.
const BLOCKLIST = [
  '123456', '12345678', '123456789', '1234567890', 'senha', 'password',
  'qwerty', 'abc123', 'admin', 'administrador', 'iloveyou', 'brasil',
  'advocacia', 'juridico', 'jurídico', 'escritorio', 'escritório',
  'multiatendimento', 'whatsapp', 'mudar123', 'trocar123',
];

function normalize(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Retorna a lista de problemas encontrados. Vazia significa senha aceita.
 * Devolver todos de uma vez evita o vaivém de corrigir um por tentativa.
 */
function checkPassword(password, { email = '', name = '' } = {}) {
  const value = String(password || '');
  const problems = [];

  if (value.length < MIN_LENGTH) {
    problems.push(`A senha precisa ter pelo menos ${MIN_LENGTH} caracteres.`);
  }
  if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
    problems.push('A senha precisa conter letras e números.');
  }
  // "aaaaaaaaaaaa1" cumpre tamanho e mistura de letra com número, mas tem
  // duas variações apenas — é adivinhável como um caractere repetido.
  if (new Set(value).size < 5) {
    problems.push('A senha repete poucos caracteres diferentes. Varie mais.');
  }

  const normalized = normalize(value);
  if (BLOCKLIST.some((entry) => normalized.includes(normalize(entry)))) {
    problems.push('A senha contém uma palavra comum demais. Escolha algo que não remeta ao sistema nem ao escritório.');
  }

  // Senha derivada do próprio login é tão fácil quanto uma da lista acima.
  const localPart = normalize(email).split('@')[0];
  if (localPart.length >= 4 && normalized.includes(localPart)) {
    problems.push('A senha não pode conter o seu e-mail.');
  }
  for (const part of normalize(name).split(/\s+/)) {
    if (part.length >= 4 && normalized.includes(part)) {
      problems.push('A senha não pode conter o seu nome.');
      break;
    }
  }

  return problems;
}

function assertPassword(password, context) {
  const problems = checkPassword(password, context);
  if (problems.length) {
    const error = new Error(problems.join(' '));
    error.statusCode = 400;
    throw error;
  }
}

module.exports = { BCRYPT_ROUNDS, MIN_LENGTH, assertPassword, checkPassword };
