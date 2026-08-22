/**
 * legalProcessMonitorService.js — Monitoramento automático de movimentação processual
 *
 * Para cada caso jurídico ativo com número de processo cadastrado, consulta o
 * DataJud (API pública do CNJ) e compara com a última movimentação conhecida.
 * Quando há movimentação nova, registra no histórico do caso (LegalActivity)
 * e notifica o responsável em tempo real — reduz a necessidade de entrar
 * manualmente no site do tribunal para acompanhar cada processo.
 */
const prisma = require('../lib/prisma');
const dataJudService = require('./dataJudService');

const ACTIVE_STATUSES = ['TRIAGEM', 'ATIVO', 'SUSPENSO'];
const REQUEST_INTERVAL_MS = 400; // espaçamento entre chamadas para não sobrecarregar a API pública

let io = null;
function setIo(socketIo) {
  io = socketIo;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Verifica um único caso e atualiza seu estado de monitoramento.
 * Usada tanto pelo cron diário quanto por uma checagem manual sob demanda.
 */
async function checkMatter(matter) {
  const alias = matter.courtAlias || dataJudService.resolveAlias(matter.caseNumber);

  if (!alias) {
    await prisma.legalMatter.update({
      where: { id: matter.id },
      data: {
        dataJudCheckedAt: new Date(),
        dataJudError: 'Não foi possível identificar o tribunal automaticamente. Informe o campo "Tribunal (DataJud)" manualmente.',
      },
    });
    return { ok: false, reason: 'alias_not_resolved' };
  }

  let source;
  try {
    source = await dataJudService.fetchProcess(matter.caseNumber, alias);
  } catch (err) {
    await prisma.legalMatter.update({
      where: { id: matter.id },
      data: { dataJudCheckedAt: new Date(), dataJudError: String(err.message || err).slice(0, 300) },
    });
    return { ok: false, reason: 'fetch_error', error: err.message };
  }

  if (!source) {
    await prisma.legalMatter.update({
      where: { id: matter.id },
      data: { dataJudCheckedAt: new Date(), dataJudError: 'Processo não localizado no tribunal informado.' },
    });
    return { ok: false, reason: 'not_found' };
  }

  const movements = dataJudService.extractMovements(source);
  const latest = movements[movements.length - 1] || null;
  const isFirstCheck = !matter.lastMovementAt;
  const newMovements = isFirstCheck
    ? []
    : movements.filter((movement) => new Date(movement.date) > new Date(matter.lastMovementAt));

  await prisma.$transaction(async (tx) => {
    await tx.legalMatter.update({
      where: { id: matter.id },
      data: {
        dataJudCheckedAt: new Date(),
        dataJudError: null,
        ...(latest && { lastMovementAt: new Date(latest.date), lastMovementCode: latest.code ?? null }),
      },
    });

    if (isFirstCheck && latest) {
      await tx.legalActivity.create({
        data: {
          tenantId: matter.tenantId,
          entityType: 'matter',
          entityId: matter.id,
          type: 'matter.monitoring_started',
          payload: { totalMovimentos: movements.length, ultimoMovimento: latest.name },
        },
      });
    }

    // Cap defensivo: evita centenas de registros caso um caso antigo seja
    // recadastrado com lastMovementAt nulo por engano.
    for (const movement of newMovements.slice(-20)) {
      await tx.legalActivity.create({
        data: {
          tenantId: matter.tenantId,
          entityType: 'matter',
          entityId: matter.id,
          type: 'matter.movement',
          payload: { name: movement.name, code: movement.code, date: movement.date, complement: movement.complement },
        },
      });
    }
  });

  if (newMovements.length && io) {
    const payload = {
      matterId: matter.id,
      matterTitle: matter.title,
      caseNumber: matter.caseNumber,
      count: newMovements.length,
      latest: newMovements[newMovements.length - 1],
    };
    if (matter.responsibleUserId) {
      io.to(`user:${matter.responsibleUserId}`).emit('legal_process_movement', payload);
    } else {
      io.to(matter.tenantId).emit('legal_process_movement', payload);
    }
  }

  return { ok: true, newMovements: newMovements.length, totalMovements: movements.length };
}

/**
 * Roda a checagem em todos os casos ativos com número de processo cadastrado.
 * Espaça as chamadas para não sobrecarregar a API pública do CNJ.
 */
async function processActiveMatters() {
  if (!process.env.DATAJUD_API_KEY) {
    console.warn('[legal-datajud] DATAJUD_API_KEY não configurada — monitoramento de processos desativado.');
    return;
  }

  try {
    const matters = await prisma.legalMatter.findMany({
      where: { status: { in: ACTIVE_STATUSES }, caseNumber: { not: null } },
    });

    if (!matters.length) return;
    console.log(`[legal-datajud] verificando movimentação de ${matters.length} caso(s)...`);

    let notified = 0;
    let failed = 0;
    for (const matter of matters) {
      try {
        const result = await checkMatter(matter);
        if (!result.ok) failed += 1;
        else if (result.newMovements > 0) notified += 1;
      } catch (err) {
        failed += 1;
        console.error(`[legal-datajud] erro ao verificar caso ${matter.id}:`, err.message);
      }
      await sleep(REQUEST_INTERVAL_MS);
    }
    console.log(`[legal-datajud] concluído: ${notified} caso(s) com movimentação nova, ${failed} falha(s).`);
  } catch (err) {
    console.error('[legal-datajud] erro geral:', err.message);
  }
}

module.exports = { checkMatter, processActiveMatters, setIo };
