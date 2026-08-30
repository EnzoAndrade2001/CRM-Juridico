# Monitoramento Externo de Uptime

O CRM integra o UptimeRobot pela API v3. A chave fica somente no backend. O provedor continua monitorando o site e a API mesmo quando o CRM estiver fora do ar.

## 1. Criar os monitores

Na conta do UptimeRobot, crie monitores HTTP(S) para:

- `https://pbladvocacia.com.br/`
- `https://URL-PUBLICA-DA-API/health`
- cada landing page pública que precise ser acompanhada

O endpoint `/health` retorna `200` somente quando a API e o banco estão respondendo. Configure também os contatos de alerta do próprio UptimeRobot.

## 2. Configurar o backend

No serviço do backend no EasyPanel, adicione:

```env
UPTIME_PROVIDER=uptimerobot
UPTIME_ROBOT_API_KEY=chave_de_leitura_do_uptimerobot
UPTIME_ROBOT_MONITOR_IDS=123456,789012
UPTIME_ROBOT_TENANT_SLUG=crm-juridico
UPTIME_ROBOT_INTERVAL_MS=300000
UPTIME_ROBOT_TIMEOUT_MS=10000
```

`UPTIME_ROBOT_MONITOR_IDS` deve conter os IDs dos monitores relevantes, separados por vírgula. Se ficar vazio, o CRM consulta todos os monitores da conta.

A chave é obtida em **Integrations & API > API**. Use uma chave somente leitura e nunca coloque esse valor no frontend ou no Git.

## 3. Publicar

Faça o redeploy do backend. O comando de produção já executa a migração do Prisma antes de iniciar a API:

```bash
cd backend
npm run db:deploy
```

Depois do restart, o serviço consulta os monitores na inicialização e a cada cinco minutos. O painel fica em **Operação > Monitor operacional**.

## Comportamento

- Monitor `DOWN`: cria evento crítico no CRM.
- Monitor `LOOKS_DOWN`: cria evento de atenção.
- Monitor `UP`: resolve automaticamente o evento correspondente.
- Falha da API do UptimeRobot: cria um evento crítico separado.
- Site totalmente fora do ar: o UptimeRobot continua alertando por conta própria; o CRM registra a ocorrência quando voltar a conseguir consultar o provedor.
