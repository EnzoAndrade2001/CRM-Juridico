const prisma = require('../lib/prisma');
const path = require('path');
const fs = require('fs');
const { mediaPath } = require('../utils/uploads');
const evolutionService = require('../services/evolutionService');
const aiService = require('../services/aiService');
const businessHourService = require('../services/businessHourService');
const {
  buildInitialGreetingReply,
  buildInitialSubjectReply,
  buildLegalBotInstructions,
  hasConfirmedName,
  hasReachedFallbackLimit,
  isHumanHandoffRequest,
  isUrgentMessage,
  LEGAL_IMAGE_ANALYSIS_PROMPT,
  limitReplyToOneQuestion,
  replaceFarewellWithSpecialistHandoff,
  sanitizeBotReply,
  shouldAskNameForSubject,
} = require('../domain/legalBotPolicy');

let io;
function setIo(socketIo) { io = socketIo; }

const pendingConnectionChecks = new Map();
const DISCONNECT_CONFIRMATION_MS = Number(process.env.EVOLUTION_DISCONNECT_CONFIRMATION_MS || 45000);
// Pequena janela para agrupar mensagens enviadas em sequencia (ex.: "oi" +
// "quero revisar meu contrato"). O valor anterior de 12s fazia toda resposta
// parecer lenta mesmo quando a OpenAI respondia rapidamente.
const BOT_REPLY_DEBOUNCE_MS = Math.max(250, Number(process.env.BOT_REPLY_DEBOUNCE_MS) || 500);
const BOT_TYPING_DURATION_MS = Math.max(1000, Number(process.env.BOT_TYPING_DURATION_MS) || 5000);

function clearPendingConnectionCheck(instanceName) {
  const timer = pendingConnectionChecks.get(instanceName);
  if (timer) {
    clearTimeout(timer);
    pendingConnectionChecks.delete(instanceName);
  }
}

function getConnectionStateValue(payload) {
  return payload?.instance?.state || payload?.state || null;
}

async function confirmDisconnected(instanceName, waInstanceId) {
  const waInstance = await prisma.waInstance.findUnique({
    where: { id: waInstanceId },
    include: { tenant: { include: { settings: true } } },
  });
  if (!waInstance) return;

  const settings = waInstance.tenant?.settings;
  const evolutionUrl = settings?.evolutionUrl || process.env.DEFAULT_EVOLUTION_URL;
  const evolutionKey = settings?.evolutionKey || process.env.DEFAULT_EVOLUTION_KEY;
  if (!evolutionUrl || !evolutionKey) {
    console.warn(`[webhook] Nao foi possivel confirmar desconexao de ${instanceName}: Evolution nao configurada.`);
    return;
  }

  const stateData = await evolutionService.getConnectionState(evolutionUrl, evolutionKey, instanceName);
  const state = getConnectionStateValue(stateData);

  if (state === 'open') {
    const updated = await prisma.waInstance.update({
      where: { id: waInstance.id },
      data: { status: 'connected' },
    });
    if (io) io.to(updated.tenantId).emit('connection_update', {
      instance: instanceName,
      event: 'connection.update',
      data: { state: 'open', confirmed: true },
    });
    return;
  }

  if (state === 'close') {
    const updated = await prisma.waInstance.update({
      where: { id: waInstance.id },
      data: { status: 'disconnected' },
    });
    if (io) io.to(updated.tenantId).emit('connection_update', {
      instance: instanceName,
      event: 'connection.update',
      data: { state: 'close', confirmed: true },
    });

    const { sendSystemAlert } = require('../services/alertService');
    sendSystemAlert(updated.tenantId, `A conexao *${instanceName.split('_')[1] || instanceName}* foi desconectada. Verifique o painel para reconectar.`);
    return;
  }

  console.log(`[webhook] Desconexao de ${instanceName} nao confirmada. Estado atual: ${state || 'desconhecido'}.`);
}

function scheduleDisconnectConfirmation(instanceName, waInstanceId) {
  clearPendingConnectionCheck(instanceName);
  const timer = setTimeout(async () => {
    pendingConnectionChecks.delete(instanceName);
    try {
      await confirmDisconnected(instanceName, waInstanceId);
    } catch (err) {
      console.warn(`[webhook] Falha ao confirmar desconexao de ${instanceName}:`, err.response?.data || err.message);
    }
  }, DISCONNECT_CONFIRMATION_MS);
  pendingConnectionChecks.set(instanceName, timer);
}

const teamCache = new Map();
const knowledgeCache = new Map();
const HUMAN_ONLY_INSTANCE_PATTERNS = String(process.env.HUMAN_ONLY_INSTANCE_PATTERNS || 'captacao,captação,lead,leads,locacao,locação,comercial,vendas')
  .split(',')
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

function getCacheEntry(cache, key, ttlMs) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > ttlMs) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCacheEntry(cache, key, value) {
  cache.set(key, { value, createdAt: Date.now() });
  return value;
}

async function getTeamsCached(tenantId) {
  const cached = getCacheEntry(teamCache, tenantId, 5 * 60 * 1000);
  if (cached) return cached;

  const teams = await prisma.team.findMany({ where: { tenantId } });
  return setCacheEntry(teamCache, tenantId, teams);
}

async function getKnowledgeCached(tenantId) {
  const cached = getCacheEntry(knowledgeCache, tenantId, 2 * 60 * 1000);
  if (cached) return cached;

  const knowledges = await prisma.knowledge.findMany({
    where: { tenantId, active: true, embedding: { not: null } },
    select: { id: true, question: true, answer: true, embedding: true }
  });

  return setCacheEntry(knowledgeCache, tenantId, knowledges);
}

function shouldUseKnowledgeSearch(message) {
  const normalized = (message || '').trim().toLowerCase();
  if (normalized.length < 18) return false;

  return normalized.includes('?')
    || normalized.includes('como')
    || normalized.includes('qual')
    || normalized.includes('quando')
    || normalized.includes('onde')
    || normalized.includes('porque')
    || normalized.includes('por que')
    || normalized.includes('procedimento')
    || normalized.includes('configur')
    || normalized.includes('instal')
    || normalized.includes('erro');
}

function isHumanOnlyInstance(instanceName = '') {
  const normalized = String(instanceName).toLowerCase();
  return HUMAN_ONLY_INSTANCE_PATTERNS.some((pattern) => pattern && normalized.includes(pattern));
}

function shouldUseBotForInstance(instanceName, tenantSettings) {
  return Boolean(tenantSettings?.botEnabled) && !isHumanOnlyInstance(instanceName) && aiService.hasAiConfigured(tenantSettings);
}

