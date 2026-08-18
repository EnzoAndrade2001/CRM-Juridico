# Mapa funcional — Multiatendimento LCD para CRM Jurídico

## 1. Decisão de arquitetura

O CRM jurídico continuará usando o Multiatendimento como motor. Não será criado um segundo sistema independente para autenticação, contatos, WhatsApp, mensagens, campanhas ou IA.

A adaptação seguirá três regras:

1. Reaproveitar o que já funciona e apenas alterar linguagem, navegação e regras de negócio.
2. Manter módulos técnicos ativos no backend, mas fora da navegação cotidiana do escritório.
3. Desativar visualmente os módulos exclusivos da operação da LCD Digital, sem apagar código antes do piloto.

## 2. Navegação destinada ao escritório

| Módulo jurídico | Origem reaproveitada | Situação atual | Decisão para o MVP |
| --- | --- | --- | --- |
| Visão geral | Dashboard, contatos, tickets e `/api/legal/summary` | Painel jurídico conectado parcialmente aos dados reais | Manter visível e substituir todos os indicadores simulados por consultas reais |
| Atendimentos | Inbox, Ticket, Message, TicketEvent, etiquetas, notas, equipes e Socket.IO | Inbox real incorporada ao ambiente autenticado; o painel de contato exibe o contexto jurídico e preserva o atendimento selecionado | Manter visível e evoluir o modo IA |
| Clientes | Contact, histórico de tickets e API jurídica | Cadastro, edição, busca, dossiê e validações implementados | Manter visível como cadastro central único |
| CRM jurídico | Contact + LegalLead + LegalMatter + LegalTask | Backend e fluxo visual implementados | Manter visível; será o funil oficial do escritório |
| Tarefas e prazos | LegalTask | API implementada e tarefas exibidas dentro do CRM | Manter inicialmente dentro do CRM; criar agenda própria somente se o piloto exigir |
| Documentos | Upload existente + LegalDocument | Backend privado e interface jurídica implementados, com solicitação, upload, revisão, download autenticado e vínculos com cliente/caso | Manter visível no módulo próprio e dentro da ficha do cliente e do caso |
| Campanhas | Campaign, contatos, etiquetas e Evolution API | Envio básico existente; tela jurídica ainda simulada | Manter visível depois de adicionar segmentação, consentimento, fila e descadastro |
| Base da IA | Knowledge e KnowledgeLog | CRUD e tela jurídica conectados ao banco | Manter visível com linguagem e categorias jurídicas |
| Administração | Users, Teams, WaInstance e Settings | Backend e telas existentes | Exibir em área secundária somente para administradores |

## 3. Funções que permanecem visíveis

### 3.1 Visão geral

- Novos clientes e oportunidades.
- Casos em triagem, ativos e suspensos.
- Tarefas abertas e atrasadas.
- Atendimentos esperando ação humana.
- Etapas do funil e conversão em contratos.
- Atividade recente auditada.

Reaproveitamento: dashboard, contatos e tickets existentes, complementados pelo domínio `/api/legal`.

### 3.2 Atendimentos

- Conversas reais do WhatsApp.
- Envio de texto, imagem, áudio e documentos.
- Encaminhamento e resposta de mensagens.
- Atribuição para advogado ou equipe.
- Resolução e reabertura do atendimento.
- Notas internas.
- Etiquetas e respostas rápidas.
- Mensagens agendadas.
- Resumo de conversa.
- Alternância futura entre atendimento por IA, híbrido e humano.
- Abertura da ficha do cliente jurídico diretamente no painel do contato.
- Preservação do `ticketId` para criar a oportunidade já vinculada ao atendimento.

Reaproveitamento direto: rotas `/api/tickets`, `/api/quick-responses`, `/api/scheduled-messages`, `/api/tags`, webhooks e eventos Socket.IO.

### 3.3 Clientes

