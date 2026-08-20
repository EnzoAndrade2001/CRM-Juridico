# Relatório de revisão de segurança — CRM Jurídico

Data da revisão: 20/08/2026  
Escopo: `backend/`, `frontend/`, dependências npm e smoke tests do ambiente publicado no Easypanel.

## Resultado executivo

O backend passou a aplicar limites explícitos de corpo, headers HTTP básicos, tratamento consistente de erros, proteção contra tentativas repetidas de login e filtro de extensões de upload. As chaves de integração retornadas pela API de configurações também passaram a ser mascaradas, preservando o valor no banco quando o formulário é salvo sem trocar a chave.

Não foram encontrados segredos hardcoded no código revisado. Permanecem pendências que exigem decisão de arquitetura/infraestrutura, principalmente autenticação do webhook da Evolution, armazenamento de JWT no navegador e a dependência `xlsx` sem correção de segurança publicada.

## Achados

### SBP-001 — Webhook da Evolution sem autenticação de origem (Alto)

- **Localização:** `backend/src/routes/webhook.js:4` e `backend/src/controllers/webhookController.js:724`.
- **Evidência:** a rota POST é pública e o controller responde 200 e processa `event`, `instance` e `data` sem validar assinatura, segredo ou header de origem.
- **Impacto:** um terceiro que descubra ou adivinhe o nome da instância pode forjar mensagens/eventos, criar ou alterar atendimentos e provocar chamadas ao provedor de IA e mensagens de saída.
- **Correção recomendada:** configurar um segredo exclusivo para o webhook e validar um header com comparação em tempo constante antes de processar o payload; configurar o mesmo header na Evolution. Complementar com allowlist de rede no proxy quando possível e validação de que a instância pertence ao tenant esperado.
- **Mitigação atual:** nomes de instância são identificadores não triviais e o endpoint não expõe credenciais da Evolution, mas isso não substitui autenticação de origem.
- **Falso positivo considerado:** o webhook precisa ser público para a Evolution conseguir entregá-lo; o risco continua válido mesmo assim.

### SBP-002 — `xlsx` com vulnerabilidades sem atualização disponível (Alto)

- **Localização:** `backend/src/controllers/contactController.js:239` e dependência direta `xlsx`.
- **Evidência:** `npm audit --omit=dev --audit-level=moderate` reporta Prototype Pollution (GHSA-4r6h-8v6p-xvw6) e ReDoS (GHSA-5pgg-2g8v-p4x9), sem versão corrigida disponível.
- **Impacto:** uma planilha maliciosa enviada para importação pode consumir CPU ou explorar comportamento inseguro do parser.
- **Correção recomendada:** migrar a importação para um parser mantido e com histórico de correções; limitar linhas/colunas e executar o parsing em processo isolado com timeout.
- **Mitigação atual:** a rota exige autenticação e o middleware de upload limita o tamanho a 20 MB e extensões aceitas. Isso reduz exposição, mas não elimina o risco do parser.
- **Falso positivo considerado:** a importação é uma funcionalidade administrativa legítima, porém o arquivo continua sendo entrada não confiável.

### SBP-003 — JWT em `localStorage` e em query string (Médio)

- **Localização:** `frontend/src/services/api.js:32`, `frontend/src/main.jsx:48`, `backend/src/middlewares/authenticate.js:9` e links PDF em `frontend/src/pages/ServiceOrders.jsx:278,409` e `frontend/src/components/ContactProfileModal.jsx:349`.
- **Evidência:** o token é persistido no `localStorage` e também anexado como `?token=...` para downloads autenticados.
- **Impacto:** qualquer XSS no frontend pode ler a sessão; tokens em URL podem parar no histórico, logs de proxy ou cabeçalho Referer.
- **Correção recomendada:** migrar para cookie `HttpOnly; Secure; SameSite=Lax/Strict`, usar `Authorization` em downloads via `fetch`/Blob ou links curtos de uso único e reduzir a validade do JWT.
- **Mitigação atual:** o backend agora envia `Referrer-Policy: strict-origin-when-cross-origin`; não compartilhar links PDF e manter CSP restritiva são medidas complementares.
- **Falso positivo considerado:** o token em query é usado para compatibilidade com abertura/impressão de PDF, mas continua sendo uma superfície de vazamento.

