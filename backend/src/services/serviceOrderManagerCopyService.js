const prisma = require('../lib/prisma');
const evolution = require('./evolutionService');
const { generatePdfBuffer } = require('../controllers/osController');
const fs = require('fs');
const os = require('os');
const path = require('path');

function valueOrDash(value) {
  const normalized = String(value || '').trim();
  return normalized || '-';
}

function buildManagerMessage(order, osType) {
  const customerName = order.contact?.crmCustomer?.name || order.contact?.name;
  const equipment = [order.equipment?.manufacturer, order.equipment?.model].filter(Boolean).join(' ');
  const location = [order.equipment?.address, order.equipment?.sector].filter(Boolean).join(' - ');
  const openedAt = new Date(order.createdAt).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  });

  return [
    '📋 *NOVA O.S. ABERTA NO iLux*',
    '',
    `*Número:* ${valueOrDash(order.externalId)}`,
    `*Cliente:* ${valueOrDash(customerName)}`,
    `*Equipamento:* ${valueOrDash(equipment)}`,
    `*Série:* ${valueOrDash(order.equipment?.serialNumber)}`,
    `*Local:* ${valueOrDash(location)}`,
    `*Tipo:* ${valueOrDash(osType?.name || order.cdOstp)}`,
    `*Defeito relatado:* ${valueOrDash(order.defect)}`,
    `*Técnico:* ${valueOrDash(order.nmsuportet)}`,
    `*Aberta por:* ${valueOrDash(order.user?.name)}`,
    `*Data:* ${openedAt}`,
  ].join('\n');
}

function safePdfFilename(order) {
  const customerName = order.contact?.crmCustomer?.name || order.contact?.name || 'CLIENTE';
  const safeCustomer = String(customerName)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .slice(0, 80) || 'CLIENTE';
  return `OS ${valueOrDash(order.externalId)} - ${safeCustomer}.pdf`;
}

function brazilianPhoneCandidates(phone) {
  const normalized = evolution.normalizePhoneNumber(phone);
  const candidates = [normalized];

  // Cadastros brasileiros antigos podem estar sem o nono digito. A Evolution
  // pode reconhecer apenas uma das duas formas, dependendo do JID da conta.
  if (/^55\d{10}$/.test(normalized)) {
    candidates.push(`${normalized.slice(0, 4)}9${normalized.slice(4)}`);
  } else if (/^55\d{11}$/.test(normalized) && normalized[4] === '9') {
    candidates.push(`${normalized.slice(0, 4)}${normalized.slice(5)}`);
  }

  return [...new Set(candidates.filter(Boolean))];
}

function errorDetail(error) {
  const data = error?.response?.data;
  const detail = data?.response?.message || data?.message || data?.error;
  if (Array.isArray(detail)) return detail.map((item) => typeof item === 'object' ? JSON.stringify(item) : String(item)).join(', ');
  if (detail && typeof detail === 'object') return JSON.stringify(detail);
  return String(detail || error?.message || 'Erro desconhecido ao enviar o PDF.');
}

async function sendServiceOrderManagerCopy(tenantId, serviceOrderId, { force = false } = {}) {
  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId },
    select: {
      serviceOrderManagerCopyEnabled: true,
      serviceOrderManagerPhone: true,
      serviceOrderManagerInstanceId: true,
      evolutionUrl: true,
      evolutionKey: true,
    },
  });

  if (!force && !settings?.serviceOrderManagerCopyEnabled) return { skipped: 'disabled' };
  if (!settings.serviceOrderManagerPhone || !settings.serviceOrderManagerInstanceId) {
    return { skipped: 'incomplete-settings' };
  }

  const instance = await prisma.waInstance.findFirst({
    where: { id: settings.serviceOrderManagerInstanceId, tenantId },
    select: { id: true, instanceName: true },
  });
  if (!instance) throw new Error('Instância configurada para a cópia da O.S. não foi encontrada.');

  const evolutionUrl = settings.evolutionUrl || process.env.DEFAULT_EVOLUTION_URL;
  const evolutionKey = settings.evolutionKey || process.env.DEFAULT_EVOLUTION_KEY;
  if (!evolutionUrl || !evolutionKey) throw new Error('Evolution API não configurada para o tenant.');

  const claimedAt = new Date();
  const claim = await prisma.serviceOrder.updateMany({
    where: {
      id: serviceOrderId,
      tenantId,
      externalId: { not: null },
      ...(!force ? { managerCopySentAt: null } : {}),
    },
    data: { managerCopySentAt: claimedAt, managerCopyLastError: null },
  });
  if (!claim.count) return { skipped: 'already-sent' };

  try {
    const order = await prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, tenantId },
      include: {
        contact: { include: { crmCustomer: { select: { name: true } } } },
        equipment: true,
        user: { select: { name: true } },
      },
    });
    if (!order) throw new Error('O.S. confirmada não encontrada para envio ao gestor.');

    const osType = order.cdOstp
      ? await prisma.crmOsType.findFirst({
        where: { tenantId, code: String(order.cdOstp) },
        select: { name: true },
      })
      : null;

    const pdf = await generatePdfBuffer(tenantId, order.id);
    if (!pdf.buffer?.length) throw new Error('O PDF da O.S. foi gerado vazio.');

    const filename = safePdfFilename(order);
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'multi-os-'));
    const filePath = path.join(tempDir, filename);
    let lastError = null;
    let sentTo = null;

    try {
      await fs.promises.writeFile(filePath, pdf.buffer);
      const phoneCandidates = brazilianPhoneCandidates(settings.serviceOrderManagerPhone);
      for (const phone of phoneCandidates) {
        try {
          await evolution.sendMedia(
            evolutionUrl,
            evolutionKey,
            instance.instanceName,
            phone,
            {
              mediatype: 'document',
              media: pdf.buffer.toString('base64'),
              mimetype: 'application/pdf',
              filename,
              caption: buildManagerMessage(order, osType),
              filePath,
            },
          );
          sentTo = phone;
          break;
        } catch (sendError) {
          lastError = sendError;
          console.warn(`[serviceOrderManagerCopy] Falha ao tentar ${phone}: ${errorDetail(sendError)}`);
        }
      }
      if (!sentTo) throw lastError || new Error('Nenhum formato de telefone foi aceito pelo WhatsApp.');
    } finally {
      await fs.promises.unlink(filePath).catch(() => {});
      await fs.promises.rmdir(tempDir).catch(() => {});
    }

    console.log(`[serviceOrderManagerCopy] Cópia da O.S. ${order.externalId} enviada para ${sentTo} pela instância ${instance.instanceName}.`);
    return { sent: true, phone: sentTo, filename };
  } catch (error) {
    await prisma.serviceOrder.updateMany({
      where: { id: serviceOrderId, tenantId, managerCopySentAt: claimedAt },
      data: { managerCopySentAt: null, managerCopyLastError: errorDetail(error).slice(0, 2000) },
    });
    throw error;
  }
}

module.exports = { sendServiceOrderManagerCopy };
