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

O CRM jurídico reutiliza a entidade central de contatos do sistema, mas expõe endpoints próprios em `/api/legal/clients` com validação jurídica, contadores do funil e auditoria. Um cliente pode ser cadastrado antes de possuir conversa ou conexão no WhatsApp.

As rotas antigas de `/api/contacts` continuam existindo para a caixa de entrada e para os módulos técnicos herdados. A interface jurídica deve usar somente `/api/legal/clients`.

### `GET /api/legal/clients`

Lista os clientes do escritório autenticado, do mais recente para o mais antigo.

Filtros opcionais:

- `search` (ou `q`): nome, nome fantasia, e-mail, telefone, WhatsApp e documento. Quando a busca contém dígitos, telefone e documento são comparados somente pelos números.
- `withLead=true|false`: com ou sem oportunidade.
- `withMatter=true|false`: com ou sem caso jurídico.
- `linkedToWhatsapp=true|false`: com ou sem conexão vinculada.
- `page` e `limit` (máximo de 100).

Resposta:

```json
{
  "items": [
    {
      "id": "contact-id",
      "name": "Maria Aparecida Silva",
      "phone": "5511999998888",
      "email": "maria@escritorio.com",
      "cpfCnpj": "52998224725",
      "city": "São Paulo",
      "state": "SP",
      "instanceId": null,
      "linkedToWhatsapp": false,
      "counters": { "leads": 2, "matters": 1, "openTasks": 3 }
    }
  ],
  "pagination": { "page": 1, "limit": 25, "total": 1, "pages": 1 }
}
```

### `GET /api/legal/clients/:id`

Retorna o dossiê do cliente: dados cadastrais, contadores, oportunidades, casos, até cinquenta tarefas e documentos vinculados, os cinco atendimentos mais recentes e o histórico de alterações cadastrais.

### `POST /api/legal/clients`

Cria um cliente. `name` e `phone` são obrigatórios. `whatsapp`, `fantasyName`, `email`, `cpfCnpj`, `address`, `city`, `state`, `zipCode` e `notes` são opcionais.

```json
{
  "name": "Maria Aparecida Silva",
  "phone": "(11) 99999-8888",
  "email": "maria@escritorio.com",
  "cpfCnpj": "529.982.247-25",
  "city": "São Paulo",
  "state": "SP",
  "notes": "Cliente indicada pelo Dr. Paulo."
}
```

Quando `instanceId` não é informado, o cliente é criado com `instanceId` nulo. Isso evita vincular um cadastro interno a uma conexão que ainda não originou atendimento. A conexão somente será exigida ao abrir ou enviar uma conversa.

### `PATCH /api/legal/clients/:id`

Atualiza parcialmente os dados cadastrais, sempre validando o `tenantId` autenticado. Campos opcionais aceitam `null` para limpar o valor. `instanceId` pode receber uma conexão pertencente ao escritório ou `null` para desvincular o cliente.

### Normalização e validação

- Telefone e WhatsApp são normalizados para o formato internacional usado pela Evolution API (`5511999998888`).
- CPF e CNPJ são validados pelos dígitos verificadores e armazenados somente com números.
- E-mail é normalizado em caixa baixa e validado quanto ao formato.
- Estado precisa ser uma UF brasileira e CEP precisa ter oito dígitos.

### Conflitos

`POST` e `PATCH` retornam `409` quando o telefone, o WhatsApp ou o documento já pertencem a outro cliente do mesmo escritório:

```json
{
  "error": "Já existe um cliente com este telefone, WhatsApp ou documento",
  "details": [{ "field": "phone", "code": "duplicate", "clientId": "contact-id" }]
}
```

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

Cria uma oportunidade vinculada a um contato existente. Quando `ticketId` é informado, a oportunidade também fica vinculada ao atendimento do Inbox.

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

Quando enviado, `ticketId` precisa existir no mesmo escritório e pertencer ao `contactId` informado. Caso contrário, a API responde `400`; essa validação impede que uma oportunidade misture dados de contatos ou escritórios diferentes. A resposta inclui o resumo do atendimento vinculado (`ticket.id`, `ticket.status` e `ticket.subject`).

#### Fluxo iniciado no Inbox

O painel do contato pode encaminhar `contactId` e `ticketId` para a área jurídica. A interface então abre a ficha do cliente, pré-preenche a criação da oportunidade e envia a origem como `whatsapp`. Depois da criação, `GET /api/legal/leads/:id` retorna o atendimento no campo `ticket`, permitindo confirmar o vínculo e consultar o histórico da oportunidade.

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

## Documentos

Documentos são solicitados ao cliente, recebidos, analisados e arquivados. Todo documento pertence a um cliente e pode estar vinculado a uma oportunidade, a um caso ou aos dois.

### Armazenamento e sigilo