### SBP-004 — Mídias gerais servidas publicamente (Médio)

- **Localização:** `backend/src/app.js:143` (`/uploads`) e `backend/src/middlewares/upload.js`.
- **Evidência:** qualquer pessoa com a URL de um arquivo consegue solicitar o conteúdo sem JWT. O middleware agora restringe extensões executáveis/HTML e usa nomes aleatórios.
- **Impacto:** anexos de conversas podem conter dados pessoais e jurídicos; a URL funciona como um segredo permanente.
- **Correção recomendada:** servir mídias por endpoint autenticado com verificação de tenant ou por URLs assinadas de curta duração; aplicar política de retenção.
- **Mitigação atual:** documentos jurídicos já são bloqueados no caminho público, o middleware limita a 20 MB e rejeita extensões não previstas.
- **Falso positivo considerado:** a interface precisa exibir imagens e anexos do WhatsApp, mas isso não exige que sejam públicos indefinidamente.

### SBP-005 — React Router com advisories moderados pendentes (Moderado)

- **Localização:** `frontend/package-lock.json` (`react-router`/`react-router-dom` 6.30.x).
- **Evidência:** `npm audit` identifica open redirect via backslash e constructor injection na hidratação SSR; a correção automática exige migração major para React Router 7.
- **Impacto:** risco principalmente em navegação controlada por entrada externa e aplicações SSR. Este frontend é SPA, sem hidratação SSR identificada.
- **Correção recomendada:** planejar migração para v7 com testes de rotas; até lá, nunca usar URL fornecida pelo usuário diretamente em `navigate`/`Link` e validar destinos externos.
- **Mitigação atual:** não foi encontrado fluxo SSR nem redirecionamento baseado em entrada externa no smoke test.
- **Falso positivo considerado:** o advisory inclui cenários SSR que não estão ativos neste projeto, mas o open redirect merece correção futura.

## Correções aplicadas nesta revisão

- `backend/src/app.js`: `x-powered-by` desativado, headers `nosniff`/`DENY`/`Referrer-Policy`, CORS sem wildcard com credenciais, limites de JSON/urlencoded e respostas 404/erro padronizadas.
- `backend/src/controllers/authController.js`: janela de 15 minutos com no máximo 10 falhas por IP/e-mail e resposta 429 com `Retry-After`.
- `backend/src/controllers/settingsController.js`: segredos mascarados em GET/POST e preservação segura de chaves já salvas.
- `backend/src/middlewares/upload.js`: extensões permitidas, nomes aleatórios com `crypto` e limite de 20 MB.
- `backend/src/controllers/webhookController.js`: falha do provedor de IA transfere o ticket para atendimento humano e envia aviso neutro ao cliente quando possível.
- Campos de chaves/senhas no frontend receberam `autocomplete="new-password"`.
- Dependências corrigíveis foram atualizadas com `npm audit fix` sem `--force`.

## Testes executados

- Backend: `npm test` — **76/76 testes aprovados**.
- Sintaxe: `node --check` nos controllers/middlewares alterados — **aprovado**.
- Prisma: `prisma validate` e `prisma generate` com `DATABASE_URL` de teste — **aprovado**.
- Frontend: `npm run build` — **aprovado**.
- Playwright no ambiente publicado: login, erro de credencial, health check e navegação pelas telas de demonstração (Visão geral, Documentos, CRM jurídico, Campanhas, Base da IA, Conexões e Configurações) — **aprovado**, sem exceções JavaScript inesperadas. O navegador apontou apenas sugestões de `autocomplete`, já corrigidas no código.
- API publicada: `GET /health` retornou `200` com banco `ok` durante a revisão.
- Smoke unitário adicional: 11 tentativas inválidas de login resultaram em `401` nas primeiras e `429` com `Retry-After` na 11ª; leitura de configurações não expôs os seis campos de segredo e o salvamento preservou chaves mascaradas.

## Dependências ainda reportadas

- Backend: `xlsx` (alto, sem correção disponível).
- Frontend: `react-router`/`react-router-dom` (moderado; correção exige major).
