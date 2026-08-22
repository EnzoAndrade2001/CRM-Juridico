/**
 * legalTaskReminderService.js — Alertas de prazo processual
 *
 * Tarefas jurídicas (LegalTask) têm prioridade e data de vencimento (dueAt),
 * mas nada monitorava esse prazo em tempo real — um prazo perdido é o pior
 * cenário possível para um escritório. Este serviço roda periodicamente,
 * calcula o estágio de urgência de cada tarefa pendente e notifica o
 * responsável (ou o tenant inteiro, se não houver responsável definido)
 * assim que ela cruza um novo estágio.
 *
 * Estágios (do menos ao mais urgente): D3 (vence em até 3 dias),
 * D1 (vence em até 24h), OVERDUE (prazo já vencido). O estágio já
 * disparado fica gravado em `lastReminderStage` para não repetir o mesmo
 * alerta a cada execução — só notifica de novo quando o prazo piora.
 */
const prisma = require('../lib/prisma');

const STAGE_ORDER = { D3: 1, D1: 2, OVERDUE: 3 };
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

let io = null;
function setIo(socketIo) {
  io = socketIo;
}

function computeStage(dueAt, now) {
  const diff = new Date(dueAt).getTime() - now.getTime();
  if (diff <= 0) return 'OVERDUE';
  if (diff <= ONE_DAY_MS) return 'D1';
  if (diff <= THREE_DAYS_MS) return 'D3';
  return null;
}

function isEscalation(previousStage, nextStage) {
  if (!nextStage) return false;
  if (!previousStage) return true;
  return (STAGE_ORDER[nextStage] || 0) > (STAGE_ORDER[previousStage] || 0);
}

function describeStage(stage, dueAt) {
  const when = new Date(dueAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  if (stage === 'OVERDUE') return `Prazo vencido em ${when}`;
  if (stage === 'D1') return `Prazo vence em até 24h (${when})`;
  return `Prazo vence em até 3 dias (${when})`;
}

async function processLegalTaskReminders() {
  const now = new Date();
  try {
    const candidates = await prisma.legalTask.findMany({
      where: {
        status: { in: ['PENDENTE', 'EM_ANDAMENTO'] },
        dueAt: { lte: new Date(now.getTime() + THREE_DAYS_MS) },
      },
      include: {
        assignee: { select: { id: true, name: true } },
        matter: { select: { id: true, title: true } },
        lead: { select: { id: true, title: true } },
      },
    });

    if (!candidates.length) return;

    let notified = 0;
    for (const task of candidates) {
      const stage = computeStage(task.dueAt, now);
      if (!isEscalation(task.lastReminderStage, stage)) continue;

      await prisma.legalTask.update({
        where: { id: task.id },
        data: { lastReminderStage: stage, lastReminderAt: now },
      });

      const payload = {
        taskId: task.id,
        title: task.title,
        stage,
        message: describeStage(stage, task.dueAt),
        dueAt: task.dueAt,
        priority: task.priority,
        assigneeId: task.assigneeId,
        assigneeName: task.assignee?.name || null,
        contextTitle: task.matter?.title || task.lead?.title || null,
        matterId: task.matterId,
        leadId: task.leadId,
      };

      console.log(`[legal-reminder] ${stage} — tarefa "${task.title}" (${task.id})${task.assignee ? ` -> ${task.assignee.name}` : ' -> sem responsável definido'}`);

      if (io) {
        if (task.assigneeId) {
          io.to(`user:${task.assigneeId}`).emit('legal_task_reminder', payload);
        } else {
          io.to(task.tenantId).emit('legal_task_reminder', payload);
        }
      }
      notified += 1;
    }

    if (notified > 0) console.log(`[legal-reminder] ${notified} alerta(s) de prazo disparado(s).`);
  } catch (err) {
    console.error('[legal-reminder] erro ao processar prazos:', err.message);
  }
}

module.exports = { processLegalTaskReminders, setIo, computeStage };
