const axios = require('axios');
const prisma = require('../lib/prisma');
const evolutionService = require('../services/evolutionService');

const recentRequests = new Map();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// As origens da captação são deliberadamente mantidas no backend. Assim, a
// landing page não consegue inventar uma campanha/tag e cada novo site pode
// ser incluído com uma mensagem própria e auditável.
const LANDING_SOURCES = Object.freeze({
  'revisional-bancario': Object.freeze({
    tag: 'VEIO PELA LANDING PAGE REVISAO BANCARIA',
    contactSource: 'landing:revisional-bancario',
    opening: 'Vi que você preencheu a calculadora de revisão bancária e quer entender melhor seus direitos.',
  }),
});

function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.ip || req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(req) {
  const key = clientIp(req);
  const now = Date.now();
  const previous = recentRequests.get(key) || 0;
  for (const [storedKey, timestamp] of recentRequests) {
    if (now - timestamp > 15 * 60 * 1000) recentRequests.delete(storedKey);
  }
  if (previous && now - previous < 30 * 1000) return true;
  recentRequests.set(key, now);
  return false;
}

function text(value, field, { required = false, max = 160 } = {}) {
  const normalized = String(value || '').trim();
  if (required && !normalized) throw new Error(`${field} é obrigatório`);
  if (normalized.length > max) throw new Error(`${field} excede o limite permitido`);
  return normalized || null;
}

function positiveNumber(value, field, { required = true, max = 100000000 } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    if (!required && (value === null || value === undefined || value === '')) return null;
    throw new Error(`${field} deve ser um valor positivo`);
  }
  if (parsed > max) throw new Error(`${field} excede o limite permitido`);
  return Math.round(parsed * 100) / 100;
}

function positiveInteger(value, field, { required = true, max = 600 } = {}) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || (required && parsed === 0)) {
    throw new Error(`${field} deve ser um número inteiro válido`);
  }
  if (parsed > max) throw new Error(`${field} excede o limite permitido`);
  return parsed;
}

function buildMessage(submission, landing) {
  return [
    `Olá, ${submission.name}. ${landing.opening}`,
    'Recebemos seus dados e nossa equipe fará a orientação inicial sobre o seu contrato.',
    '',
    `Parcela informada: ${formatCurrency(submission.installment)}`,
    `Estimativa de nova parcela: ${formatCurrency(submission.estimatedInstallment)}`,
    `Economia mensal estimada: ${formatCurrency(submission.monthlySavings)}`,
    '',
    'Essa é uma simulação inicial e não substitui a análise jurídica do contrato. Nossa equipe entrará em contato para orientar os próximos passos.',
  ].join('\n');
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function sendEmail(submission, message) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || !submission.email) return false;

  await axios.post('https://api.resend.com/emails', {
    from,
    to: [submission.email],
    subject: 'Resultado da sua simulação revisional',
    text: message,
    html: `<p>${escapeHtml(message).replace(/\n/g, '<br />')}</p>`,
  }, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    timeout: 10000,
  });
  return true;
}

