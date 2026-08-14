const prisma = require('../lib/prisma');
const evolution = require('./evolutionService');
const { generatePdfBuffer } = require('../controllers/osController');

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

async function sendServiceOrderManagerCopy(tenantId, serviceOrderId) {
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

  if (!settings?.serviceOrderManagerCopyEnabled) return { skipped: 'disabled' };
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
    where: { id: serviceOrderId, tenantId, externalId: { not: null }, managerCopySentAt: null },
    data: { managerCopySentAt: claimedAt },
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
    await evolution.sendMedia(
      evolutionUrl,
      evolutionKey,
      instance.instanceName,
      evolution.normalizePhoneNumber(settings.serviceOrderManagerPhone),
      {
        mediatype: 'document',
        media: pdf.buffer.toString('base64'),
        mimetype: 'application/pdf',
        filename: pdf.filename,
        caption: buildManagerMessage(order, osType),
      },
    );

    console.log(`[serviceOrderManagerCopy] Cópia da O.S. ${order.externalId} enviada pela instância ${instance.instanceName}.`);
    return { sent: true };
  } catch (error) {
    await prisma.serviceOrder.updateMany({
      where: { id: serviceOrderId, tenantId, managerCopySentAt: claimedAt },
      data: { managerCopySentAt: null },
    });
    throw error;
  }
}

module.exports = { sendServiceOrderManagerCopy };
