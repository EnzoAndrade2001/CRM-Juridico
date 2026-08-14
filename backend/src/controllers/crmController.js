const prisma = require('../lib/prisma');

const HISTORY_DEFAULT_LIMIT = 25;
const HISTORY_MAX_LIMIT = 100;

function text(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function first(...values) {
  for (const value of values) {
    const normalized = text(value);
    if (normalized) return normalized;
  }
  return null;
}

function rawValue(payload, ...keys) {
  const raw = payload?.raw && typeof payload.raw === 'object' ? payload.raw : {};
  for (const key of keys) {
    const value = payload?.[key] ?? raw[key] ?? raw[key.toLowerCase()] ?? raw[key.toUpperCase()];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return null;
}

function asNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value === undefined || value === null || value === '') return null;
  const input = String(value).trim();
  const normalized = input.includes(',') ? input.replace(/\./g, '').replace(',', '.') : input;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function asDate(value, timeValue) {
  if (!value) return null;
  const input = String(value).trim();
  const timeMatch = timeValue && String(timeValue).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  const time = timeMatch
    ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}:${timeMatch[3] || '00'}`
    : null;
  const brazilian = input.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (brazilian) {
    const [, dd, mm, yyyy, matchedHour, matchedMinute, matchedSecond] = brazilian;
    const [hh, mi, ss] = time
      ? time.split(':')
      : [matchedHour || '00', matchedMinute || '00', matchedSecond || '00'];
    const parsed = new Date(`${yyyy}-${mm}-${dd}T${hh.padStart(2, '0')}:${mi}:${ss}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }
  const isoDay = input.match(/^(\d{4}-\d{2}-\d{2})(?:T00:00:00(?:\.\d+)?(?:Z)?)?$/);
  const isoDate = isoDay && time ? `${isoDay[1]}T${time}` : input;
  const parsed = new Date(isoDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function contractIsActive(status, endsAt) {
  const normalized = String(status || '').trim().toUpperCase();
  if (['C', 'I', 'N', 'CANCELADO', 'INATIVO', 'ENCERRADO', 'FINALIZADO'].includes(normalized)) return false;
  if (endsAt && new Date(endsAt).getTime() < Date.now()) return false;
  return ['G', 'A', 'S', 'ATIVO', 'VIGENTE'].includes(normalized) || !normalized;
}

function normalizeContract(record) {
  const payload = record?.payload || record || {};
  const startsAt = asDate(rawValue(payload, 'startsAt', 'dtcontratoini'));
  const endsAt = asDate(rawValue(payload, 'endsAt', 'dtcontratofin'));
  const status = first(rawValue(payload, 'status'));
  const totalValue = asNumber(rawValue(payload, 'totalValue', 'valor_total_contrato', 'valortotal_contrato')) || 0;
  const fixedValue = asNumber(rawValue(payload, 'fixedValue', 'tr_vl_fixo')) || 0;
  const franchiseValue = asNumber(rawValue(payload, 'franchiseValue', 'valor_franquia', 'valfranquia')) || 0;
  const informedMonthlyValue = asNumber(rawValue(payload, 'monthlyValue'));
  const monthlyValue = informedMonthlyValue ?? (fixedValue + franchiseValue);
  return {
    id: record?.id || null,
    externalId: first(record?.externalId, rawValue(payload, 'externalId', 'seqcontrato')),
    number: first(rawValue(payload, 'contractNumber', 'nrcontrato')),
    clientExternalId: first(rawValue(payload, 'clientExternalId', 'cdcliente')),
    type: first(rawValue(payload, 'contractType', 'nmcontratotp', 'tipocontrato')),
    typeCode: first(rawValue(payload, 'contractTypeCode', 'cdcontratotp', 'tipocontrato')),
    status,
    isActive: contractIsActive(status, endsAt),
    value: monthlyValue || asNumber(rawValue(payload, 'value')) || totalValue,
    monthlyValue,
    fixedValue,
    franchiseValue,
    totalValue,
    equipmentCount: asNumber(rawValue(payload, 'equipmentCount', 'qt_equipamentos')) || 0,
    startsAt,
    endsAt,
    updatedAt: asDate(rawValue(payload, 'updatedAt', 'atualizado')) || record?.syncedAt || record?.receivedAt || null,
    source: 'firebird',
  };
}

function normalizeOrderStatus(status, closedAt, closing) {
  const value = String(status || '').trim().toUpperCase();
  if (closedAt || ['O', 'F', 'C', 'FINALIZADA', 'FINALIZADO', 'CONCLUIDA', 'CONCLUÍDA', 'FECHADA'].includes(value)) {
    return 'FINALIZADA';
  }
  // Alguns snapshots antigos nao trazem STATUS; nesse caso, uma descricao de
  // fechamento ainda e o melhor indicio disponivel. Com STATUS presente, ele
  // prevalece para nao confundir anotacao tecnica com encerramento.
  if (!value && closing) return 'FINALIZADA';
  if (value.includes('AGUARD')) return 'AGUARDANDO_RETORNO';
  if (value.includes('ATEND')) return 'EM_ATENDIMENTO';
  return 'PENDENTE';
}

function normalizeExternalOrder(payload, fallback = {}) {
  const source = payload?.serviceOrder && typeof payload.serviceOrder === 'object'
    ? payload.serviceOrder
    : payload || {};
  const equipment = payload?.equipment || {};
  const osType = payload?.osType || {};
  const openedAt = asDate(
    rawValue(source, 'createdAt', 'dtinclusao'),
    rawValue(source, 'time', 'hrinclusao')
  ) || asDate(rawValue(source, 'updatedAt'));
  const attendedAt = asDate(rawValue(source, 'resolvedAt', 'dtatendimento'), rawValue(source, 'hratendimento'));
  const closedAt = asDate(rawValue(source, 'closedAt', 'dtfechamento'));
  // `observacao` dos lotes antigos tambem recebeu o nome do tipo da O.S.; nao
  // deve ser tratado como fechamento. O fechamento real vem de OBSDEFEITOATS.
  const closing = first(
    source.closing,
    source.obsdefeitoats,
    source.raw?.obsdefeitoats,
    source.raw?.OBSDEFEITOATS
  );
  const rawStatus = first(rawValue(source, 'status', 'nmstatus'));
  return {
    id: null,
    externalId: first(fallback.externalId, rawValue(source, 'externalId', 'seqOs', 'seqos')),
    number: first(fallback.externalId, rawValue(source, 'externalId', 'seqOs', 'seqos')),
    clientExternalId: first(rawValue(source, 'clientExternalId', 'cdCliente', 'cdcliente')),
    equipmentExternalId: first(rawValue(source, 'equipmentExternalId', 'cdequipamento'), rawValue(equipment, 'cdequipamento')),
    equipmentModel: first(rawValue(source, 'equipmentModel', 'modeloe', 'modelo'), rawValue(equipment, 'modelo')),
    serialNumber: first(rawValue(source, 'serialNumber', 'serie'), rawValue(equipment, 'serie')),
    type: first(rawValue(source, 'osType', 'nmostp'), rawValue(osType, 'nmostp')),
    status: normalizeOrderStatus(rawStatus, closedAt, closing),
    statusLabel: rawStatus,
    defect: first(rawValue(source, 'defect', 'obsdefeitocli')),
    closing,
    technician: first(rawValue(source, 'nmSuporteT', 'nmsuportet', 'nmsuportel', 'technician')),
    attendant: first(rawValue(source, 'nmsuportea', 'attendant')),
    openedAt,
    attendedAt,
    closedAt,
    updatedAt: asDate(rawValue(source, 'updatedAt', 'atualizado')) || attendedAt || openedAt,
    source: fallback.source || 'firebird',
  };
}

function normalizeLocalOrder(order) {
  return {
    id: order.id,
    externalId: text(order.externalId),
    number: text(order.externalId),
    clientExternalId: text(order.contact?.externalId),
    equipmentExternalId: text(order.equipment?.externalId),
    equipmentModel: text(order.equipment?.model),
    serialNumber: text(order.equipment?.serialNumber),
    type: text(order.cdOstp),
    status: order.status,
    statusLabel: order.status,
    defect: text(order.defect),
    closing: text(order.technicalNotes),
    technician: text(order.closedBy?.name),
    attendant: text(order.user?.name),
    openedAt: order.createdAt,
    attendedAt: order.resolvedAt,
    closedAt: order.closedAt,
    updatedAt: order.updatedAt,
    source: order.externalSource || 'local',
  };
}

function orderTimestamp(order) {
  const value = order.closedAt || order.attendedAt || order.updatedAt || order.openedAt;
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function mergeOrders(...groups) {
  const merged = new Map();
  for (const order of groups.flat()) {
    if (!order) continue;
    const key = order.externalId ? `external:${order.externalId}` : `local:${order.id}`;
    const previous = merged.get(key);
    if (!previous || orderTimestamp(order) >= orderTimestamp(previous)) {
      merged.set(key, { ...previous, ...order });
    }
  }
  return [...merged.values()].sort((a, b) => orderTimestamp(b) - orderTimestamp(a));
}

async function findTenantCustomer(tenantId, id) {
  return prisma.crmCustomer.findFirst({
    where: { id, tenantId },
    include: {
      equipments: { orderBy: [{ isActive: 'desc' }, { model: 'asc' }] },
      whatsappContacts: {
        select: { id: true, phone: true, whatsapp: true, name: true, externalSource: true, createdAt: true },
      },
    },
  });
}

async function loadContracts(tenantId, customerExternalId) {
  if (!customerExternalId) return [];
  const records = await prisma.externalSyncRecord.findMany({
    where: {
      tenantId,
      source: 'firebird',
      entity: 'contracts',
      payload: { path: ['clientExternalId'], equals: String(customerExternalId) },
    },
    select: { id: true, externalId: true, payload: true, receivedAt: true, syncedAt: true },
    orderBy: { receivedAt: 'desc' },
  });
  return records.map(normalizeContract).sort((a, b) => Number(b.isActive) - Number(a.isActive));
}

async function loadCustomerOrders(tenantId, customer, limit) {
  const externalId = String(customer.externalId || '');
  const numericExternalId = /^\d+$/.test(externalId) ? Number(externalId) : null;
  const printClientFilters = [{ path: ['serviceOrder', 'cdcliente'], equals: externalId }];
  if (numericExternalId !== null) printClientFilters.push({ path: ['serviceOrder', 'cdcliente'], equals: numericExternalId });

  const [syncedRecords, printRecords, localOrders] = await Promise.all([
    externalId
      ? prisma.externalSyncRecord.findMany({
        where: {
          tenantId,
          source: 'firebird',
          entity: 'serviceOrders',
          payload: { path: ['clientExternalId'], equals: externalId },
        },
        select: { externalId: true, payload: true },
        orderBy: { receivedAt: 'desc' },
        take: limit,
      })
      : [],
    externalId
      ? prisma.externalSyncRecord.findMany({
        where: {
          tenantId,
          source: 'firebird',
          entity: 'osPrintData',
          OR: printClientFilters.map((payload) => ({ payload })),
        },
        select: { externalId: true, payload: true },
        orderBy: { receivedAt: 'desc' },
        take: limit,
      })
      : [],
    prisma.serviceOrder.findMany({
      where: {
        tenantId,
        contact: {
          is: {
            OR: [
              { crmCustomerId: customer.id },
              ...(externalId ? [{ externalSource: 'firebird', externalId }] : []),
            ],
          },
        },
      },
      include: {
        equipment: { select: { externalId: true, model: true, serialNumber: true } },
        contact: { select: { externalId: true } },
        user: { select: { name: true } },
        closedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
  ]);

  const synced = syncedRecords.map((record) => normalizeExternalOrder(record.payload, {
    externalId: record.externalId,
    source: 'firebird-sync',
  }));
  const snapshots = [];
  for (const record of printRecords) {
    snapshots.push(normalizeExternalOrder(record.payload, {
      externalId: record.externalId,
      source: 'firebird-snapshot',
    }));
    for (const historyItem of Array.isArray(record.payload?.history) ? record.payload.history : []) {
      snapshots.push(normalizeExternalOrder(historyItem, { source: 'firebird-history' }));
    }
  }

  return mergeOrders(synced, snapshots, localOrders.map(normalizeLocalOrder)).slice(0, limit);
}

async function getSummary(req, res) {
  const tenantId = req.user.tenantId;
  const [
    customers,
    equipments,
    linkedEquipments,
    activeEquipments,
    contractRecords,
    syncedServiceOrders,
    syncedOpenServiceOrders,
    localServiceOrders,
    localOpenServiceOrders,
    customerRevenue,
    settings,
  ] = await Promise.all([
    prisma.crmCustomer.count({ where: { tenantId } }),
    prisma.crmEquipment.count({ where: { tenantId } }),
    prisma.crmEquipment.count({ where: { tenantId, customerId: { not: null } } }),
    prisma.crmEquipment.count({ where: { tenantId, isActive: true } }),
    prisma.externalSyncRecord.findMany({
      where: { tenantId, source: 'firebird', entity: 'contracts' },
      select: { externalId: true, payload: true, syncedAt: true, receivedAt: true },
    }),
    prisma.externalSyncRecord.count({ where: { tenantId, source: 'firebird', entity: 'serviceOrders' } }),
    prisma.externalSyncRecord.count({
      where: {
        tenantId,
        source: 'firebird',
        entity: 'serviceOrders',
        OR: ['A', 'E', 'M', 'T', 'P'].map((status) => ({
          payload: { path: ['raw', 'status'], equals: status },
        })),
      },
    }),
    prisma.serviceOrder.count({ where: { tenantId } }),
    prisma.serviceOrder.count({ where: { tenantId, status: { not: 'FINALIZADA' } } }),
    prisma.crmCustomer.findMany({ where: { tenantId }, select: { raw: true } }),
    prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { firebirdLastSyncAt: true, firebirdLastSyncStatus: true, firebirdLastSyncError: true },
    }),
  ]);

  const contracts = contractRecords.map(normalizeContract);
  const customerMonthlyRevenue = customerRevenue.reduce((total, customer) => {
    return total + (asNumber(rawValue(customer.raw || {}, 'total_mensalidade')) || 0);
  }, 0);
  const contractMonthlyRevenue = contracts
    .filter((contract) => contract.isActive)
    .reduce((total, contract) => total + (contract.monthlyValue || contract.value || 0), 0);
  const monthlyRevenue = Math.max(customerMonthlyRevenue, contractMonthlyRevenue);

  res.json({
    // Campos antigos mantidos para compatibilidade.
    customers,
    equipments,
    linkedEquipments,
    activeEquipments,
    unlinkedEquipments: Math.max(0, equipments - linkedEquipments),
    contracts: {
      total: contracts.length,
      active: contracts.filter((contract) => contract.isActive).length,
      value: contracts.reduce((total, contract) => total + (contract.value || 0), 0),
    },
    serviceOrders: {
      synced: syncedServiceOrders,
      local: localServiceOrders,
      open: syncedServiceOrders ? syncedOpenServiceOrders : localOpenServiceOrders,
      closed: syncedServiceOrders
        ? Math.max(0, syncedServiceOrders - syncedOpenServiceOrders)
        : Math.max(0, localServiceOrders - localOpenServiceOrders),
    },
    monthlyRevenue,
    synchronization: {
      lastSyncAt: settings?.firebirdLastSyncAt || null,
      status: settings?.firebirdLastSyncStatus || 'idle',
      error: settings?.firebirdLastSyncError || null,
    },
  });
}

async function listCustomers(req, res) {
  const tenantId = req.user.tenantId;
  const q = String(req.query.q || '').trim();
  const take = Math.min(Number(req.query.limit || 100) || 100, 250);

  const where = { tenantId };
  if (q) {
    where.OR = [
      { externalId: { contains: q, mode: 'insensitive' } },
      { name: { contains: q, mode: 'insensitive' } },
      { fantasyName: { contains: q, mode: 'insensitive' } },
      { cpfCnpj: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q } },
      { address: { contains: q, mode: 'insensitive' } },
      { neighborhood: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } },
      {
        equipments: {
          some: {
            OR: [
              { model: { contains: q, mode: 'insensitive' } },
              { serialNumber: { contains: q, mode: 'insensitive' } },
              { assetTag: { contains: q, mode: 'insensitive' } },
              { address: { contains: q, mode: 'insensitive' } },
              { sector: { contains: q, mode: 'insensitive' } },
              { installLocation: { contains: q, mode: 'insensitive' } },
            ],
          },
        },
      },
    ];
  }

  const customers = await prisma.crmCustomer.findMany({
    where,
    orderBy: { name: 'asc' },
    take,
    include: {
      _count: { select: { equipments: true, whatsappContacts: true } },
      equipments: {
        orderBy: [{ isActive: 'desc' }, { model: 'asc' }],
        take: 8,
      },
    },
  });

  res.json(customers);
}

async function getCustomer(req, res) {
  const tenantId = req.user.tenantId;
  const customer = await findTenantCustomer(tenantId, req.params.id);
  if (!customer) return res.status(404).json({ error: 'Cliente CRM nao encontrado' });

  res.json({
    ...customer,
    operationalSummary: {
      equipments: customer.equipments.length,
      activeEquipments: customer.equipments.filter((equipment) => equipment.isActive).length,
      monthlyRevenue: asNumber(rawValue(customer.raw || {}, 'total_mensalidade')) || 0,
    },
  });
}

async function getCustomerContracts(req, res) {
  const customer = await prisma.crmCustomer.findFirst({
    where: { id: req.params.id, tenantId: req.user.tenantId },
    select: {
      externalId: true,
      raw: true,
      equipments: { select: { contractExternalId: true } },
    },
  });
  if (!customer) return res.status(404).json({ error: 'Cliente CRM nao encontrado' });
  const contracts = await loadContracts(req.user.tenantId, customer.externalId);
  const activeContracts = contracts.filter((contract) => contract.isActive);

  for (const contract of contracts) {
    const linkedCount = customer.equipments.filter((equipment) => (
      text(equipment.contractExternalId) === text(contract.externalId)
    )).length;
    if (linkedCount > contract.equipmentCount) contract.equipmentCount = linkedCount;
  }

  // Compatibilidade imediata com a base ja sincronizada: quando o cliente tem
  // um unico contrato ativo, o total_mensalidade do cadastro pertence a ele.
  if (activeContracts.length === 1) {
    const onlyContract = activeContracts[0];
    const customerMonthlyValue = asNumber(rawValue(customer.raw || {}, 'total_mensalidade')) || 0;
    if (!onlyContract.monthlyValue && customerMonthlyValue) {
      onlyContract.monthlyValue = customerMonthlyValue;
      onlyContract.value = customerMonthlyValue;
    }
    if (!onlyContract.equipmentCount) onlyContract.equipmentCount = customer.equipments.length;
  }
  res.json({ items: contracts, total: contracts.length, active: contracts.filter((item) => item.isActive).length });
}

async function getCustomerServiceOrders(req, res) {
  const customer = await findTenantCustomer(req.user.tenantId, req.params.id);
  if (!customer) return res.status(404).json({ error: 'Cliente CRM nao encontrado' });
  const limit = Math.min(Number(req.query.limit || HISTORY_DEFAULT_LIMIT) || HISTORY_DEFAULT_LIMIT, HISTORY_MAX_LIMIT);
  const orders = await loadCustomerOrders(req.user.tenantId, customer, limit);
  res.json({ items: orders, total: orders.length, limit });
}

async function listEquipments(req, res) {
  const tenantId = req.user.tenantId;
  const q = String(req.query.q || '').trim();
  const take = Math.min(Number(req.query.limit || 100) || 100, 250);

  const where = { tenantId };
  if (q) {
    where.OR = [
      { externalId: { contains: q, mode: 'insensitive' } },
      { model: { contains: q, mode: 'insensitive' } },
      { manufacturer: { contains: q, mode: 'insensitive' } },
      { serialNumber: { contains: q, mode: 'insensitive' } },
      { assetTag: { contains: q, mode: 'insensitive' } },
      { sector: { contains: q, mode: 'insensitive' } },
      { installLocation: { contains: q, mode: 'insensitive' } },
      { address: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } },
      { contractExternalId: { contains: q, mode: 'insensitive' } },
      { customer: { name: { contains: q, mode: 'insensitive' } } },
      { customer: { fantasyName: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const equipments = await prisma.crmEquipment.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take,
    include: {
      customer: {
        select: { id: true, externalId: true, name: true, fantasyName: true, cpfCnpj: true, phone: true },
      },
    },
  });

  res.json(equipments);
}

module.exports = {
  getSummary,
  listCustomers,
  getCustomer,
  getCustomerContracts,
  getCustomerServiceOrders,
  listEquipments,
};