function isLikelyEquipmentModel(message) {
  const normalized = (message || '').trim();
  if (normalized.length < 4 || normalized.length > 40) return false;

  if (/\b(?:xerox|ricoh|kyocera|canon|hp|epson|brother|lexmark|sharp|konica|minolta|samsung)\b[\s\-]*[a-z0-9-]{2,}/i.test(normalized)) {
    return true;
  }

  return /\b[a-z]{1,6}[\s-]?[a-z]?\d{3,6}\b/i.test(normalized);
}

function shouldExtractClientMemory(message) {
  const normalized = (message || '').trim();
  if (!normalized) return false;

  if (/nome|modelo|serie|serial|setor|endereco|ramal|equipamento|impressora|copiadora|maquina|whatsapp|email/i.test(normalized)) {
    return true;
  }

  if (isLikelyEquipmentModel(normalized)) {
    return true;
  }

  return false;
}

// Contact.notes is a text column, while the AI may return the extracted
// profile as a JSON object. Convert both shapes to a compact text note before
// handing the value to Prisma so memory extraction never breaks contact sync.
function normalizeClientNotes(notes) {
  if (notes == null) return null;
  if (typeof notes === 'string') {
    const value = notes.trim();
    return value || null;
  }
  if (typeof notes === 'object') {
    const entries = Object.entries(notes)
      .filter(([, value]) => value != null && String(value).trim() !== '')
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value).trim()}`);
    return entries.length ? entries.join('\n') : null;
  }
  return String(notes).trim() || null;
}

function pickBestContactMatch(contacts, phoneCandidates, instanceId) {
  if (!Array.isArray(contacts) || contacts.length === 0) return null;

  const normalizedCandidates = new Set(phoneCandidates);

  const rankContact = (contact) => {
    const sameInstance = contact.instanceId === instanceId ? 100 : 0;
    const exactPhone = normalizedCandidates.has(contact.phone) ? 10 : 0;
    const exactWhatsapp = normalizedCandidates.has(contact.whatsapp) ? 5 : 0;
    const hasName = contact.name && contact.name !== '.' ? 2 : 0;
    return sameInstance + exactPhone + exactWhatsapp + hasName;
  };

  return [...contacts].sort((left, right) => {
    const scoreDiff = rankContact(right) - rankContact(left);
    if (scoreDiff !== 0) return scoreDiff;
    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  })[0];
}

function getMessageContent(m) {
  if (!m) return null;
  if (m.ephemeralMessage) return getMessageContent(m.ephemeralMessage.message);
  if (m.viewOnceMessage) return getMessageContent(m.viewOnceMessage.message);
  if (m.viewOnceMessageV2) return getMessageContent(m.viewOnceMessageV2.message);
  if (m.documentWithCaptionMessage) return getMessageContent(m.documentWithCaptionMessage.message);
  return m;
}

function extractMedia(msg) {
  const m = getMessageContent(msg.message);
  if (!m) return null;
  
  // Debug log for media structure
  console.log('[webhook] Extracting media from:', JSON.stringify(m).substring(0, 500));

  if (m.imageMessage)    return { type: 'image',    caption: m.imageMessage.caption || '' };
  if (m.videoMessage)    return { type: 'video',    caption: m.videoMessage.caption || '' };
  if (m.audioMessage)    return { type: 'audio',    caption: '🎤 Áudio' };
  if (m.pttMessage)      return { type: 'audio',    caption: '🎤 Áudio' };
  if (m.documentMessage) return { type: 'document', caption: m.documentMessage.caption || '', fileName: m.documentMessage.fileName || 'Documento' };
  if (m.stickerMessage)  return { type: 'sticker',  caption: '' };
  return null;
}

function joinAiParts(parts = []) {
  return parts
    .map((part) => (part || '').toString().trim())
    .filter(Boolean)
    .join('\n');
}

function describeMessageForAi(message, fallbackText = '') {
  const body = (message?.body || '').trim();
  const transcription = (message?.transcription || '').trim();
  const mediaType = message?.mediaType;
  const fileName = (message?.fileName || '').trim();

  if (!mediaType) return body || fallbackText.trim();

  if (mediaType === 'image') {
    return joinAiParts([
      '[Cliente enviou uma foto/imagem.]',
      body ? `Legenda do cliente: ${body}` : '',
      transcription ? `Análise visual automática: ${transcription}` : '',
    ]);
  }

  if (mediaType === 'audio') {
    return joinAiParts([
      '[Cliente enviou um áudio.]',
      transcription ? `Transcrição do áudio: ${transcription}` : '',
    ]);
  }

  if (mediaType === 'video') {
    return joinAiParts([
      '[Cliente enviou um vídeo.]',
      body ? `Legenda do cliente: ${body}` : '',
      transcription ? `Resumo automático do vídeo: ${transcription}` : '',
    ]);
  }

  if (mediaType === 'document') {
    return joinAiParts([
      `[Cliente enviou um documento${fileName ? `: ${fileName}` : '.'}]`,
      body ? `Legenda do cliente: ${body}` : '',
      transcription ? `Conteúdo extraído: ${transcription}` : '',
    ]);
  }

  return joinAiParts([
    `[Cliente enviou uma mídia do tipo ${mediaType}.]`,
    body,
    transcription,
  ]) || fallbackText.trim();
}

function normalizeHistoryForAi(messages = []) {
  return messages
    .map((message) => {
      const aiBody = describeMessageForAi(message);
      return aiBody ? { ...message, body: aiBody } : null;
    })
    .filter(Boolean);
}

async function downloadMedia(settings, instanceName, msg, messageId) {
  let attempts = 0;
  const maxAttempts = 5;
  const evolutionUrl = settings?.evolutionUrl || process.env.DEFAULT_EVOLUTION_URL;
  const evolutionKey = settings?.evolutionKey || process.env.DEFAULT_EVOLUTION_KEY;

  if (!evolutionUrl || !evolutionKey) {
    console.warn(`[media-download] [${instanceName}] Evolution API não configurada.`);
    return null;
  }

  while (attempts < maxAttempts) {
    try {
      console.log(`[media-download] [${instanceName}] Tentativa ${attempts + 1} para msg ${msg.key.id}...`);
      const result = await evolutionService.getMediaBase64(
        evolutionUrl, evolutionKey, instanceName, msg.key
      );
      
      const base64 = result?.base64 || result?.data?.base64;
      const mimetype = result?.mimetype || result?.data?.mimetype || result?.data?.data?.mimetype;
      
      if (base64) {
        console.log(`[media-download] [${instanceName}] Base64 obtido com sucesso para msg ${msg.key.id}. Tamanho: ${Math.round(base64.length/1024)}KB`);
        return evolutionService.saveMediaFile(base64, mimetype, messageId);
      } else {
        console.warn(`[media-download] [${instanceName}] Evolution não retornou base64 na tentativa ${attempts + 1}. Resposta:`, JSON.stringify(result).substring(0, 200));
      }
    } catch (err) {
      console.error(`[media-download] [${instanceName}] Erro na tentativa ${attempts + 1} para msg ${msg.key.id}:`, err.response?.data || err.message);
      
      // Se for erro de instância inexistente ou API key, não adianta tentar de novo
      if (err.response?.status === 401 || err.response?.status === 403 || (err.response?.data?.message || '').includes('not found')) {
        return null;
      }
    }
    
    attempts++;
    if (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.error(`[media-download] [${instanceName}] Falha definitiva após ${maxAttempts} tentativas para msg ${msg.key.id}`);
  return null;
}

async function processSingleMessage(msg, instance, waInstance, tenant, isHistorical) {
  const externalId = msg.key?.id;
  const fromMe = msg.key?.fromMe === true;

  // Se já existe no banco, ignora (evita duplicar o que o sistema enviou)
  const existing = await prisma.message.findFirst({ where: { externalId } });
  if (existing) return;

  const remoteJid = msg.key?.remoteJid || '';
  if (remoteJid === 'status@broadcast') return;

  const isGroup = evolutionService.isGroupJid(remoteJid);
  const remoteJidAlt = msg.key?.remoteJidAlt || '';
  const directJids = [remoteJid, remoteJidAlt]
    .filter((jid) => typeof jid === 'string')
    .map((jid) => jid.trim().toLowerCase());
  const phoneJid = directJids.find((jid) => jid.endsWith('@s.whatsapp.net')) || remoteJid;
  const whatsappJid = directJids.find((jid) => jid.endsWith('@lid'))
    || directJids.find((jid) => jid.endsWith('@s.whatsapp.net'))
    || null;
  const phone = isGroup
    ? evolutionService.normalizePhoneNumber(remoteJid)
    : evolutionService.normalizePhoneNumber(phoneJid.replace('@s.whatsapp.net', ''));

  const media = extractMedia(msg);
  const mContent = getMessageContent(msg.message);
  
  // Tentativa robusta de pegar o texto (body) da mensagem
  let body = mContent?.conversation
    || mContent?.extendedTextMessage?.text
    || mContent?.imageMessage?.caption
    || mContent?.videoMessage?.caption
    || mContent?.documentMessage?.caption
    || media?.caption
    || '';

  if (!body) {
    if (mContent?.contactMessage) {
      const name = mContent.contactMessage.displayName || 'Desconhecido';
      const vcard = mContent.contactMessage.vcard || '';
      const phoneMatch = vcard.match(/waid=([0-9]+)/) || vcard.match(/TEL.*:.*?\+?([0-9\-\s]+)/);
      let phoneText = '';
      if (phoneMatch) {
        const number = phoneMatch[1].replace(/\D/g, '');
        phoneText = `\n📱 +${number}\n🔗 https://wa.me/${number}`;
      }
      body = `👤 Contato: ${name}${phoneText}`;
    } else if (mContent?.contactsArrayMessage) {
      body = `👥 ${mContent.contactsArrayMessage.contacts?.length || 'Vários'} Contato(s)\n*(Abra no celular para salvar)*`;
    } else if (mContent?.locationMessage) {
      body = mContent.locationMessage.name ? `📍 Localização: ${mContent.locationMessage.name}` : `📍 Localização`;
    }
  }

  if (isGroup && !fromMe && body) {
    const participant = msg.key?.participant || msg.participant || '';
    const senderLabel = msg.pushName
      || evolutionService.normalizePhoneNumber(participant.replace('@s.whatsapp.net', ''))
      || 'Participante';
    body = `${senderLabel}: ${body}`;
  }

  const contextInfo = mContent?.extendedTextMessage?.contextInfo 
                   || mContent?.imageMessage?.contextInfo
                   || mContent?.videoMessage?.contextInfo
                   || mContent?.audioMessage?.contextInfo
                   || mContent?.documentMessage?.contextInfo
                   || mContent?.documentWithCaptionMessage?.message?.documentMessage?.contextInfo;
  
  const quotedMsgId = contextInfo?.stanzaId;
  const qContent = getMessageContent(contextInfo?.quotedMessage);
  const quotedMsgBody = qContent?.conversation 
                     || qContent?.extendedTextMessage?.text
                     || qContent?.imageMessage?.caption
                     || qContent?.videoMessage?.caption
                     || (qContent?.audioMessage ? '🎤 Áudio' : null)
                     || (qContent?.documentMessage ? '📎 Documento' : null)
                     || (qContent?.contactMessage ? `👤 Contato: ${qContent.contactMessage.displayName || 'Desconhecido'}` : null)
                     || (qContent?.locationMessage ? '📍 Localização' : null);

  if (!phone || (!body && !media)) {
    if (fromMe) {
      console.log(`[webhook] Ignorando mensagem fromMe sem body/media. Jid: ${remoteJid}, msg.message:`, JSON.stringify(msg.message || {}).substring(0, 300));
    }
    return;
  }
  console.log(`[webhook] mensagem ${fromMe ? 'ENVIADA para' : 'RECEBIDA de'} ${phone}: "${body}" ${media ? `[${media.type}]` : ''} | isHistorical: ${isHistorical}`);

  const phoneCandidates = evolutionService.buildPhoneLookupCandidates(phone);
  const matchingContacts = await prisma.contact.findMany({
    where: {
      tenantId: tenant.id,
      OR: [
        { phone: { in: phoneCandidates } },
        { whatsapp: { in: phoneCandidates } },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  const matchedContact = pickBestContactMatch(matchingContacts, phoneCandidates, waInstance.id);

  let contact;
  if (matchedContact) {
    const shouldUpdateName = !isGroup && !fromMe && msg.pushName && (!matchedContact.name || matchedContact.name === '.');
    const nextContactData = {
      ...(matchedContact.phone !== phone ? { phone } : {}),
      ...(matchedContact.instanceId !== waInstance.id ? { instanceId: waInstance.id } : {}),
      ...(whatsappJid && matchedContact.whatsappJid !== whatsappJid ? { whatsappJid } : {}),
      ...(shouldUpdateName ? { name: msg.pushName } : {}),
    };

    contact = Object.keys(nextContactData).length > 0
      ? await prisma.contact.update({
          where: { id: matchedContact.id },
          data: nextContactData,
        })
      : matchedContact;
  } else {
    contact = await prisma.contact.create({
      data: {
        tenantId: tenant.id,
        instanceId: waInstance.id,
        phone,
        whatsappJid,
        name: isGroup ? `Grupo ${phone.split('@')[0]}` : (fromMe ? null : (msg.pushName || null)),
      },
    });
  }

  // Busca foto de perfil em background se ainda não tiver
  if (!contact.avatarUrl && tenant.settings?.evolutionUrl && tenant.settings?.evolutionKey) {
    evolutionService.fetchProfilePicture(tenant.settings.evolutionUrl, tenant.settings.evolutionKey, instance, phone)
      .then(async (picture) => {
        if (picture) await prisma.contact.update({ where: { id: contact.id }, data: { avatarUrl: picture } });
      })
      .catch(() => {});
  }

  // --- Lógica de Avaliação de Atendimento (CSAT) ---
  // Busca o atendimento atual antes de interpretar respostas numéricas.
  // Assim, uma opção como "3" durante a triagem não vira nota CSAT de um
  // atendimento antigo.
  let ticket = await prisma.ticket.findFirst({
    where: { contactId: contact.id, tenantId: tenant.id },
    orderBy: { updatedAt: 'desc' },
  });

  const bodyTrim = (body || '').trim();
  const isRating = /^[1-5]$/.test(bodyTrim);
  if (tenant.settings?.ratingEnabled === true
    && !isGroup
    && !fromMe
    && isRating
    && !isHistorical
    && ticket?.status === 'resolved'
    && !ticket.rating) {
    const lastResolved = ticket;

    // Se foi encerrado nas últimas 24h, gravamos a nota
    if (lastResolved && (new Date() - new Date(lastResolved.resolvedAt) < 24 * 60 * 60 * 1000)) {
      await prisma.ticket.update({
        where: { id: lastResolved.id },
        data: { 
          rating: parseInt(bodyTrim),
          ratingAt: new Date()
        }
      });
      
      await evolutionService.sendText(tenant.settings.evolutionUrl, tenant.settings.evolutionKey, instance, phone, "Obrigado por sua avaliação. Sua nota é muito importante para nós.");
      return;
    }
  }

  // 2. BUSCA OU CRIAÇÃO DE TICKET (Lógica Anti-Duplicação)
  if (!ticket) {
    const useBotForInstance = shouldUseBotForInstance(instance, tenant.settings);
    ticket = await prisma.ticket.create({
      data: {
        tenantId: tenant.id,
        instanceId: waInstance.id,
        contactId: contact.id,
        status: fromMe ? 'open' : (!isGroup && useBotForInstance ? 'bot' : 'pending'),
      }
    });
    if (io) io.to(tenant.id).emit('new_ticket', ticket);
  } else if (ticket.instanceId !== waInstance.id) {
    ticket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { instanceId: waInstance.id, updatedAt: new Date() }
    });
  }

  if (ticket.status === 'resolved') {
    // Se o ticket já existia mas estava resolvido, REABRE ele para evitar duplicação na lista
    const useBotForInstance = shouldUseBotForInstance(instance, tenant.settings);
    ticket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: !isGroup && useBotForInstance ? 'bot' : 'pending', updatedAt: new Date(), lastMessageAt: new Date(), unreadCount: { increment: 1 } }
    });
    if (io) io.to(tenant.id).emit('ticket_updated', ticket);
    console.log(`[webhook] Ticket ${ticket.id} reaberto para evitar duplicação.`);
  } else if (!fromMe) {
    // Incrementa unreadCount para mensagens de clientes em tickets já abertos
    const useBotForInstance = shouldUseBotForInstance(instance, tenant.settings);
    ticket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        unreadCount: { increment: 1 },
        updatedAt: new Date(),
        lastMessageAt: new Date(),
        ...(ticket.status === 'bot' && !useBotForInstance ? { status: 'pending' } : {}),
      }
    });
    if (io) io.to(tenant.id).emit('ticket_updated', ticket);
  } else {
    // Mensagem enviada pelo agente (ex: pelo celular)
    ticket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { updatedAt: new Date(), lastMessageAt: new Date() }
    });
    if (io) io.to(tenant.id).emit('ticket_updated', ticket);
  }

  const message = await prisma.message.create({
    data: {
      ticketId: ticket.id,
      body: body || media?.caption || '',
      fromMe,
      fromBot: false,
      mediaType: media?.type || null,
      ...(media ? { mediaStatus: 'pending' } : {}),
      fileName: media?.fileName || null,
      externalId,
      quotedMsgId,
      quotedMsgBody
    },
  });

  if (fromMe && ticket.status !== 'open') {
    const isBotMsg = await prisma.message.findFirst({
      where: { externalId, fromBot: true }
    });

    if (!isBotMsg) {
      ticket = await prisma.ticket.update({
        where: { id: ticket.id },
        data: { status: 'open' }
      });
    }
  }

  const useBotForInstance = shouldUseBotForInstance(instance, tenant.settings);

  // --- Lógica de Horário de Atendimento ---
  if (!isHistorical) {
    const isWorking = await businessHourService.isWithinBusinessHours(tenant.id);
    if (!isGroup && !isWorking && !fromMe && tenant.settings?.outOfOfficeMessage) {
       const lastOooEvent = await prisma.ticketEvent.findFirst({
         where: { ticketId: ticket.id, type: 'ooo_message' },
         orderBy: { createdAt: 'desc' }
       });
       
       const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
       if (!lastOooEvent || lastOooEvent.createdAt < fourHoursAgo) {
          await evolutionService.sendText(
            tenant.settings.evolutionUrl,
            tenant.settings.evolutionKey,
            instance,
            phone,
            tenant.settings.outOfOfficeMessage
          );
          await prisma.ticketEvent.create({
            data: { ticketId: ticket.id, tenantId: tenant.id, type: 'ooo_message' }
          });
       }
    }
  }

  // Download de mídia e Transcrição em background
  if (media) {
    downloadMedia(tenant.settings, instance, msg, message.id).then(async (mediaUrl) => {
      if (!mediaUrl) {
        await prisma.message.update({
          where: { id: message.id },
          data: { mediaStatus: 'failed' }
        });
        if (io) io.to(tenant.id).emit('message_updated', {
          ticket,
          message: { id: message.id, mediaStatus: 'failed' },
          contact
        });
        return;
      }

      let transcription = null;
      const fullPath = path.join(mediaPath, path.basename(mediaUrl));

      if (media.type === 'audio' && aiService.hasAiConfigured(tenant.settings)) {
        try {
          if (fs.existsSync(fullPath)) {
            const audioBase64 = (await fs.promises.readFile(fullPath)).toString('base64');
            const mimeType = mediaUrl.endsWith('.mp3') ? 'audio/mp3' : 'audio/ogg';
            transcription = await aiService.transcribeAudio(tenant.settings, audioBase64, mimeType);
          }
        } catch (err) { console.error('[transcription] erro:', err.message); }
      }

      if (media.type === 'image' && aiService.hasAiConfigured(tenant.settings)) {
        try {
          if (fs.existsSync(fullPath)) {
            const imgBase64 = (await fs.promises.readFile(fullPath)).toString('base64');
            const mimeType = mediaUrl.endsWith('.png') ? 'image/png' : 'image/jpeg';
            console.log('[vision] analisando imagem...');
            transcription = await aiService.analyzeImage(
              tenant.settings,
              imgBase64,
              mimeType,
              LEGAL_IMAGE_ANALYSIS_PROMPT
            );
            console.log('[vision] resultado:', transcription?.substring(0, 50));
          }
        } catch (err) { console.error('[vision] erro:', err.message); }
      }

      const updated = await prisma.message.update({
        where: { id: message.id },
        data: { 
          mediaUrl,
          mediaStatus: 'ok',
          transcription
        },
      });
      
      if (io) io.to(tenant.id).emit('message_updated', { ticket, message: updated, contact });

      if (!isHistorical && ticket.status === 'bot' && useBotForInstance && transcription) {
        if (pendingReplies[ticket.id]) clearTimeout(pendingReplies[ticket.id]);

        evolutionService.sendPresence(
          tenant.settings.evolutionUrl,
          tenant.settings.evolutionKey,
          waInstance.instanceName,
          contact.phone,
          { delay: BOT_TYPING_DURATION_MS }
        ).catch((err) => console.warn('[bot] Nao foi possivel exibir digitando para midia:', err.message));
        
        pendingReplies[ticket.id] = setTimeout(async () => {
          try {
            await handleBotReply(tenant, waInstance, ticket, contact, transcription, updated);
            delete pendingReplies[ticket.id];
          } catch (err) {
            console.error('[bot-media-debounce] erro:', err.message);
            await handoffAfterBotFailure(tenant, waInstance, ticket, contact).catch((handoffError) => {
              console.error('[bot-fallback] erro ao transferir atendimento:', handoffError.message);
            });
            delete pendingReplies[ticket.id];
          }
        }, BOT_REPLY_DEBOUNCE_MS);
      }
    }).catch(err => console.error('[webhook] erro ao processar mídia:', err.message));
  }

  if (io) {
    const freshTicket = await prisma.ticket.findUnique({ 
      where: { id: ticket.id },
      include: { contact: true, agent: { select: { name: true } }, instance: { select: { instanceName: true } } }
    });
    console.log(`[socket] emitindo new_message para tenant ${tenant.id} | Ticket: ${freshTicket.id} | Status: ${freshTicket.status}`);
    io.to(tenant.id).emit('new_message', { ticket: freshTicket, message, contact });
  } else {
    console.warn('[socket] aviso: objeto io não inicializado no webhookController');
  }

  if (!isHistorical && ticket.status === 'bot' && useBotForInstance && aiService.hasAiConfigured(tenant.settings) && !fromMe) {
    console.log(`[bot] Agrupando mensagens do ticket ${ticket.id} por ${BOT_REPLY_DEBOUNCE_MS}ms...`);
    if (pendingReplies[ticket.id]) {
      clearTimeout(pendingReplies[ticket.id]);
    }

    evolutionService.sendPresence(
      tenant.settings.evolutionUrl,
      tenant.settings.evolutionKey,
      waInstance.instanceName,
      contact.phone,
      { delay: BOT_TYPING_DURATION_MS }
    ).catch((err) => console.warn('[bot] Nao foi possivel exibir digitando:', err.message));

    pendingReplies[ticket.id] = setTimeout(async () => {
      try {
        console.log(`[bot] Executando resposta para ticket ${ticket.id}`);
        if (ticket.status === 'bot' && useBotForInstance && !fromMe && !media) {
          await handleBotReply(tenant, waInstance, ticket, contact, body, message);
        } else if (media?.type === 'image' || media?.type === 'audio') {
          console.log(`[bot] Mídia detectada, aguardando transcrição/visão para responder.`);
        }
        delete pendingReplies[ticket.id];
      } catch (err) {
        console.error('[bot-debounce] erro fatal:', err.message);

        // Erros temporários de API (sem créditos, rate limit, rede) — mantém o ticket em "bot"
        // para que a próxima mensagem dispare nova tentativa automaticamente.
        const isTemporaryApiError = (
          err.message?.includes('credits') ||
          err.message?.includes('rate limit') ||
          err.message?.includes('quota') ||
          err.message?.includes('ECONNREFUSED') ||
          err.message?.includes('ETIMEDOUT') ||
          err.message?.includes('socket hang up') ||
          err.status === 429 ||
          err.status === 503
        );

        if (isTemporaryApiError) {
          console.warn(`[bot-debounce] Erro temporário de API — ticket ${ticket.id} mantido em "bot" para retry automático.`);
        } else {
          await handoffAfterBotFailure(tenant, waInstance, ticket, contact).catch((handoffError) => {
            console.error('[bot-fallback] erro ao transferir atendimento:', handoffError.message);
          });
        }
        delete pendingReplies[ticket.id];
      }
    }, BOT_REPLY_DEBOUNCE_MS);
  } else if (ticket.status !== 'bot' && !fromMe) {
    console.log(`[bot] Ignorado: Ticket ${ticket.id} está com status "${ticket.status}" (não é bot).`);
  }
}