- Um único cadastro por pessoa ou empresa.
- Nome, telefone, WhatsApp, e-mail, CPF/CNPJ e endereço.
- Origem do contato, incluindo WhatsApp, Instagram, landing page ou cadastro manual.
- Oportunidades, casos, tarefas, documentos e atendimentos vinculados.
- Histórico cadastral.
- Vínculo explícito com a conexão de atendimento.
- Abertura pelo Inbox com cliente e atendimento selecionados.
- Atalho para iniciar uma oportunidade já preenchida com o cliente e o atendimento de origem.

Reaproveitamento direto: tabela `Contact`. A API `/api/legal/clients` é uma camada jurídica sobre essa mesma entidade, não uma duplicação.

### 3.4 CRM jurídico

- Funil de oportunidades.
- Qualificação por área e urgência.
- Responsável e próxima ação.
- Conversão de oportunidade em caso.
- Número do processo, vara, parte contrária e situação do caso.
- Tarefas, prazos, audiências, documentos e retornos.
- Auditoria das alterações.

Implementação específica: `LegalLead`, `LegalMatter`, `LegalTask` e `LegalActivity`.

#### Fluxo atual a partir do Inbox

1. No painel do contato da conversa, a equipe seleciona **Abrir cliente jurídico**.
2. O CRM abre a ficha do cliente e preserva o identificador do atendimento (`ticketId`).
3. Em **Nova oportunidade**, o cliente e o atendimento são pré-preenchidos; a origem é marcada como WhatsApp.
4. A API valida que contato e atendimento pertencem ao mesmo escritório e que o atendimento pertence ao contato informado.
5. A oportunidade é criada com o `ticketId`; sua ficha exibe o atendimento vinculado e o histórico da alteração.

O painel jurídico do Inbox também exibe a oportunidade vinculada, o caso relacionado e a próxima etapa do funil. A equipe pode avançar a etapa diretamente na conversa, sem navegar para a ficha do cliente e para o CRM.

### 3.5 Documentos

- Solicitar documento.
- Receber arquivo e vinculá-lo ao cliente, oportunidade ou caso.
- Marcar como em análise, aprovado, recusado ou arquivado.
- Baixar somente por rota autenticada do próprio escritório.
- Registrar quem analisou e quem baixou.

Reaproveitamento: volume de uploads do sistema. Adaptação jurídica: `LegalDocument`, validação de arquivos e download privado.

### 3.6 Campanhas

- Criar mensagem com variáveis e anexos.
- Segmentar por etiqueta, origem, área jurídica e etapa do funil.
- Revisar destinatários antes do envio.
- Agendar, pausar e cancelar.
- Medir enviados, falhas e respostas.
- Bloquear quem revogou permissão ou pediu descadastro.

Reaproveitamento: contatos, etiquetas, Evolution API e envio de campanhas existente. Adaptações obrigatórias: fila, limites, consentimentos e segmentação jurídica.

### 3.7 Base da IA

- Perguntas frequentes aprovadas pelo escritório.
- Orientações separadas por área jurídica.
- Instruções de triagem e transferência para humano.
- Conteúdo em rascunho, aprovado ou arquivado.
- Registro da fonte utilizada na resposta.

Reaproveitamento: `Knowledge` e `KnowledgeLog`. A integração futura utilizará um adaptador para OpenAI, Anthropic ou Gemini.

## 4. Funções mantidas internamente

Estes recursos continuam ativos, mas não precisam aparecer como módulos principais para as quatro pessoas do escritório:

| Função técnica | Motivo para manter |
| --- | --- |
| Autenticação JWT | Login e proteção de todas as APIs |
| Tenant | Isolamento dos dados do escritório |
| Usuários, equipes e permissões | Distribuição dos atendimentos e controle de acesso |
| Evolution API e WaInstance | Conexão e envio pelo WhatsApp |
| Webhooks | Entrada de mensagens e atualização de estado |
| Socket.IO e notificações | Atualização em tempo real da caixa de entrada |
| Tags | Segmentação de clientes e campanhas |
| Respostas rápidas | Agilidade dos atendentes |
| Mensagens agendadas | Retornos e lembretes operacionais |
| Uploads | Mídias de atendimento e documentos privados |
| Logs e atividades | Auditoria e diagnóstico |
| Superadmin | Administração técnica da plataforma pela LCD, sem acesso cotidiano do escritório |

