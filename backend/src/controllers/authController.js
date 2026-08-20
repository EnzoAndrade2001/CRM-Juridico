const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 10;
const failedLogins = new Map();

function getLoginKey(req, email) {
  const address = req.ip || req.socket?.remoteAddress || 'unknown';
  return `${address}|${email || '<missing>'}`;
}

function getLoginAttempt(key) {
  const now = Date.now();
  const current = failedLogins.get(key);
  if (!current || current.resetAt <= now) {
    failedLogins.delete(key);
    return null;
  }
  return current;
}

function isLoginBlocked(key) {
  const current = getLoginAttempt(key);
  return current && current.failures >= LOGIN_MAX_FAILURES ? current : null;
}

function recordLoginFailure(key) {
  const now = Date.now();
  const current = getLoginAttempt(key) || { failures: 0, resetAt: now + LOGIN_WINDOW_MS };
  current.failures += 1;
  failedLogins.set(key, current);
  return current;
}

function clearLoginFailures(key) {
  failedLogins.delete(key);
}

async function login(req, res) {
  const { email, password, slug } = req.body;

  // Normalize identifiers while preserving the password exactly as entered.
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const loginKey = getLoginKey(req, normalizedEmail);
  const blocked = isLoginBlocked(loginKey);
  if (blocked) {
    const retryAfter = Math.max(1, Math.ceil((blocked.resetAt - Date.now()) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({ error: 'Muitas tentativas. Tente novamente mais tarde.' });
  }

  if (!email || !password) {
    recordLoginFailure(loginKey);
    return res.status(400).json({ error: 'Email e senha obrigatórios' });
  }

  const normalizedSlug = slug ? String(slug).trim().toLowerCase() : '';

  const user = await prisma.user.findFirst({
    where: { email: normalizedEmail },
    include: { tenant: true },
  });

  if (!user || !user.active) {
    recordLoginFailure(loginKey);
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  // Se o login for feito via portal de empresa, validar se o usuário pertence a ela
  if (normalizedSlug && user.tenant.slug !== normalizedSlug) {
    return res.status(401).json({ error: 'Este usuário não possui permissão para acessar esta empresa.' });
  }

  // Se for um usuário comum tentando login global (sem slug), bloquear se não for superadmin
  if (!normalizedSlug && user.role !== 'superadmin') {
    return res.status(401).json({ error: 'Por favor, utilize o link de acesso exclusivo da sua empresa.' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    recordLoginFailure(loginKey);
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  clearLoginFailures(loginKey);

  const token = jwt.sign(
    { userId: user.id, tenantId: user.tenantId, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug },
  });
}

async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: {
      id: true, name: true, email: true, role: true, tenantId: true,
      tenant: {
        select: { id: true, name: true, slug: true, primaryColor: true, logoUrl: true }
      }
    },
  });
  res.json(user);
}

async function getTenantBySlug(req, res) {
  const { slug } = req.params;
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, primaryColor: true, logoUrl: true }
  });
  if (!tenant) return res.status(404).json({ error: 'Empresa não encontrada' });
  res.json(tenant);
}

module.exports = { login, me, getTenantBySlug };