async function handleWebhook(req, res) {
  res.sendStatus(200);

  try {
    const { event, instance, data } = req.body;
    const ev = String(event || '').toLowerCase();
    
    // Trata atualização de conexão e QR Code
    if (ev === 'connection.update' || ev === 'qrcode.updated') {
      const waInstance = await prisma.waInstance.findFirst({ where: { instanceName: instance } });
      if (waInstance) {
        if (io) io.to(waInstance.tenantId).emit('connection_update', { instance, event, data });
        
        // Atualiza status e telefone se disponível no evento de conexão
        const isConnected = ev === 'connection.update' && data?.state === 'open';
        const shouldConfirmDisconnect = ev === 'connection.update' && (data?.state === 'close' || data?.state === 'connecting');
        let phone = waInstance.phone;
        const owner = data?.owner || data?.ownerJid;
        if (owner && typeof owner === 'string') {
          phone = owner.split('@')[0];
        }

        if (isConnected) {
          clearPendingConnectionCheck(instance);
        } else if (shouldConfirmDisconnect) {
          scheduleDisconnectConfirmation(instance, waInstance.id);
        }

        const updatedInstance = await prisma.waInstance.update({
          where: { id: waInstance.id },
          data: { 
            status: isConnected ? 'connected' : waInstance.status,
            ...(phone && { phone })
          }
        });
        
        // Se a conexão foi estabelecida (reconexão), dispara rotina de sincronização de mensagens perdidas (em background)
        if (isConnected && waInstance.status === 'disconnected') {
          const { syncMissedMessages } = require('../services/syncMissedMessagesService');
          syncMissedMessages(instance).catch(e => console.error('[webhook] Falha no sync automático:', e.message));
        }
        
        // Se a conexão caiu, avisa o admin
        if (shouldConfirmDisconnect) {
          console.log(`[webhook] ${instance} reportou ${data?.state}; confirmando em ${DISCONNECT_CONFIRMATION_MS}ms antes de marcar como desconectado.`);
        }
      }
      return;
    }

    // Trata exclusão de mensagens
    if (ev === 'messages.delete' || ev === 'messages.update') {
      const key = data?.key || data?.message?.key || data;
      if (key?.id) {
        const msgToUpdate = await prisma.message.findFirst({
          where: { externalId: key.id },
          include: { ticket: true }
        });
        
        if (msgToUpdate) {
          const updated = await prisma.message.update({
            where: { id: msgToUpdate.id },
            data: { isDeleted: true }
          });
          if (io) io.to(msgToUpdate.ticket.tenantId).emit('message_updated', { message: updated });
        }
      }
      return;
    }

    if (ev !== 'messages.upsert' && ev !== 'messages.set') return;

    const messages = Array.isArray(data?.messages) ? data.messages : (data ? [data] : []);
    if (messages.length === 0) return;

    const waInstance = await prisma.waInstance.findFirst({ where: { instanceName: instance } });
    if (!waInstance) return;

    const tenant = await prisma.tenant.findUnique({
      where: { id: waInstance.tenantId },
      include: { settings: true },
    });
    if (!tenant) return;

    const maxAgeMs = 2 * 24 * 60 * 60 * 1000; // 2 dias (48 horas)

    for (const msg of messages) {
      const msgTimeSec = msg.messageTimestamp || msg.key?.messageTimestamp || null;
      const msgTimeMs = msgTimeSec ? (parseInt(msgTimeSec) * 1000) : Date.now();
      const ageMs = Date.now() - msgTimeMs;

      const isForwarded = JSON.stringify(msg.message || {}).includes('"isForwarded":true');

      // Ignora mensagens muito antigas (mais de 2 dias), para recuperar apenas o período offline curto
      // MAS não ignora se for uma mensagem encaminhada (isForwarded), pois ela pode carregar o timestamp original
      if (ageMs > maxAgeMs && !isForwarded) {
        console.log(`[webhook] Ignorando mensagem histórica antiga ${msg.key?.id || 'sem-id'} (idade: ${Math.round(ageMs / (1000 * 60 * 60))} horas, limite de 48h).`);
        continue;
      }

      // Se o evento for messages.set ou a mensagem tiver mais de 5 minutos, é considerada histórica
      const isHistorical = ev === 'messages.set' || ageMs > 5 * 60 * 1000;
      await processSingleMessage(msg, instance, waInstance, tenant, isHistorical);
    }
  } catch (err) {
    console.error('[webhook] erro:', err.message);
  }
}

