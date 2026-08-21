const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const prisma = require('./lib/prisma');

const authRoutes = require('./routes/auth');
const ticketRoutes = require('./routes/tickets');
const webhookRoutes = require('./routes/webhook');
const settingsRoutes = require('./routes/settings');
const instanceRoutes = require('./routes/instance');
const contactRoutes = require('./routes/contacts');
const userRoutes = require('./routes/users');
const teamRoutes = require('./routes/teams');
const dashboardRoutes = require('./routes/dashboardRoutes');
const superadminRoutes = require('./routes/superadmin');
const quickResponseRoutes = require('./routes/quickResponses');
const internalMessageRoutes = require('./routes/internalMessages');
const scheduledMessageRoutes = require('./routes/scheduledMessages');
const scheduleProcessor = require('./services/scheduleProcessor');
const { setIo: setIoSchedule } = scheduleProcessor;
const { setIo: setIoWebhook } = require('./controllers/webhookController');
const { setIo: setIoTicket } = require('./controllers/ticketController');
const { setIo: setIoInternal } = require('./controllers/internalMessageController');
const campaignRoutes = require('./routes/campaignRoutes');
const { setIo: setIoCampaign } = require('./controllers/campaignController');
const { setIo: setIoBilling } = require('./controllers/billingController');
const { setIo: setIoManagerCopy } = require('./services/serviceOrderManagerCopyService');
const { setIo: setIoBillingDocuments } = require('./services/billingDocumentService');
const { setIo: setIoPublicCalculator } = require('./controllers/publicCalculatorController');
const tagRoutes = require('./routes/tagRoutes');
const uploadRoutes = require('./routes/upload');
const osRoutes = require('./routes/osRoutes');
const leadRoutes = require('./routes/leadRoutes');
const revenueRoutes = require('./routes/revenue');
const crmRoutes = require('./routes/crm');
const integrationRoutes = require('./routes/integrations');
const firebirdSyncRoutes = require('./routes/firebirdSync');
const legalRoutes = require('./routes/legal');
const publicCalculatorRoutes = require('./routes/publicCalculator');

const app = express();
app.disable('x-powered-by');

// Headers básicos para reduzir exposição desnecessária e impedir que respostas
// sejam interpretadas como outro tipo de conteúdo pelo navegador.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use('/api/report', require('./routes/report'));

const server = http.createServer(app);
const bootAt = Date.now();

// CORS precisa receber somente a origem (protocolo + host + porta). Se a
// variÃ¡vel vier com um caminho, como /login, os navegadores rejeitam a
// resposta porque o header Access-Control-Allow-Origin nunca pode conter path.
function resolveFrontendOrigin(value) {
  const configured = String(value || '').trim();
  if (!configured || configured === '*') return configured || '*';
  try {
    return new URL(configured).origin;
  } catch {
    return configured.replace(/\/+$/, '');
  }
}

// O CRM e a landing podem estar em hosts diferentes (por exemplo, o CRM no
// EasyPanel e a landing no GitHub Pages). FRONTEND_URLS aceita uma lista
// separada por vírgulas, preservando FRONTEND_URL para instalações antigas.
const configuredFrontendOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URLS,
]
  .flatMap((value) => String(value || '').split(','))
  .map(resolveFrontendOrigin)
  .filter(Boolean);
const frontendOrigins = configuredFrontendOrigins.length
  ? Array.from(new Set(configuredFrontendOrigins))
  : ['http://localhost:5174'];
const allowAnyFrontendOrigin = frontendOrigins.includes('*');
const corsOptions = {
  origin: (requestOrigin, callback) => {
    // Navegadores sem Origin (health checks, curl e integrações servidor a
    // servidor) continuam funcionando sem abrir o CORS para qualquer site.
    if (!requestOrigin || (allowAnyFrontendOrigin && process.env.CORS_ALLOW_ANY === 'true')) {
      return callback(null, true);
    }
    return callback(null, frontendOrigins.includes(requestOrigin));
  },
  credentials: true,
};

const io = new Server(server, {
  cors: { ...corsOptions, methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  transports: ['websocket', 'polling']
});

setIoWebhook(io);
setIoTicket(io);
setIoInternal(io);
setIoCampaign(io);
setIoBilling(io);
setIoManagerCopy(io);
setIoBillingDocuments(io);
setIoPublicCalculator(io);
setIoSchedule(io);

app.use(cors(corsOptions));
app.use(express.json({
  limit: process.env.JSON_BODY_LIMIT || '10mb',
}));
app.use(express.urlencoded({
  extended: false,
  limit: process.env.URLENCODED_BODY_LIMIT || '1mb',
  parameterLimit: 1000,
}));

// Endpoint usado pelo health check do EasyPanel e pelo monitoramento da VPS.
// A consulta simples confirma que a API e o PostgreSQL estão respondendo.
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', database: 'ok' });
  } catch (error) {
    console.error('[health] banco indisponível:', error.message);
    res.status(503).json({ status: 'degraded', database: 'unavailable' });
  }
});