- O arquivo é gravado em `uploads/legal/<tenantId>/`, dentro do volume persistente, com nome gerado pela API.
- Esse prefixo é bloqueado no `express.static`: qualquer acesso a `/uploads/legal/...` responde `403`.
- O download acontece somente por `GET /api/legal/documents/:id/file`, autenticado e validado contra o `tenantId`.
- A chave de armazenamento nunca é devolvida pela API. O cliente recebe `hasFile` e `downloadUrl`.
- Cada arquivo recebe um `checksum` SHA-256 e tem o nome original higienizado antes de ser persistido.
- Formatos aceitos: PDF, JPEG, PNG, WEBP, HEIC, DOC, DOCX, XLS, XLSX e TXT. Limite de 20 MB por arquivo.

### `GET /api/legal/documents`

Filtros opcionais:

- `status`, `kind`
- `contactId`, `leadId`, `matterId`
- `pending=true`: apenas documentos ainda solicitados.
- `overdue=true`: solicitados cujo prazo já venceu.
- `search`: título, nome do arquivo e nome do cliente.
- `page` e `limit`.

### `POST /api/legal/documents`

Solicita um documento ao cliente. Aceita JSON ou `multipart/form-data`. Quando o campo `file` acompanha a requisição, o documento já nasce como `RECEBIDO`.

```json
{
  "matterId": "matter-id",
  "title": "Termo de rescisão assinado",
  "kind": "RESCISAO",
  "description": "Enviar as duas vias assinadas.",
  "dueAt": "2026-08-25T12:00:00.000Z"
}
```

Informando apenas `leadId` ou `matterId`, o cliente é derivado automaticamente do vínculo. Oportunidade e caso precisam pertencer ao mesmo cliente e ao mesmo escritório.

### `GET /api/legal/documents/:id`

Retorna o documento, seus vínculos, quem solicitou, quem analisou e o histórico de atividades, incluindo os downloads realizados.

### `POST /api/legal/documents/:id/file`

Anexa o arquivo a uma solicitação existente (`multipart/form-data`, campo `file`). Marca o documento como `RECEBIDO`, limpa a análise anterior e substitui o arquivo antigo somente depois que o novo foi persistido. Documentos `ARQUIVADO` recusam novo arquivo com `409`.

### `GET /api/legal/documents/:id/file`

Baixa o arquivo. Responde `409` quando o documento ainda não tem arquivo e `410` quando o binário não está mais no volume. Cada download gera uma atividade `document.downloaded`.

### `PATCH /api/legal/documents/:id`

Atualiza parcialmente o documento e sua situação.

```json
{
  "status": "APROVADO"
}
```

Regras aplicadas:

- `RECEBIDO`, `EM_ANALISE` e `APROVADO` exigem que o arquivo já tenha sido enviado.
- `RECUSADO` exige `reviewNotes`.
- `APROVADO` e `RECUSADO` preenchem `reviewedAt` e `reviewedById` com o usuário autenticado.
- Voltar para `SOLICITADO` limpa `receivedAt` e a análise anterior.

### Tipos de documento

`IDENTIDADE`, `COMPROVANTE_RESIDENCIA`, `COMPROVANTE_RENDA`, `CONTRATO`, `PROCURACAO`, `RESCISAO`, `DECISAO_JUDICIAL`, `LAUDO`, `COMPROVANTE_PAGAMENTO`, `OUTRO`.

### Situações do documento

`SOLICITADO`, `RECEBIDO`, `EM_ANALISE`, `APROVADO`, `RECUSADO`, `ARQUIVADO`.

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
backend/prisma/migrations/20260818_legal_documents/migration.sql
backend/prisma/migrations/20260818_legal_consents/migration.sql
```

Para criar uma base limpa durante esta fase de homologação, utilize o bootstrap controlado na pasta `backend`:

```bash
npm run db:bootstrap
```

Esse comando é destinado à primeira inicialização de uma base PostgreSQL nova: aplica o schema atual sem aceitar perda de dados e registra as migrações incrementais existentes como aplicadas. O processo normal da API usa `prisma migrate deploy` (via `npm start`) para aplicar somente migrações novas.

Não execute `db:bootstrap` em uma base com dados sem backup e conferência do schema. Nunca utilizar `db push --accept-data-loss` no ambiente do escritório.

## Segurança desta versão

- Todas as consultas e referências são verificadas contra o `tenantId` autenticado.
- Usuários responsáveis precisam pertencer ao mesmo escritório e estar ativos.
- Contato, atendimento, oportunidade e caso não podem ser vinculados entre escritórios.
- Alterações geram registros em `LegalActivity` sem duplicar textos jurídicos sensíveis no payload da auditoria. Cadastro e alteração de clientes usam `entityType: "client"`; documentos usam `entityType: "document"` e registram também os downloads.
- A API não fornece endpoints de exclusão física nesta primeira versão. Documentos saem de circulação pela situação `ARQUIVADO`.
- Arquivos de documentos não são servidos pelo diretório estático e só podem ser baixados por usuários autenticados do próprio escritório.