const pendingReplies = {};

// Se o provedor de IA falhar (sem créditos, timeout ou indisponibilidade), o
// atendimento não pode ficar preso no modo robô. Abrimos a conversa para a
// equipe humana e avisamos o cliente sem expor detalhes técnicos do erro.
async function handoffAfterBotFailure(tenant, waInstance, ticket, contact) {
  const fallbackMessage = 'No momento não consegui concluir sua resposta automaticamente. Sua mensagem foi encaminhada para nossa equipe, que continuará o atendimento.';
  let sent;

  try {
    sent = await evolutionService.sendText(
      tenant.settings?.evolutionUrl,
      tenant.settings?.evolutionKey,
      waInstance.instanceName,
      contact.phone,
      fallbackMessage
    );
  } catch (sendError) {
    console.error('[bot-fallback] não foi possível avisar o cliente:', sendError.message);
  }

  const updatedTicket = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: 'open', updatedAt: new Date(), lastMessageAt: new Date() },
    include: { contact: true, agent: { select: { name: true } }, instance: { select: { instanceName: true } } },
  });

  await prisma.ticketEvent.create({
    data: {
      ticketId: ticket.id,
      tenantId: tenant.id,
      type: 'bot_error_handoff',
      payload: JSON.stringify({ reason: 'provider_unavailable', notified: Boolean(sent) }),
    },
  });

  if (sent) {
    const fallbackMessageRecord = await prisma.message.create({
      data: {
        ticketId: ticket.id,
        body: fallbackMessage,
        fromMe: true,
        fromBot: true,
        externalId: sent?.key?.id || sent?.id,
      },
    });
    if (io) io.to(tenant.id).emit('new_message', {
      ticket: updatedTicket,
      message: fallbackMessageRecord,
      contact: updatedTicket.contact,
    });
  }

  if (io) io.to(tenant.id).emit('ticket_updated', {
    ticketId: ticket.id,
    status: 'open',
    reason: 'bot_error_handoff',
  });
}

