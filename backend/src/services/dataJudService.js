/**
 * dataJudService.js — Integração com a API pública do CNJ (DataJud)
 *
 * Consulta movimentações processuais a partir do número CNJ do processo
 * (formato de 20 dígitos: NNNNNNN-DD.AAAA.J.TR.OOOO). O DataJud expõe um
 * índice por tribunal — é preciso saber o "alias" correto (ex: tjsp, trt2)
 * antes de consultar. Esse alias é derivado dos dígitos J (segmento de
 * justiça) e TR (código do tribunal) do próprio número do processo.
 *
 * Documentação pública: https://datajud-wiki.cnj.jus.br/api-publica/
 * A chave de acesso (DATAJUD_API_KEY) é obtida gratuitamente na wiki acima.
 *
 * A tabela abaixo cobre os segmentos mais comuns na prática cível/trabalhista
 * (Justiça Estadual, Federal e do Trabalho, além de STF/STJ/TST). Justiça
 * Eleitoral e Militar não estão mapeadas — nesses casos, ou quando a
 * detecção falhar, use o campo `courtAlias` no caso para informar o alias
 * manualmente em vez de arriscar um mapeamento incorreto.
 */
const axios = require('axios');

// A API pública do DataJud é cronicamente saturada (chave compartilhada
// nacionalmente) — respostas de sucesso levando 10-40s são normais mesmo
// consultando pelo alias específico do tribunal. Timeouts curtos (ex.: 15s)
// estouram na maior parte das vezes sem indicar problema real de rede.
// Ver .claude/skills/datajud/references/producao.md.
const REQUEST_TIMEOUT_MS = 35000;

// Ordem oficial dos códigos de tribunal (TR) da Justiça Estadual (segmento 8),
// conforme a numeração padronizada pelo CNJ (Resolução nº 65/2008).
const TJ_UF_ORDER = [
  'ac', 'al', 'ap', 'am', 'ba', 'ce', 'dft', 'es', 'go', 'ma', 'mt', 'ms', 'mg',
  'pa', 'pb', 'pr', 'pe', 'pi', 'rj', 'rn', 'rs', 'ro', 'rr', 'sc', 'se', 'sp', 'to',
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

const ALIAS_BY_SEGMENT = {
  1: { '00': 'stf' },
  3: { '00': 'stj' },
  4: Object.fromEntries([1, 2, 3, 4, 5, 6].map((n) => [pad2(n), `trf${n}`])),
  5: {
    '00': 'tst',
    ...Object.fromEntries(Array.from({ length: 24 }, (_, i) => i + 1).map((n) => [pad2(n), `trt${n}`])),
  },
  8: Object.fromEntries(TJ_UF_ORDER.map((uf, index) => [pad2(index + 1), `tj${uf}`])),
};

/**
 * Extrai apenas os dígitos de um número de processo em qualquer formatação.
 */
function onlyDigits(value = '') {
  return String(value || '').replace(/\D/g, '');
}

/**
 * Deriva o alias do tribunal a partir do número CNJ do processo (20 dígitos).
 * Retorna null quando o formato é inválido ou o segmento/tribunal não está
 * mapeado (nesses casos, use um `courtAlias` manual).
 */
function resolveAlias(caseNumber) {
  const digits = onlyDigits(caseNumber);
  if (digits.length !== 20) return null;

  const segment = Number(digits[13]);
  const tribunalCode = digits.slice(14, 16);
  return ALIAS_BY_SEGMENT[segment]?.[tribunalCode] || null;
}

/**
 * Consulta o processo no DataJud e retorna o documento bruto (_source),
 * ou null quando o processo não foi localizado naquele índice/tribunal.
 */
async function fetchProcess(caseNumber, alias) {
  const apiKey = process.env.DATAJUD_API_KEY;
  if (!apiKey) throw new Error('DATAJUD_API_KEY não configurada.');
  if (!alias) throw new Error('Tribunal (alias DataJud) não informado nem identificado automaticamente.');

  const digits = onlyDigits(caseNumber);
  if (digits.length !== 20) throw new Error('Número do processo fora do padrão CNJ (20 dígitos).');

  const baseUrl = (process.env.DATAJUD_BASE_URL || 'https://api-publica.datajud.cnj.jus.br').replace(/\/+$/, '');
  const normalizedAlias = String(alias).trim().toLowerCase();
  const url = `${baseUrl}/api_publica_${normalizedAlias}/_search`;

  const { data } = await axios.post(
    url,
    { query: { match: { numeroProcesso: digits } }, size: 1 },
    {
      headers: { Authorization: `APIKey ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: REQUEST_TIMEOUT_MS,
    },
  );

  const source = data?.hits?.hits?.[0]?._source || null;
  if (source) return source;

  // Sob saturação o Elasticsearch responde 200 tendo consultado só parte dos
  // shards (_shards.failed > 0). Se o processo estava num shard rejeitado,
  // "total = 0" mesmo com o processo existindo — não é "não encontrado", é
  // indisponibilidade parcial. Já aconteceu em produção reportar como
  // inexistente um processo que tinha dezenas de movimentos.
  if (data?._shards?.failed > 0) {
    throw new Error('API do DataJud respondeu de forma parcial (indisponibilidade momentânea). Tente novamente em alguns minutos.');
  }

  return null;
}

/**
 * Normaliza a lista de movimentos do processo, ordenada da mais antiga para
 * a mais recente.
 */
function extractMovements(source) {
  const raw = Array.isArray(source?.movimentos) ? source.movimentos : [];
  return raw
    .map((movement) => ({
      code: movement?.codigo ?? null,
      name: movement?.nome || 'Movimentação sem descrição',
      date: movement?.dataHora || null,
      complement: Array.isArray(movement?.complementosTabelados)
        ? movement.complementosTabelados.map((item) => item?.descricao).filter(Boolean).join('; ')
        : null,
    }))
    .filter((movement) => movement.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

module.exports = { resolveAlias, fetchProcess, extractMovements, onlyDigits };