function parseTags(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map((tag) => String(tag || '').trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function isConnectedInstance(instance) {
  return ['connected', 'open'].includes(String(instance?.status || '').toLowerCase());
}

async function ensureLandingTag(tenantId, landing) {
  const existing = await prisma.tag.findFirst({ where: { tenantId, name: landing.tag } });
  if (existing) return existing;
  return prisma.tag.create({
    data: { tenantId, name: landing.tag, color: '#C59B45' },
  });
}

async function upsertLandingContact(tenant, submission, landing, instance) {
  if (!submission.phone) return { contact: null, created: false };

  await ensureLandingTag(tenant.id, landing);
  const phoneCandidates = evolutionService.buildPhoneLookupCandidates(submission.phone);
  const existing = await prisma.contact.findFirst({
    where: {
      tenantId: tenant.id,
      OR: [
        { phone: { in: phoneCandidates } },
        { whatsapp: { in: phoneCandidates } },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });
  const tags = Array.from(new Set([...(parseTags(existing?.tags)), landing.tag]));
  const data = {
    tenantId: tenant.id,
    instanceId: instance?.id || existing?.instanceId || null,
    phone: submission.phone,
    whatsapp: submission.phone,
    name: submission.name,
    ...(submission.email ? { email: submission.email } : {}),
    externalSource: landing.contactSource,
    tags: JSON.stringify(tags),
  };

  if (existing) {
    const contact = await prisma.contact.update({
      where: { id: existing.id },
      data: {
        ...(data.instanceId ? { instanceId: data.instanceId } : {}),
        phone: data.phone,
        whatsapp: data.whatsapp,
        ...(data.name ? { name: data.name } : {}),
        ...(data.email ? { email: data.email } : {}),
        externalSource: data.externalSource,
        tags: data.tags,
      },
    });
    return { contact, created: false };
  }
  const contact = await prisma.contact.create({ data });
  return { contact, created: true };
}

async function sendWhatsApp(tenant, submission, message) {
  const settings = tenant.settings || {};
  const url = settings.evolutionUrl || process.env.DEFAULT_EVOLUTION_URL;
  const key = settings.evolutionKey || process.env.DEFAULT_EVOLUTION_KEY;
  const instance = tenant.instances?.find(isConnectedInstance);
  if (!url || !key || !instance || !submission.phone) return false;
  await evolutionService.sendText(url, key, instance.instanceName, submission.phone, message);
  return true;
}

async function resolveTenant() {
  const slug = process.env.PUBLIC_CALCULATOR_TENANT_SLUG || process.env.LEGAL_LANDING_TENANT_SLUG;
  if (!slug) return null;
  return prisma.tenant.findUnique({
    where: { slug },
    include: { settings: true, instances: true },
  });
}

async function createCalculatorSubmission(req, res) {
  if (checkRateLimit(req)) {
    res.set('Retry-After', '30');
    return res.status(429).json({ stored: false, error: 'Aguarde 30 segundos antes de enviar novamente.', retryAfterSeconds: 30 });
  }
  if (req.body?.website) return res.status(202).json({ stored: false, accepted: true });

  try {
    const name = text(req.body?.name, 'Nome', { required: true, max: 120 });
    const email = text(req.body?.email, 'E-mail', { max: 160 });
    const phoneRaw = text(req.body?.phone, 'WhatsApp', { max: 30 });
    const phone = phoneRaw ? evolutionService.normalizePhoneNumber(phoneRaw) : null;
    const financing = positiveNumber(req.body?.financing, 'Valor financiado', { required: false });
    const installment = positiveNumber(req.body?.installment, 'Valor da parcela');
    const totalInstallments = positiveInteger(req.body?.totalInstallments, 'Total de parcelas');
    const paidInstallments = positiveInteger(req.body?.paidInstallments || 0, 'Parcelas pagas', { required: false });
    const bank = text(req.body?.bank, 'Banco', { max: 120 });
    const contractType = text(req.body?.contractType, 'Tipo de contrato', { max: 80 });
    const source = text(req.body?.source || req.body?.landingSource, 'Origem da landing page', { required: true, max: 80 });
    const landing = LANDING_SOURCES[String(source).toLowerCase()];
    if (!landing) throw new Error('Origem da landing page não reconhecida');

    if (email && !EMAIL_PATTERN.test(email)) throw new Error('E-mail inválido');
    if (!email && !phone) throw new Error('Informe um WhatsApp ou e-mail');
    if (phone && (phone.length < 12 || phone.length > 13)) throw new Error('WhatsApp inválido');
    if (paidInstallments > totalInstallments) throw new Error('Parcelas pagas não podem superar o total');
    if (req.body?.consent !== true) throw new Error('Consentimento obrigatório');

    const estimatedInstallment = Math.round((installment / 2 + 7.5) * 100) / 100;
    const monthlySavings = Math.round(Math.max(0, installment - estimatedInstallment) * 100) / 100;
    const remainingInstallments = Math.max(0, totalInstallments - paidInstallments);
    const totalSavings = Math.round(monthlySavings * remainingInstallments * 100) / 100;
    const tenant = await resolveTenant();
    if (!tenant) return res.status(503).json({ stored: false, error: 'Tenant da landing page ainda não configurado.' });

    const submission = await prisma.calculatorSubmission.create({
      data: {
        tenantId: tenant.id,
        source: landing.contactSource,
        name,
        email: email ? email.toLowerCase() : null,
        phone,
        financing,
        installment,
        totalInstallments,
        paidInstallments,
        bank,
        contractType,
        estimatedInstallment,
        monthlySavings,
        totalSavings,
        remainingInstallments,
        consentEvidence: 'Consentimento concedido no formulário público da calculadora revisional.',
      },
    });

    const instance = tenant.instances?.find(isConnectedInstance);
    const contactResult = await upsertLandingContact(tenant, submission, landing, instance);

    const message = buildMessage(submission, landing);
    const notifications = { whatsapp: 'not_configured', email: 'not_configured' };
    const errors = [];
    const [whatsappResult, emailResult] = await Promise.allSettled([
      sendWhatsApp(tenant, submission, message),
      sendEmail(submission, message),
    ]);

    if (whatsappResult.status === 'fulfilled' && whatsappResult.value) notifications.whatsapp = 'sent';
    else if (whatsappResult.status === 'rejected') { notifications.whatsapp = 'failed'; errors.push(`WhatsApp: ${whatsappResult.reason?.message || 'falha'}`); }
    if (emailResult.status === 'fulfilled' && emailResult.value) notifications.email = 'sent';
    else if (emailResult.status === 'rejected') { notifications.email = 'failed'; errors.push(`E-mail: ${emailResult.reason?.message || 'falha'}`); }

    const sentCount = Object.values(notifications).filter((status) => status === 'sent').length;
    const updated = await prisma.calculatorSubmission.update({
      where: { id: submission.id },
      data: {
        status: sentCount === 2 ? 'sent' : sentCount === 1 ? 'partial' : 'pending',
        ...(notifications.whatsapp === 'sent' && { whatsappSentAt: new Date() }),
        ...(notifications.email === 'sent' && { emailSentAt: new Date() }),
        notificationError: errors.length ? errors.join(' | ') : null,
      },
    });

    return res.status(202).json({
      stored: true,
      submissionId: updated.id,
      source: landing.contactSource,
      tag: landing.tag,
      contactId: contactResult.contact?.id || null,
      contactCreated: contactResult.created,
      notifications,
    });
  } catch (error) {
    return res.status(400).json({ stored: false, error: error.message || 'Não foi possível registrar a simulação.' });
  }
}

module.exports = { createCalculatorSubmission };