## 5. Funções ocultadas do CRM jurídico

Esses módulos pertencem à operação técnica/comercial da LCD Digital e não devem aparecer na experiência do escritório:

| Módulo atual | Decisão |
| --- | --- |
| CRM Firebird de clientes, contratos e recebíveis | Ocultar |
| Equipamentos | Ocultar |
| Ordens de serviço e técnicos | Ocultar |
| Boletos, notas, duplicatas e faturamento técnico | Ocultar |
| Sincronização Firebird e agente local | Manter código isolado, sem ativar no ambiente jurídico |
| Prospecção automática por busca externa | Ocultar no MVP |
| RevGuard AI | Ocultar por não fazer parte do atendimento jurídico contratado |
| Painel Superadmin | Visível somente para administração técnica da plataforma |
| Dashboard, contatos e CRM genéricos | Substituir pelas telas jurídicas, evitando menus duplicados |
| Landing pages públicas | Manter separadas do sistema autenticado |

Nenhum desses módulos deve ser apagado agora. Primeiro serão retirados do menu e protegidos por configuração. A remoção física só será considerada depois do piloto, quando estiver comprovado que não existe dependência compartilhada.

## 6. Instagram e landing page

Instagram e landing page devem funcionar como origens do mesmo cliente central:

1. O interessado clica no WhatsApp ou inicia contato por uma integração Meta suportada.
2. O sistema localiza ou cria o `Contact` pelo identificador e telefone disponíveis.
3. O atendimento é criado na caixa de entrada.
4. A origem é registrada como Instagram, landing page ou campanha.
5. A IA realiza a triagem e cria ou atualiza a oportunidade jurídica.

Publicações do Instagram não precisam ser copiadas para dentro do CRM no MVP. O requisito importante é preservar a origem da campanha/publicação no contato e na oportunidade. Integração direta com mensagens do Instagram dependerá das permissões e webhooks disponibilizados pela conta Meta do escritório.

## 7. Menu final recomendado

### Menu principal

1. Visão geral
2. Atendimentos
3. Clientes
4. CRM jurídico
5. Documentos
6. Campanhas
7. Base da IA

### Administração

- Usuários e equipes
- Conexões do WhatsApp
- Etiquetas e respostas rápidas
- Horários de atendimento
- Configuração da IA
- Segurança e auditoria

## 8. Situação do reaproveitamento

| Classificação | Situação |
| --- | --- |
| Reaproveitado e conectado | Login, tenant, clientes, oportunidades, casos, tarefas, visão geral jurídica, auditoria e fluxo Inbox → cliente → oportunidade → avanço de etapa |
| Reaproveitado no backend, aguardando tela jurídica real | Campanhas, usuários, equipes e conexões |
| Novo e implementado no backend | Documentos jurídicos, estrutura de consentimento e validação do vínculo de oportunidade com atendimento |
| Novo e ainda pendente | Estado IA/humano por conversa, adaptador de provedor, qualificação automática e regras de transferência |
| Fora do produto jurídico | Firebird, ordens de serviço, equipamentos, faturamento técnico, prospecção e RevGuard |

## 9. Próxima sequência de implementação

1. Adaptar campanhas existentes para segmentação jurídica e consentimento.
2. Criar a configuração de modo IA, híbrido ou humano por conversa.
3. Simplificar o menu conforme este mapa, sem remover rotas compartilhadas.
4. Validar o fluxo completo em PostgreSQL de homologação e WhatsApp de teste.