async function handoffAtCustomerRequest(tenant, waInstance, ticket, contact, options = {}) {
  const {
    reply = 'Claro! Vou encaminhar você para nossa equipe.',
    priority = null,
    eventType = 'customer_requested_handoff',
  } = options;
  const teams = await getTeamsCached(tenant.id);
  const targetTeam = teams.find((team) => team.name.toLowerCase().includes('atendimento'));
  const sent = await evolutionService.sendText(
    tenant.settings?.evolutionUrl,
    tenant.settings?.evolutionKey,
    waInstance.instanceName,
    contact.phone,
    reply
  );

  const updatedTicket = await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      status: 'pending',
      teamId: targetTeam?.id,
      ...(priority ? { priority } : {}),
      updatedAt: new Date(),
      lastMessageAt: new Date(),
    },
    include: { contact: true, agent: { select: { name: true } }, instance: { select: { instanceName: true } } },
  });

  const message = await prisma.message.create({
    data: {
      ticketId: ticket.id,
      body: reply,
      fromMe: true,
      fromBot: true,
      externalId: sent?.key?.id || sent?.id,
    },
  });

  await prisma.ticketEvent.create({
    data: {
      ticketId: ticket.id,
      tenantId: tenant.id,
      type: eventType,
      payload: JSON.stringify({ teamId: targetTeam?.id || null, priority }),
    },
  });

  if (io) {
    io.to(tenant.id).emit('new_message', { ticket: updatedTicket, message, contact: updatedTicket.contact });
    io.to(tenant.id).emit('ticket_updated', { ticketId: ticket.id, status: 'pending' });
  }
}

