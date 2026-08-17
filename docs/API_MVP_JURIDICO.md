# API do MVP Jurídico

Primeira versão do backend funcional do CRM jurídico. Todos os endpoints exigem JWT e isolam os dados pelo `tenantId` presente no token autenticado.

Base URL:

```text
/api/legal
```

Cabeçalho obrigatório:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

## Clientes do escritório

O CRM jurídico reutiliza a entidade central de contatos do sistema. Um cliente pode ser cadastrado antes de possuir conversa ou conexão no WhatsApp.

### `GET /api/contacts`

Lista os clientes do escritório autenticado. O parâmetro opcional `q` pesquisa nome, documento e telefone.

### `POST /api/contacts`

Cria um cliente. `name` e `phone` são os campos mínimos da interface jurídica. `email`, `cpfCnpj`, `city`, `state` e `notes` são opcionais.

Quando não existe uma instância WhatsApp, `instanceId` permanece nulo. A conexão somente será exigida posteriormente para abrir ou enviar uma conversa.

### `PATCH /api/contacts/:id`

Atualiza os dados cadastrais do cliente, sempre validando o `tenantId` autenticado.

## Configuração do domínio

### `GET /api/legal/config`

Retorna as áreas jurídicas, etapas do funil, prioridades, situações de casos e tipos/situações de tarefas aceitos pela API.

### `GET /api/legal/summary`

Retorna totais de oportunidades por etapa, casos por situação, tarefas abertas/atrasadas e as dez atividades mais recentes do escritório.

## Oportunidades jurídicas

### `GET /api/legal/leads`

Filtros opcionais:

- `stage`
- `area`
- `urgency`
- `assignedUserId`
- `search`
- `page` e `limit` (máximo de 100)

Exemplo:

```http
GET /api/legal/leads?stage=qualificacao_ia&area=trabalhista&page=1&limit=25
```

### `POST /api/legal/leads`

Cria uma oportunidade vinculada a um contato existente.

```json
{
  "contactId": "contact-id",
  "ticketId": "ticket-id-opcional",
  "assignedUserId": "user-id-opcional",
  "title": "Revisão de verbas rescisórias",
  "area": "TRABALHISTA",
  "stage": "QUALIFICACAO_IA",
  "urgency": "MEDIA",
  "source": "whatsapp",
  "summary": "Cliente relata divergência no termo de rescisão.",
  "qualification": {
    "terminationType": "sem justa causa",
    "employmentYears": 3,
    "documentsReceived": ["termo_rescisao.pdf"]
  },
  "nextActionAt": "2026-08-18T17:00:00.000Z"
}
```

Campos mínimos: `contactId`, `title` e `area`.

### `GET /api/legal/leads/:id`

Retorna a oportunidade, contato, atendimento, responsável, caso, tarefas e histórico de atividades.

### `PATCH /api/legal/leads/:id`

Atualiza parcialmente a oportunidade. Para mover para `NAO_CONVERTIDO`, `lostReason` é obrigatório.

```json
{
  "stage": "ANALISE_HUMANA",
  "assignedUserId": "user-id",
  "nextActionAt": "2026-08-18T18:00:00.000Z"
}
```

## Casos jurídicos

### `GET /api/legal/matters`

Filtros opcionais:

- `status`
- `area`
- `responsibleUserId`
- `search`
- `page` e `limit`

### `POST /api/legal/matters`

Cria um caso. Quando `leadId` é informado, o contato é obtido automaticamente da oportunidade.

```json
{
  "leadId": "lead-id",
  "responsibleUserId": "user-id-opcional",
  "title": "Análise de verbas rescisórias",
  "area": "TRABALHISTA",
  "status": "TRIAGEM",
  "description": "Documentação recebida para análise inicial."
}
```

Também é possível criar diretamente com `contactId`, sem uma oportunidade.

### `GET /api/legal/matters/:id`

Retorna caso, cliente, oportunidade de origem, responsável, tarefas e atividades.

### `PATCH /api/legal/matters/:id`

Atualiza parcialmente o caso. Ao alterar a situação para `ENCERRADO` ou `ARQUIVADO`, a API preenche `closedAt` automaticamente quando a data não for enviada.

```json
{
  "status": "ATIVO",
  "caseNumber": "0000000-00.2026.8.26.0000",
  "court": "2ª Vara do Trabalho",
  "opposingParty": "Empresa Exemplo Ltda."
}
```

## Tarefas

### `GET /api/legal/tasks`

Filtros opcionais:

- `status`
- `type`
- `priority`
- `assigneeId`
- `leadId`
- `matterId`
- `overdue=true`
- `page` e `limit`

### `POST /api/legal/tasks`

Cria uma tarefa vinculada a uma oportunidade, a um caso ou aos dois.

```json
{
  "matterId": "matter-id",
  "assigneeId": "user-id",
  "title": "Revisar termo de rescisão",
  "type": "DOCUMENTO",
  "priority": "ALTA",
  "dueAt": "2026-08-18T17:00:00.000Z"
}
```

### `PATCH /api/legal/tasks/:id`

Atualiza parcialmente a tarefa. Ao concluir, `completedAt` é preenchido automaticamente.

```json
{
  "status": "CONCLUIDA"
}
```

## Valores aceitos

### Áreas

`CIVEL`, `TRABALHISTA`, `FAMILIA`, `PREVIDENCIARIO`, `SUCESSOES`, `CONSUMIDOR`, `EMPRESARIAL`, `OUTRO`.

### Etapas da oportunidade

`NOVO_CONTATO`, `QUALIFICACAO_IA`, `AGUARDANDO_DOCUMENTOS`, `ANALISE_HUMANA`, `CONSULTA_AGENDADA`, `PROPOSTA_ENVIADA`, `CONTRATADO`, `NAO_CONVERTIDO`.

### Prioridades

`BAIXA`, `MEDIA`, `ALTA`, `URGENTE`.

### Situações do caso

`TRIAGEM`, `ATIVO`, `SUSPENSO`, `ENCERRADO`, `ARQUIVADO`.

### Tipos de tarefa

`PROXIMA_ACAO`, `PRAZO`, `AUDIENCIA`, `DOCUMENTO`, `RETORNO`, `OUTRO`.

### Situações da tarefa

`PENDENTE`, `EM_ANDAMENTO`, `CONCLUIDA`, `CANCELADA`.

Os valores de enum também aceitam formas amigáveis sem acento e com espaços, como `qualificacao ia`; a API normaliza para o valor canônico.

## Banco de dados

A migração está em:

```text
backend/prisma/migrations/20260817_legal_mvp_core/migration.sql
```

Para criar uma base limpa durante esta fase de homologação, utilize:

```bash
npx prisma db push
```

O script de inicialização também foi alterado para nunca aceitar perda de dados automaticamente. Antes da implantação definitiva na VPS, o banco será baselined e passará a usar `prisma migrate deploy` como fluxo de produção.

Não utilizar `db push --accept-data-loss` no ambiente do escritório.

## Segurança desta versão

- Todas as consultas e referências são verificadas contra o `tenantId` autenticado.
- Usuários responsáveis precisam pertencer ao mesmo escritório e estar ativos.
- Contato, atendimento, oportunidade e caso não podem ser vinculados entre escritórios.
- Alterações geram registros em `LegalActivity` sem duplicar textos jurídicos sensíveis no payload da auditoria.
- A API não fornece endpoints de exclusão física nesta primeira versão.
