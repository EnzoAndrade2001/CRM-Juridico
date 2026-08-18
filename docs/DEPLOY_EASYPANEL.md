# Deploy do CRM jurídico no EasyPanel

Este documento descreve o primeiro deploy de produção do CRM em uma VPS EasyPanel usando o repositório `EnzoAndrade2001/CRM-Juridico`.

## Arquitetura recomendada

Crie três serviços no mesmo projeto do EasyPanel:

1. `crm-juridico-db`: PostgreSQL privado, sem domínio público.
2. `crm-juridico-api`: app Nixpacks apontando para a pasta `backend`.
3. `crm-juridico-web`: app Nixpacks apontando para a pasta `frontend`.

O banco deve aceitar conexões apenas pela rede interna do projeto. O frontend pode ser interno neste primeiro momento; o backend precisa de uma URL acessível pelo navegador do escritório para o Socket.IO e pelos webhooks da Evolution API.

## Banco PostgreSQL

No serviço PostgreSQL, crie um banco e um usuário exclusivos do CRM. O EasyPanel exibirá o host interno e a porta do serviço. Monte a URL no formato:

```text
postgresql://USUARIO:SENHA@HOST_INTERNO:5432/crm_juridico?schema=public
```

Não coloque essa URL no GitHub. Ela deve ser cadastrada somente como variável protegida no serviço da API.

### Primeiro banco novo

Como o repositório recebeu migrações incrementais ao longo do desenvolvimento, o primeiro banco novo deve ser inicializado uma única vez antes de ligar o processo normal da API:

```bash
cd backend
npm ci
npm run db:bootstrap
```

O comando aplica o schema atual sem aceitar perda de dados e registra as migrações existentes como já aplicadas. Depois disso, os deploys seguintes usam apenas:

```bash
npm run db:deploy
```

Não execute `db:bootstrap` em uma base com dados sem backup e conferência do schema.

## Serviço da API

No serviço `crm-juridico-api`:

- Repositório: `EnzoAndrade2001/CRM-Juridico`.
- Branch: `main`.
- Diretório de trabalho: `backend`.
- Build: `npm ci && npm run build`.
- Start: `npm run start`.
- Porta interna: `3002`.

### Se o Nixpacks falhar

O repositório também inclui `backend/Dockerfile`. Ele é a opção recomendada caso a instalação Nixpacks do EasyPanel gere o erro `undefined variable 'npm-9_x'`:

- Fonte: **Dockerfile**.
- Caminho de build: `/backend`.
- Porta interna: `3002`.
- Comando de início: o próprio `CMD` do Dockerfile (`npm run start`).

O Dockerfile instala Node 22, Prisma, OpenSSL e FFmpeg sem depender do pacote Nix `npm-9_x`.

Variáveis mínimas:

```text
DATABASE_URL=postgresql://...
JWT_SECRET=<segredo longo e aleatório>
PORT=3002
FRONTEND_URL=https://URL_DO_FRONTEND
PUBLIC_URL=https://URL_DA_API
UPLOADS_PATH=/app/uploads
LEGAL_DOCUMENTS_PATH=/app/uploads/legal-documents
APP_TIMEZONE=America/Sao_Paulo
```

Para habilitar IA e WhatsApp, adicione também as chaves do Gemini e da Evolution API. Para o retorno da calculadora, adicione `RESEND_API_KEY`, `RESEND_FROM_EMAIL` e `PUBLIC_CALCULATOR_TENANT_SLUG` quando o e-mail transacional estiver configurado.

### Persistência de arquivos

Crie um volume persistente no serviço da API e monte-o em `/app/uploads`. Isso mantém mídias e documentos jurídicos após novos deploys ou reinícios.

## Serviço do frontend

No serviço `crm-juridico-web`:

- Repositório: `EnzoAndrade2001/CRM-Juridico`.
- Branch: `main`.
- Diretório de trabalho: `frontend`.
- Build: `npm ci && npm run build`.
- Start: `npm run start`.
- Porta interna: `3000`.
- `VITE_API_URL=https://URL_DA_API` durante o build.

O valor de `VITE_API_URL` é embutido no build do Vite; após alterá-lo, faça um novo deploy do frontend.

## GitHub → EasyPanel

1. No EasyPanel, conecte o projeto ao repositório e à branch `main`.
2. Ative redeploy automático por push ou configure o webhook de deploy fornecido pelo EasyPanel como secret do GitHub.
3. Mantenha o workflow `CI` obrigatório antes do merge. O workflow `.github/workflows/ci.yml` valida o Prisma, executa os testes do backend e gera o build do frontend.
4. O workflow `deploy-demo.yml` continua reservado ao GitHub Pages; ele não substitui o deploy privado do EasyPanel.

## Checklist de validação

- `GET https://URL_DA_API/health` retorna `200`.
- Login do escritório funciona no frontend.
- `GET /api/legal/summary` retorna os dados do tenant autenticado.
- Upload e download autenticado de documento funcionam.
- Socket.IO conecta sem erro de CORS.
- A URL do webhook da Evolution aponta para `https://URL_DA_API/api/webhook`.
- Um novo push em `main` dispara o CI e o redeploy dos serviços.