app.use((req, res, next) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;

    if (durationMs < 1500) return;

    const memoryMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
    console.warn(
      `[perf] ${req.method} ${req.originalUrl} -> ${res.statusCode} em ${durationMs}ms | rss=${memoryMb}MB | uptime=${Math.round(process.uptime())}s`
    );
  });

  next();
});

// Serve arquivos estáticos ANTES das rotas da API
const { uploadsPath } = require('./utils/uploads');
const { LEGAL_DOCUMENTS_DIRNAME } = require('./utils/legalStorage');

// Documentos jurídicos vivem dentro do volume de uploads para aproveitar a persistência,
// mas nunca podem ser servidos publicamente. O download acontece apenas pela rota
// autenticada /api/legal/documents/:id/file.
app.use(`/uploads/${LEGAL_DOCUMENTS_DIRNAME}`, (req, res) => {
  res.status(403).json({ error: 'Documentos jurídicos exigem download autenticado' });
});
app.use('/uploads', express.static(uploadsPath));

app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/instance', instanceRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/quick-responses', quickResponseRoutes);
app.use('/api/internal-messages', internalMessageRoutes);
app.use('/api/scheduled-messages', scheduledMessageRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/knowledge', require('./routes/knowledge'));
app.use('/api/upload', uploadRoutes);
app.use('/api/os', osRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/integrations/firebird', firebirdSyncRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/legal', legalRoutes);
app.use('/api/public', publicCalculatorRoutes);

// Respostas previsíveis para clientes que chamarem uma rota inexistente ou
// enviarem uma requisição que falhe antes de chegar ao controller.
app.use((req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = Number(err?.statusCode || err?.status) || 500;
  const safeStatus = status >= 400 && status < 500 ? status : 500;
  if (safeStatus >= 500) {
    console.error('[http] erro não tratado:', err?.stack || err);
  }
  res.status(safeStatus).json({
    error: safeStatus >= 500 ? 'Erro interno do servidor' : (err.message || 'Requisição inválida'),
  });
});

const jwt = require('jsonwebtoken');

io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  if (!token) return next(new Error('Autenticação requerida'));
  
  if (!process.env.JWT_SECRET) {
    console.error('[CRITICAL] JWT_SECRET não configurada!');
    return next(new Error('Erro interno do servidor'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Token inválido'));
  }
});

io.on('connection', (socket) => {
  const { tenantId } = socket.user;
  socket.join(tenantId);
  socket.on('disconnect', (reason) => {
    console.log(`[socket] usuário ${socket.user.userId} DESCONECTADO do tenant ${tenantId}. Motivo: ${reason}`);
  });

  socket.on('send_internal', (message) => {
    socket.to(tenantId).emit('new_internal', message);
  });
});

const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`[server] rodando na porta ${PORT}`);
  console.log(`[server] boot=${new Date(bootAt).toISOString()} pid=${process.pid}`);
  scheduleProcessor.start();

  // Sincronização automática de webhooks das instâncias existentes.
  // As credenciais são lidas das configurações do tenant ou das variáveis
  // DEFAULT_EVOLUTION_URL/DEFAULT_EVOLUTION_KEY; nunca ficam embutidas no código.
  (async () => {
    // Sincronização automática de webhooks para garantir que MESSAGES_SET esteja ativo
    try {
      const prisma = require('./lib/prisma');
      const evolution = require('./services/evolutionService');
      const instances = await prisma.waInstance.findMany();
      if (instances.length > 0) {
        console.log(`[startup-webhook-fix] Verificando/atualizando webhooks para ${instances.length} instâncias...`);
        const backendUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3002}`;
        const webhookUrl = `${backendUrl}/api/webhook`;
        
        for (const inst of instances) {
          const settings = await prisma.tenantSettings.findUnique({ where: { tenantId: inst.tenantId } });
          const evolutionUrl = settings?.evolutionUrl || process.env.DEFAULT_EVOLUTION_URL;
          const evolutionKey = settings?.evolutionKey || process.env.DEFAULT_EVOLUTION_KEY;
          if (evolutionUrl && evolutionKey) {
            console.log(`[startup-webhook-fix] Atualizando webhook da instância ${inst.instanceName} com URL ${webhookUrl}...`);
            await evolution.setWebhook(evolutionUrl, evolutionKey, inst.instanceName, webhookUrl);
          }
        }
        console.log(`[startup-webhook-fix] Concluído.`);
      }
    } catch (err) {
      console.error('[startup-webhook-fix] Erro ao sincronizar webhooks:', err.message);
    }
  })();
});

process.on('uncaughtException', (err) => {
  console.error('[fatal] uncaughtException:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[fatal] unhandledRejection:', reason);
});

module.exports = { app, server };
