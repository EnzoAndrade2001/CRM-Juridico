const prisma = require('../lib/prisma');
const { BCRYPT_ROUNDS, checkPassword } = require('../domain/passwordPolicy');
const bcrypt = require('bcryptjs');

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

async function list(req, res) {
  // Removido bloqueio estrito de admin para permitir que agentes vejam colegas para transferencia

  const users = await prisma.user.findMany({
    where: { tenantId: req.user.tenantId },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, firebirdSupportName: true },
    orderBy: { name: 'asc' },
  });
  res.json(users);
}

async function create(req, res) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const { name, email, password, role, firebirdSupportName } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!String(name || '').trim() || !normalizedEmail || !password) {
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
  const count = await prisma.user.count({ where: { tenantId: req.user.tenantId } });

  // maxUsers igual a zero representa um tenant sem limite artificial de usuários.
  if (tenant.maxUsers > 0 && count >= tenant.maxUsers) {
    return res.status(403).json({ error: `Limite de usuarios atingido (${tenant.maxUsers}).` });
  }

  const exists = await prisma.user.findFirst({
    where: { tenantId: req.user.tenantId, email: normalizedEmail },
  });
  if (exists) return res.status(400).json({ error: 'Email ja cadastrado para esta empresa' });

  const passwordProblems = checkPassword(password, { email: normalizedEmail, name });
  if (passwordProblems.length) return res.status(400).json({ error: passwordProblems.join(' ') });

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      tenantId: req.user.tenantId,
      name: String(name).trim(),
      email: normalizedEmail,
      password: hash,
      role: role || 'agent',
      firebirdSupportName,
    },
    select: { id: true, name: true, email: true, role: true, active: true, firebirdSupportName: true },
  });
  res.json(user);
}

async function update(req, res) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const { id } = req.params;
  const { name, email, password, role, active, firebirdSupportName } = req.body;

  const data = {
    ...(name && { name: String(name).trim() }),
    ...(role && { role }),
    ...(active !== undefined && { active }),
    ...(firebirdSupportName !== undefined && { firebirdSupportName }),
  };

  if (email !== undefined) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return res.status(400).json({ error: 'Informe um e-mail válido.' });
    data.email = normalizedEmail;
  }

  if (password) {
    const passwordProblems = checkPassword(password, { email: req.body.email, name: req.body.name });
    if (passwordProblems.length) return res.status(400).json({ error: passwordProblems.join(' ') });
    data.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  const existing = await prisma.user.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!existing) return res.status(404).json({ error: 'Usuario nao encontrado' });

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, active: true, firebirdSupportName: true },
  });
  res.json(user);
}

async function remove(req, res) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  const { id } = req.params;

  if (id === req.user.userId) {
    return res.status(400).json({ error: 'Voce nao pode deletar seu proprio usuario' });
  }

  const existing = await prisma.user.findFirst({ where: { id, tenantId: req.user.tenantId } });
  if (!existing) return res.status(404).json({ error: 'Usuario nao encontrado' });

  const sentInternalCount = await prisma.internalMessage.count({ where: { senderId: id } });
  if (sentInternalCount > 0) {
    return res.status(400).json({
      error: 'Este atendente possui mensagens internas enviadas no historico. Arquive o usuario em vez de excluir.'
    });
  }

  await prisma.$transaction([
    prisma.teamMember.deleteMany({ where: { userId: id } }),
    prisma.message.updateMany({ where: { agentId: id }, data: { agentId: null } }),
    prisma.ticket.updateMany({ where: { agentId: id }, data: { agentId: null, status: 'pending' } }),
    prisma.ticketEvent.updateMany({ where: { userId: id }, data: { userId: null } }),
    prisma.internalMessage.updateMany({ where: { receiverId: id }, data: { receiverId: null } }),
    prisma.serviceOrder.updateMany({ where: { userId: id }, data: { userId: null } }),
    prisma.serviceOrder.updateMany({ where: { closedById: id }, data: { closedById: null } }),
    prisma.user.delete({ where: { id } })
  ]);

  res.sendStatus(204);
}

module.exports = { list, create, update, remove };
