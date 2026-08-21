const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// Modelos padrão (podem ser sobrescritos por variáveis de ambiente)
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_CHAT_MODEL    = process.env.OPENAI_CHAT_MODEL    || 'gpt-4o-mini';
const DEFAULT_VISION_MODEL  = process.env.OPENAI_VISION_MODEL  || 'gpt-4o';
const DEFAULT_EMBED_MODEL   = process.env.OPENAI_EMBED_MODEL   || 'text-embedding-3-small';
const OPENAI_API_BASE       = 'https://api.openai.com/v1';
const OPENAI_REQUEST_TIMEOUT_MS = Math.max(5000, Number(process.env.OPENAI_REQUEST_TIMEOUT_MS) || 30000);

// ─────────────────────────────────────────────────────────────────────────────
// Utilitário de chamada HTTP simples (sem dependência extra)
// ─────────────────────────────────────────────────────────────────────────────
function openaiRequest(apiKey, endpoint, body, { method = 'POST', isForm = false } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${OPENAI_API_BASE}${endpoint}`);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const headers = {
      Authorization: `Bearer ${apiKey}`,
    };

    let postData;
    if (isForm) {
      // multipart/form-data já vem como Buffer com boundary setado
      headers['Content-Type'] = body.contentType;
      headers['Content-Length'] = body.buffer.length;
      postData = body.buffer;
    } else {
      postData = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = lib.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (d) => chunks.push(d));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString();
          try {
            const parsed = JSON.parse(raw);
            if (res.statusCode >= 400) {
              const err = new Error(parsed?.error?.message || `HTTP ${res.statusCode}`);
              err.status = res.statusCode;
              err.data = parsed;
              return reject(err);
            }
            resolve(parsed);
          } catch {
            reject(new Error(`Resposta inválida da OpenAI: ${raw.substring(0, 200)}`));
          }
        });
      }
    );

    req.setTimeout(OPENAI_REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`OpenAI excedeu o limite de ${OPENAI_REQUEST_TIMEOUT_MS}ms`));
    });
    req.on('error', reject);
    if (postData) {
      if (isForm) req.write(postData);
      else req.write(postData);
    }
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Constrói multipart/form-data manualmente para o Whisper (sem dependências)
// ─────────────────────────────────────────────────────────────────────────────
function buildWhisperFormData(audioBuffer, mimeType, filename = 'audio.ogg') {
  const boundary = `----OpenAIBoundary${Date.now()}`;
  const CRLF = '\r\n';

  const parts = [];

  // Campo "model"
  parts.push(
    `--${boundary}${CRLF}`,
    `Content-Disposition: form-data; name="model"${CRLF}${CRLF}`,
    `whisper-1${CRLF}`,
  );

  // Campo "language"
  parts.push(
    `--${boundary}${CRLF}`,
    `Content-Disposition: form-data; name="language"${CRLF}${CRLF}`,
    `pt${CRLF}`,
  );

  // Campo "response_format"
  parts.push(
    `--${boundary}${CRLF}`,
    `Content-Disposition: form-data; name="response_format"${CRLF}${CRLF}`,
    `json${CRLF}`,
  );

  // Campo "file"
  parts.push(
    `--${boundary}${CRLF}`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"${CRLF}`,
    `Content-Type: ${mimeType}${CRLF}${CRLF}`,
  );

  const header = Buffer.from(parts.join(''));
  const footer = Buffer.from(`${CRLF}--${boundary}--${CRLF}`);
  const buffer = Buffer.concat([header, audioBuffer, footer]);

  return { buffer, contentType: `multipart/form-data; boundary=${boundary}` };
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAT — gpt-4o-mini (padrão) ou gpt-4o
// Assinatura compatível com geminiService.chat()
// ─────────────────────────────────────────────────────────────────────────────
async function chat(apiKey, systemPrompt, history, userMessage) {
  const messages = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  // Converte histórico do formato interno → OpenAI
  history.forEach((m) => {
    const role = m.fromMe || m.fromBot ? 'assistant' : 'user';
    messages.push({ role, content: m.body || '' });
  });

  messages.push({ role: 'user', content: userMessage });

  const result = await openaiRequest(apiKey, '/chat/completions', {
    model: DEFAULT_CHAT_MODEL,
    messages,
    max_tokens: 1000,
    temperature: 0.2,
  });

  const reply = result?.choices?.[0]?.message?.content;
  if (!reply) throw new Error('OpenAI não retornou conteúdo');

  console.log(`[openai] chat OK com ${DEFAULT_CHAT_MODEL}`);
  return reply;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARIZE — igual a chat mas sem histórico de turno
// Assinatura compatível com geminiService.summarize()
// ─────────────────────────────────────────────────────────────────────────────
async function summarize(apiKey, systemPrompt, history, task) {
  const historyText = history
    .map((m) => `${m.fromMe || m.fromBot ? 'Agente' : 'Cliente'}: ${m.body}`)
    .join('\n');

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Histórico:\n${historyText}\n\nTarefa: ${task}`,
    },
  ];

  const result = await openaiRequest(apiKey, '/chat/completions', {
    model: DEFAULT_CHAT_MODEL,
    messages,
    max_tokens: 600,
    temperature: 0.1,
  });

  return result?.choices?.[0]?.message?.content || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSCRIÇÃO DE ÁUDIO — Whisper-1 (melhor que Gemini para PT-BR)
// Recebe base64 + mimeType, igual a geminiService.transcribeAudio()
// ─────────────────────────────────────────────────────────────────────────────
async function transcribeAudio(apiKey, audioBase64, mimeType) {
  try {
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const ext = mimeType.includes('mp3') ? 'audio.mp3'
      : mimeType.includes('mp4') ? 'audio.mp4'
      : mimeType.includes('m4a') ? 'audio.m4a'
      : mimeType.includes('wav') ? 'audio.wav'
      : 'audio.ogg';

    const formData = buildWhisperFormData(audioBuffer, mimeType, ext);

    const result = await openaiRequest(apiKey, '/audio/transcriptions', formData, { isForm: true });
    const text = result?.text?.trim();

    if (!text) return null;
    console.log(`[openai] transcrição OK: "${text.substring(0, 60)}..."`);
    return text;
  } catch (err) {
    console.error('[openai] erro na transcrição:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ANÁLISE DE IMAGEM — GPT-4o vision
// Assinatura compatível com geminiService.analyzeImage()
// ─────────────────────────────────────────────────────────────────────────────
async function analyzeImage(apiKey, imageBase64, mimeType, prompt = 'Descreva esta imagem.') {
  try {
    const dataUrl = `data:${mimeType};base64,${imageBase64}`;

    const result = await openaiRequest(apiKey, '/chat/completions', {
      model: DEFAULT_VISION_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } },
          ],
        },
      ],
      max_tokens: 400,
    });

    const reply = result?.choices?.[0]?.message?.content;
    console.log(`[openai] visão OK: "${reply?.substring(0, 60)}..."`);
    return reply || null;
  } catch (err) {
    console.error('[openai] erro na visão:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GERAR TAGS — classificação de conversa
// Assinatura compatível com geminiService.generateTags()
// ─────────────────────────────────────────────────────────────────────────────
async function generateTags(apiKey, history, allowedTags = []) {
  try {
    const historyText = history
      .map((m) => `${m.fromMe ? 'Agente' : 'Cliente'}: ${m.body}`)
      .join('\n');

    let prompt = 'Analise esta conversa e sugira até 3 tags curtas para categorizá-la.\n\n';
    if (allowedTags.length > 0) {
      prompt += `ESCOLHA APENAS ENTRE ESTAS TAGS: ${allowedTags.join(', ')}.\nSe nenhuma se aplicar, retorne vazio.\n`;
    } else {
      prompt += 'Retorne apenas as tags separadas por vírgula.\n';
    }
    prompt += `\nHistórico:\n${historyText}`;

    const result = await openaiRequest(apiKey, '/chat/completions', {
      model: DEFAULT_CHAT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 60,
      temperature: 0,
    });

    const raw = result?.choices?.[0]?.message?.content || '';
    const suggested = raw.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
    return allowedTags.length > 0 ? suggested.filter((t) => allowedTags.includes(t)) : suggested;
  } catch (err) {
    console.error('[openai] erro em generateTags:', err.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RESUMO DE TRANSFERÊNCIA
// Assinatura compatível com geminiService.generateTransferSummary()
// ─────────────────────────────────────────────────────────────────────────────
async function generateTransferSummary(apiKey, history) {
  try {
    const historyText = history
      .slice(-30)
      .map((m) => `${m.fromMe || m.fromBot ? 'Atendimento' : 'Cliente'}: ${m.body}`)
      .join('\n');

    const result = await openaiRequest(apiKey, '/chat/completions', {
      model: DEFAULT_CHAT_MODEL,
      messages: [
        {
          role: 'user',
          content: `Gere um resumo curto desta conversa em até 3 frases:\n${historyText}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.1,
    });

    return result?.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error('[openai] erro no resumo de transferência:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EMBEDDING — text-embedding-3-small
// Assinatura compatível com geminiService.getEmbedding()
// ─────────────────────────────────────────────────────────────────────────────
async function getEmbedding(apiKey, text) {
  try {
    const result = await openaiRequest(apiKey, '/embeddings', {
      model: DEFAULT_EMBED_MODEL,
      input: text,
      encoding_format: 'float',
    });

    return result?.data?.[0]?.embedding || null;
  } catch (err) {
    console.error('[openai] erro no embedding:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMILARIDADE DE COSSENO — idêntica à do geminiService (puro JS)
// ─────────────────────────────────────────────────────────────────────────────
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB) return 0;
  let dot = 0, mA = 0, mB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    mA  += vecA[i] * vecA[i];
    mB  += vecB[i] * vecB[i];
  }
  const sim = dot / (Math.sqrt(mA) * Math.sqrt(mB));
  return Number.isNaN(sim) ? 0 : sim;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTRAÇÃO DE INFORMAÇÕES DO CLIENTE (memória de longo prazo)
// Assinatura compatível com geminiService.extractClientInfo()
// ─────────────────────────────────────────────────────────────────────────────
async function extractClientInfo(apiKey, history, currentNotes) {
  try {
    const historyText = history
      .map((m) => `${m.fromMe ? 'Agente' : 'Cliente'}: ${m.body}`)
      .join('\n');

    const prompt = `Analise a conversa abaixo e retorne um objeto JSON com exatamente as chaves "name" e "notes":
1. "name": O nome pessoal do cliente se ele se identificou (null se não informado).
2. "notes": A ficha técnica consolidada do cliente. Capture modelo, marca, série, serial, setor, ramal, endereço. Atualize a ficha atual com as novas informações da conversa.

Se não houver NENHUMA informação nova, responda exatamente: IGNORAR

Ficha Atual:
${currentNotes}

Conversa:
${historyText}`;

    const result = await openaiRequest(apiKey, '/chat/completions', {
      model: DEFAULT_CHAT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0,
      response_format: { type: 'text' },
    });

    const resp = result?.choices?.[0]?.message?.content?.trim();
    if (!resp || resp.toUpperCase() === 'IGNORAR') return null;

    let clean = resp.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
      const parsed = JSON.parse(clean);
      return { name: parsed.name || null, notes: parsed.notes || null };
    } catch {
      return { name: null, notes: resp };
    }
  } catch (err) {
    console.error('[openai] erro em extractClientInfo:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RASCUNHO DE ORDEM DE SERVIÇO
// Assinatura compatível com geminiService.draftServiceOrder()
// ─────────────────────────────────────────────────────────────────────────────
async function draftServiceOrder(apiKey, history, equipments) {
  try {
    const historyText = history
      .slice(-20)
      .map((m) => `${m.fromMe ? 'Agente' : 'Cliente'}: ${m.body}`)
      .join('\n');

    const equipList = equipments.map((e) => `[ID: ${e.id}] ${e.model}`).join('\n');

    const result = await openaiRequest(apiKey, '/chat/completions', {
      model: DEFAULT_CHAT_MODEL,
      messages: [
        {
          role: 'user',
          content: `Gere um JSON rascunho de Ordem de Serviço: {"defect": "string", "equipmentId": "id ou null"}.\n\nEquipamentos:\n${equipList}\n\nConversa:\n${historyText}`,
        },
      ],
      max_tokens: 150,
      temperature: 0,
    });

    let text = result?.choices?.[0]?.message?.content?.trim() || '';
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(text);
  } catch (err) {
    console.error('[openai] erro em draftServiceOrder:', err.message);
    return { defect: null, equipmentId: null };
  }
}

module.exports = {
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
