/**
 * aiService.js — Abstração de provedor de IA
 *
 * Roteia as chamadas para OpenAI ou Gemini conforme a configuração do tenant.
 * Todos os módulos que usavam geminiService diretamente podem migrar para cá,
 * garantindo que a escolha de provedor seja centralizada e transparente.
 *
 * Regras de seleção:
 *   1. Se `settings.aiProvider === 'openai'` e `settings.openaiKey` → OpenAI
 *   2. Se `settings.aiProvider === 'gemini'`  e `settings.geminiKey` → Gemini
 *   3. Auto-detect: usa OpenAI se openaiKey disponível, Gemini caso contrário
 */

const geminiService = require('./geminiService');
const openaiService = require('./openaiService');

/**
 * Resolve qual serviço usar e retorna { service, key, provider }.
 * @param {object} settings  TenantSettings do Prisma
 */
function resolveProvider(settings) {
  const provider  = settings?.aiProvider || 'auto';
  const openaiKey = settings?.openaiKey  || process.env.OPENAI_API_KEY;
  const geminiKey = settings?.geminiKey  || process.env.GEMINI_API_KEY;

  if (provider === 'openai' && openaiKey) {
    return { service: openaiService, key: openaiKey, provider: 'openai' };
  }

  if (provider === 'gemini' && geminiKey) {
    return { service: geminiService, key: geminiKey, provider: 'gemini' };
  }

  // Auto-detect: prefere OpenAI se tiver chave
  if (openaiKey) {
    return { service: openaiService, key: openaiKey, provider: 'openai' };
  }

  if (geminiKey) {
    return { service: geminiService, key: geminiKey, provider: 'gemini' };
  }

  return null; // nenhum provedor configurado
}

/**
 * Verifica se o tenant tem pelo menos um provedor de IA configurado.
 */
function hasAiConfigured(settings) {
  return Boolean(resolveProvider(settings));
}

/**
 * Chat principal do bot.
 */
async function chat(settings, systemPrompt, history, userMessage) {
  const p = resolveProvider(settings);
  if (!p) throw new Error('Nenhum provedor de IA configurado para este tenant.');
  console.log(`[ai] chat via ${p.provider}`);
  return p.service.chat(p.key, systemPrompt, history, userMessage);
}

/**
 * Resumo estruturado de uma conversa.
 */
async function summarize(settings, systemPrompt, history, task) {
  const p = resolveProvider(settings);
  if (!p) return null;
  return p.service.summarize(p.key, systemPrompt, history, task);
}

/**
 * Transcrição de áudio (base64).
 */
async function transcribeAudio(settings, audioBase64, mimeType) {
  const p = resolveProvider(settings);
  if (!p) return null;
  console.log(`[ai] transcribeAudio via ${p.provider}`);
  return p.service.transcribeAudio(p.key, audioBase64, mimeType);
}

/**
 * Análise de imagem (base64).
 */
async function analyzeImage(settings, imageBase64, mimeType, prompt) {
  const p = resolveProvider(settings);
  if (!p) return null;
  console.log(`[ai] analyzeImage via ${p.provider}`);
  return p.service.analyzeImage(p.key, imageBase64, mimeType, prompt);
}

/**
 * Geração de tags para uma conversa.
 */
async function generateTags(settings, history, allowedTags) {
  const p = resolveProvider(settings);
  if (!p) return [];
  return p.service.generateTags(p.key, history, allowedTags);
}

/**
 * Resumo para transferência de atendimento.
 */
async function generateTransferSummary(settings, history) {
  const p = resolveProvider(settings);
  if (!p) return null;
  return p.service.generateTransferSummary(p.key, history);
}

/**
 * Vetor de embedding para busca semântica.
 */
async function getEmbedding(settings, text) {
  const p = resolveProvider(settings);
  if (!p) return null;
  return p.service.getEmbedding(p.key, text);
}

/**
 * Similaridade de cosseno (independente de provedor).
 */
function cosineSimilarity(vecA, vecB) {
  // Ambas as implementações são idênticas — usa gemini por conveniência
  return geminiService.cosineSimilarity(vecA, vecB);
}

/**
 * Extração de informações do cliente para memória longa.
 */
async function extractClientInfo(settings, history, currentNotes) {
  const p = resolveProvider(settings);
  if (!p) return null;
  return p.service.extractClientInfo(p.key, history, currentNotes);
}

/**
 * Rascunho de ordem de serviço.
 */
async function draftServiceOrder(settings, history, equipments) {
  const p = resolveProvider(settings);
  if (!p) return { defect: null, equipmentId: null };
  return p.service.draftServiceOrder(p.key, history, equipments);
}

module.exports = {
  resolveProvider,
  hasAiConfigured,
  chat,
  summarize,
  transcribeAudio,
  analyzeImage,
  generateTags,
  generateTransferSummary,
  getEmbedding,
  cosineSimilarity,
  extractClientInfo,
  draftServiceOrder,
};