async function handleAutoTagging(tenant, ticket, contact) {
  try {
    const history = await prisma.message.findMany({
      where: { ticketId: ticket.id },
      orderBy: { createdAt: 'asc' },
      take: 10
    });
    
    const tags = await aiService.generateTags(tenant.settings, history);
    if (tags.length > 0) {
      console.log(`[webhook] auto-tags para ${contact.phone}:`, tags);
      await prisma.contact.update({
        where: { id: contact.id },
        data: { tags: JSON.stringify(tags) }
      });
      if (io) io.to(tenant.id).emit('ticket_updated', { ticketId: ticket.id });
    }
  } catch (err) {
    console.error('[autoTagging] erro:', err.message);
  }
}

async function handleBotReply(tenant, waInstance, ticket, contact, userMessage, incomingMessage) {
  const settings = tenant.settings;
  const transferWord = settings.botTransferWord || 'humano';
  const currentNotes = contact.notes || '';
  const currentUserTurn = describeMessageForAi(incomingMessage, userMessage);

  if (isHumanHandoffRequest(currentUserTurn, transferWord)) {
    await handoffAtCustomerRequest(tenant, waInstance, ticket, contact);
    return;
  }

  // Gatilho de escalonamento imediato do roteiro: urgência, prisão, audiência
  // marcada ou prazo vencendo pulam a triagem inteira.
  if (isUrgentMessage(currentUserTurn)) {
    console.log(`[bot] Urgencia detectada no ticket ${ticket.id}; escalando sem triagem.`);
    await handoffAtCustomerRequest(tenant, waInstance, ticket, contact, {
      reply: 'Entendi que o seu caso é urgente. Vou encaminhar você agora para o nosso atendimento prioritário.',
      priority: 'high',
      eventType: 'bot_urgent_escalation',
    });
    return;
  }

  // 1. FILTRO DE PALAVRAS-CHAVE (ATALHO RÁPIDO)
  let autoCategory = null;
  const msgLower = currentUserTurn.toLowerCase();
  if (/banco|financi|juros|boleto|pagamento|cobran|d[ií]vida|contrato revisional/i.test(msgLower)) autoCategory = 'FINANCEIRO';

  // 2. MEMÓRIA DE LONGO PRAZO (Filtra mensagens de alucinação anteriores para não "viciar" a IA)
  const history = await prisma.message.findMany({
    where: { ticket: { contactId: contact.id }, id: { not: incomingMessage.id } },
    orderBy: { createdAt: 'desc' },
    take: 15, 
  });
  
  // Remove do histórico mensagens onde o robô deu as opções "1 - Chamados Técnico", etc.
  const cleanHistory = history.filter(m => {
    if (!m.fromBot) return true;
    const body = m.body.toLowerCase();
    if (body.includes('chamados técnico') || body.includes('opções que tenho disponíveis')) return false;
    return true;
  });

  const reversedHistory = normalizeHistoryForAi([...cleanHistory].reverse());

  // 3. SYSTEM PROMPT (Prioridade absoluta para o que o usuário escreveu no painel)
  const userPrompt = settings.botSystemPrompt || 'Você é um Assistente de Atendimento cordial.';

  // Fallback do roteiro: duas incompreensões seguidas encerram a triagem
  // automática e entregam a conversa ao time humano.
  if (hasReachedFallbackLimit(reversedHistory)) {
    console.log(`[bot] Limite de incompreensoes atingido no ticket ${ticket.id}; transferindo para humano.`);
    await handoffAtCustomerRequest(tenant, waInstance, ticket, contact, {
      reply: 'Para não tomar mais o seu tempo, vou encaminhar você para um de nossos atendentes.',
      eventType: 'bot_fallback_handoff',
    });
    return;
  }

  const nameConfirmedNow = hasConfirmedName(reversedHistory, currentUserTurn, contact.name);
  const mustAskNameNow = shouldAskNameForSubject(reversedHistory, currentUserTurn, contact.name);
  const currentTicketHasHistory = reversedHistory.some((historyMessage) => historyMessage.ticketId === ticket.id);

  const legalInstructions = buildLegalBotInstructions({
    currentUserTurn,
    history: reversedHistory,
    profileName: contact.name,
    source: contact.externalSource,
    tags: contact.tags,
    isOpeningTurn: !currentTicketHasHistory,
  });

  // Busca semântica de conhecimento
  let knowledgeContext = "";
  let topSimilarity = 0;
  let topContent = null;
  let found = false;

  // Na abertura a IA so faz a pergunta de perfil, entao consultar a base de
  // conhecimento seria gasto sem uso.
  if (currentTicketHasHistory && !mustAskNameNow && aiService.hasAiConfigured(settings) && shouldUseKnowledgeSearch(currentUserTurn)) {
    try {
      const userEmbedding = await aiService.getEmbedding(settings, currentUserTurn);
      if (userEmbedding) {
        const allKnowledges = await getKnowledgeCached(tenant.id);
        
        const relevant = allKnowledges.map(k => {
          let vec = null;
          try { vec = k.embedding; } catch(e) {}
          return { ...k, similarity: aiService.cosineSimilarity(userEmbedding, vec) };
        })
        .filter(k => k.similarity > 0.65)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);
        
        if (relevant.length > 0) {
          found = true;
          topSimilarity = relevant[0].similarity;
          topContent = relevant[0].answer;
          knowledgeContext = "\n\nUSE O SEGUINTE CONHECIMENTO DA EMPRESA:\n" + 
            relevant.map(k => `Dúvida: ${k.question}\nResposta: ${k.answer}`).join("\n---\n");
        }
      }
    } catch (err) { console.error('[bot] erro semântica:', err.message); }
  }


  const finalPrompt = `[COMANDO DE SISTEMA PRIORITÁRIO]:
Você deve seguir ESTRITAMENTE as regras abaixo. Ignore qualquer tendência de ser excessivamente prestativo. Seja CURTO, DIRETO e aja como um humano no WhatsApp.

${userPrompt}

---
[CONTEXTO DO CLIENTE]:
Nome de perfil do WhatsApp: ${contact.name || 'Nao informado'}
NOTAS ATUAIS:
${currentNotes}

${knowledgeContext}

${legalInstructions}`;

  console.log(`[bot] Ticket ${ticket.id} | Turno atual normalizado:\n${currentUserTurn}`);

  // A IA conduz TODOS os turnos, inclusive a saudacao inicial. As respostas
  // determinísticas do roteiro ficam apenas como rede de segurança para quando
  // o provedor de IA estiver fora do ar ou sem credito — assim o contato nunca
  // fica sem resposta no WhatsApp.
  let botReply;
  try {
    botReply = await aiService.chat(settings, finalPrompt, reversedHistory, currentUserTurn);
  } catch (error) {
    const fallbackReply = !currentTicketHasHistory
      ? buildInitialGreetingReply()
      : mustAskNameNow
        ? buildInitialSubjectReply(currentUserTurn)
        : null;

    if (!fallbackReply) throw error;

    botReply = fallbackReply;
    console.error(`[bot] IA indisponivel no ticket ${ticket.id} (${error.message}); usando resposta do roteiro como fallback.`);
  }

  // EXTRAÇÃO DE MEMÓRIA DE LONGO PRAZO (Background Task)
  if (shouldExtractClientMemory(currentUserTurn) || nameConfirmedNow) {
    const extractionHistory = [...reversedHistory, { fromMe: false, body: currentUserTurn }];
    aiService.extractClientInfo(settings, extractionHistory, contact.notes)
      .then(async (result) => {
        if (result) {
          const updateData = {};
          const normalizedNotes = normalizeClientNotes(result.notes);
          if (normalizedNotes) updateData.notes = normalizedNotes;
          
          // Se a IA extraiu o nome e o contato ainda não tinha um nome válido (ou era ponto/número/vazio), atualiza o nome no banco
          const isGenericName = !contact.name || contact.name === '.' || contact.name.trim() === '' || contact.name.includes('+') || contact.name.match(/^\d+$/);
          if (result.name && (nameConfirmedNow || isGenericName || contact.name.length < 3)) {
            updateData.name = result.name;
          }
          
          if (Object.keys(updateData).length > 0) {
            await prisma.contact.update({
              where: { id: contact.id },
              data: updateData
            });
            if (io) io.to(tenant.id).emit('contact_updated', { contactId: contact.id });
          }
        }
      })
      .catch(err => console.error('[webhook] erro na extração de memória:', err.message));
  }

  // 4. LÓGICA DE ROTEAMENTO E SALVAMENTO
  const routeMatch = botReply.match(/\[\[ROUTE:\s*(.*?)\]\]/);
  const shouldHandoff = /\[\[HANDOFF\]\]/i.test(botReply);
  const category = autoCategory || (routeMatch ? routeMatch[1].toUpperCase() : 'ATENDIMENTO');
  
  const cleanBotReply = sanitizeBotReply(botReply);
  botReply = shouldHandoff
    ? 'Perfeito! Vou encaminhar você ao setor especializado.'
    : limitReplyToOneQuestion(replaceFarewellWithSpecialistHandoff(cleanBotReply));

  // Durante a triagem, identifica o robô. No encaminhamento, envia somente a frase oficial.
  const botName = settings.botName || 'ROBÔ';
  const finalMessageBody = shouldHandoff ? botReply : `*${botName}*\n${botReply}`;

  // Executa o Roteamento
  const teams = await getTeamsCached(tenant.id);
  let targetTeam = null;

  if (category === 'FINANCEIRO') targetTeam = teams.find(t => t.name.toLowerCase().includes('financeiro'));
  else targetTeam = teams.find(t => t.name.toLowerCase().includes('atendimento'));

  await prisma.ticket.update({
    where: { id: ticket.id },
    data: { 
      teamId: targetTeam?.id,
      priority: 'medium',
      ...(shouldHandoff ? { status: 'pending' } : {}),
    }
  });

  if (shouldHandoff) {
    await prisma.ticketEvent.create({
      data: {
        ticketId: ticket.id,
        tenantId: tenant.id,
        type: 'bot_triage_handoff',
        payload: JSON.stringify({ category, teamId: targetTeam?.id || null }),
      },
    });
  }

  // Atualização de tags automáticas DESATIVADA
  /*
  let currentTags = [];
  try { currentTags = JSON.parse(contact.tags || '[]'); } catch(e) {}
  if (!currentTags.includes(category)) {
    await prisma.contact.update({
      where: { id: contact.id },
      data: { tags: JSON.stringify([...currentTags, category]) }
    });
  }
  */

  // Auditoria
  try {
    await prisma.knowledgeLog.create({
      data: {
        tenantId: tenant.id,
        query: currentUserTurn,
        content: topContent,
        similarity: topSimilarity,
        found
      }
    });
  } catch (err) { console.error('[log] erro ao gravar auditoria:', err.message); }

  const sent = await evolutionService.sendText(settings.evolutionUrl, settings.evolutionKey, waInstance.instanceName, contact.phone, finalMessageBody);
  const externalId = sent?.key?.id || sent?.id;

  const botMessage = await prisma.message.create({
    data: { 
      ticketId: ticket.id, 
      body: botReply, 
      fromMe: true, 
      fromBot: true,
      externalId // Guardamos o ID para saber que FOI O ROBÔ que mandou
    },
  });

  // Notifica o painel em tempo real sobre a nova mensagem do robô
  if (io) {
    const freshTicket = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      include: { contact: true }
    });
    io.to(tenant.id).emit('new_message', { ticket: freshTicket, message: botMessage, contact });
    io.to(tenant.id).emit('ticket_updated', { ticketId: ticket.id, ...(shouldHandoff ? { status: 'pending' } : {}) });
  }
}

module.exports = { handleWebhook, setIo, processSingleMessage };
