/**
 * checkInstances.js — Diagnóstico de conexão das instâncias WhatsApp
 *
 * Compara, para cada instância, tres coisas que costumam divergir quando o
 * atendimento "para de responder" sem erro aparente:
 *
 *   1. o status gravado no banco (o que o painel mostra);
 *   2. o estado real reportado pela Evolution (open / connecting / close);
 *   3. a URL de webhook registrada na Evolution, e se ela carrega o segredo
 *      esperado — sem o segredo o backend responde 401 e descarta os eventos,
 *      deixando o bot mudo mesmo com a sessão conectada.
 *
 * Somente leitura: não altera nada. Uso:
 *   node scripts/checkInstances.js
 */
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();
const evolution = require('../src/services/evolutionService');

function sanitizeUrl(url) {
  let baseUrl = String(url || '').trim();
  if (!baseUrl) return null;
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) baseUrl = `https://${baseUrl}`;
  return baseUrl.replace(/\/+$/, '');
}

async function findWebhook(url, key, instanceName) {
  const baseUrl = sanitizeUrl(url);
  const { data } = await axios.get(`${baseUrl}/webhook/find/${instanceName}`, {
    headers: { apikey: key },
    timeout: 20000,
  });
  return data;
}

async function main() {
  const expectedSecret = process.env.EVOLUTION_WEBHOOK_SECRET || '';
  if (!expectedSecret) {
    console.warn('AVISO: EVOLUTION_WEBHOOK_SECRET não está definida neste processo — a checagem do segredo será pulada.\n');
  }

  const instances = await prisma.waInstance.findMany();
  if (!instances.length) {
    console.log('Nenhuma instância cadastrada.');
    return;
  }

  for (const inst of instances) {
    console.log('='.repeat(70));
    console.log(`Instância: ${inst.instanceName}`);
    console.log(`  status no banco (painel): ${inst.status}`);

    const settings = await prisma.tenantSettings.findUnique({ where: { tenantId: inst.tenantId } });
    const evolutionUrl = settings?.evolutionUrl || process.env.DEFAULT_EVOLUTION_URL;
    const evolutionKey = settings?.evolutionKey || process.env.DEFAULT_EVOLUTION_KEY;

    if (!evolutionUrl || !evolutionKey) {
      console.log('  [!] Evolution não configurada para este tenant — impossível verificar.');
      continue;
    }

    let realState = null;
    try {
      const stateData = await evolution.getConnectionState(evolutionUrl, evolutionKey, inst.instanceName);
      realState = stateData?.instance?.state || stateData?.state || null;
      console.log(`  estado real na Evolution: ${realState || 'desconhecido'}`);
    } catch (err) {
      console.log(`  [!] falha ao consultar estado: ${err.response?.data?.message || err.message}`);
    }

    try {
      const webhook = await findWebhook(evolutionUrl, evolutionKey, inst.instanceName);
      const registeredUrl = webhook?.url || webhook?.webhook?.url || null;
      console.log(`  webhook registrado: ${registeredUrl || '(nenhum)'}`);
      console.log(`  webhook habilitado: ${webhook?.enabled ?? webhook?.webhook?.enabled ?? 'desconhecido'}`);

      if (expectedSecret && registeredUrl) {
        const carriesSecret = registeredUrl.includes(`secret=${encodeURIComponent(expectedSecret)}`);
        console.log(`  segredo correto na URL: ${carriesSecret ? 'SIM' : 'NAO — eventos serão rejeitados com 401'}`);
      }
    } catch (err) {
      console.log(`  [!] falha ao consultar webhook: ${err.response?.data?.message || err.message}`);
    }

    // Divergencia entre o que o painel mostra e a realidade e a causa classica
    // de "o CRM diz conectado mas nada chega no WhatsApp".
    if (realState) {
      const dbSaysConnected = inst.status === 'connected';
      const reallyConnected = realState === 'open';
      if (dbSaysConnected !== reallyConnected) {
        console.log(`  >>> DIVERGENCIA: painel diz "${inst.status}" mas a Evolution diz "${realState}".`);
      }
      if (realState === 'connecting') {
        console.log('  >>> A sessao esta aguardando leitura do QR Code. Use "Recriar sessao" em Conexoes e escaneie.');
      }
      if (realState === 'close') {
        console.log('  >>> Sessao fechada. Reconecte pelo painel.');
      }
    }
  }
  console.log('='.repeat(70));
}

main().catch(console.error).finally(() => prisma.$disconnect());
