# Plano de implementação — MVP CRM Jurídico com IA

## 1. Objetivo

Transformar o Multiatendimento em um CRM jurídico enxuto, centrado no atendimento de clientes pelo WhatsApp com IA, transferência para atendentes humanos, campanhas segmentadas e acompanhamento do funil comercial.

O primeiro marco será um teste visual navegável. Ele deverá permitir que o escritório valide telas, linguagem, informações e fluxo de trabalho antes das integrações reais e da implantação na VPS.

### Estado atual do MVP

- Demonstração visual aprovada pelo escritório.
- API inicial de oportunidades, casos e tarefas implementada.
- Pipeline interativo com cadastro, mudança de etapa, filtros e persistência local na demonstração.
- Conversão de oportunidade em caso e criação/conclusão de tarefas disponíveis no fluxo visual.
- Rota autenticada `/juridico` preparada para utilizar a API real; a rota pública `/demo-juridico` continua usando somente dados fictícios do navegador.
- Módulo de documentos jurídicos: solicitação, recebimento, análise e arquivamento, com armazenamento privado fora do diretório público e download autenticado por escritório.
- Módulo de clientes do escritório com API própria em `/api/legal/clients`: busca, paginação, filtros por vínculo, contadores do funil, validação de documento, telefone, e-mail, UF e CEP, bloqueio de duplicados e auditoria em `LegalActivity`.

## 2. Princípios do MVP

- Preservar o núcleo já funcional de autenticação, contatos, tickets, mensagens, usuários, equipes, etiquetas, respostas rápidas, campanhas e Evolution API.
- Remover da navegação inicial os módulos específicos da LCD Digital: ordens de serviço, equipamentos, Firebird e faturamento técnico.
- Manter a IA desacoplada do provedor. OpenAI, Anthropic ou Gemini deverão implementar a mesma interface interna.
- Permitir alternar cada conversa entre `IA`, `Híbrido` e `Humano`.
- Não permitir que a IA apresente conclusões jurídicas definitivas sem regras e conteúdo aprovados pelo escritório.
- Manter histórico, origem e responsável por ações relevantes.

## 3. Escopo funcional inicial

### 3.1 Visão geral

- Indicadores de novos contatos, oportunidades, atendimentos em curso e transferências para humanos.
- Lista de atendimentos prioritários.
- Distribuição dos contatos por área jurídica e etapa do funil.
- Resumo das campanhas recentes.

### 3.2 Atendimento

- Caixa de entrada multiatendente do WhatsApp.
- Identificação visual do modo IA, híbrido ou humano.
- Resumo automático da conversa.
- Classificação de área jurídica, urgência e intenção do contato.
- Coleta estruturada de nome, telefone, cidade, assunto e informações definidas pelo escritório.
- Solicitação e recebimento de documentos.
- Transferência para equipe ou advogado.
- Notas internas, etiquetas e respostas rápidas.

### 3.3 Clientes e oportunidades

- Cadastro de pessoa física ou jurídica.
- Dados de contato e origem do lead.
- Área jurídica de interesse.
- Responsável e equipe.
- Histórico de conversas e atividades.
- Observações e documentos.
- Controle básico de consentimento e descadastro de campanhas.

### 3.4 CRM jurídico

Funil inicial sugerido:

1. Novo contato
2. Em qualificação pela IA
3. Aguardando documentos
4. Aguardando análise humana
5. Consulta agendada
6. Proposta enviada
7. Contratado
8. Não convertido

O cartão deverá mostrar cliente, assunto, área jurídica, responsável, última interação e próxima ação.

### 3.5 Campanhas

- Criação de campanha segmentada.
- Segmentação por etiquetas, área jurídica, etapa do funil e origem.
- Mensagem com variáveis e anexo.
- Agendamento e limites de envio.
- Lista de destinatários antes da confirmação.
- Pausa e cancelamento.
- Indicadores de enviados, entregues, respondidos, falhas e descadastros.
- Bloqueio de contatos sem permissão aplicável ou que solicitaram descadastro.

### 3.6 Base de conhecimento da IA

- Cadastro de orientações, perguntas frequentes e documentos aprovados.
- Separação do conteúdo por área jurídica.
- Versão e situação: rascunho, aprovado ou arquivado.
- Registro da fonte utilizada pela IA.
- Regras de transferência obrigatória para atendimento humano.

### 3.7 Administração

- Usuários e perfis: administrador, gestor, advogado e atendente.
- Equipes ou áreas jurídicas.
- Conexões do WhatsApp.
- Horários de atendimento.
- Configuração do provedor de IA e limites de uso.
- Log básico de ações administrativas.

## 4. Primeiro marco: teste visual navegável

O protótipo será implementado no frontend existente, com dados simulados e sem alterar o banco de produção.

### Telas incluídas

- Login com a nova identidade temporária.
- Visão geral jurídica.
- Atendimento com uma conversa simulada conduzida pela IA.
- Perfil do cliente ao lado da conversa.
- CRM em formato Kanban.
- Cadastro e visualização de campanha.
- Base de conhecimento.
- Usuários e configurações essenciais.

### Jornada demonstrável

1. Um novo contato chega pelo WhatsApp.
2. A IA identifica o assunto e coleta os dados iniciais.
3. Uma oportunidade é criada no CRM.
4. A IA solicita um documento e resume a conversa.
5. O atendimento é transferido para o advogado da área.
6. O advogado assume a conversa e move a oportunidade no funil.
7. Uma campanha segmentada é preparada, revisada e simulada.

### Critérios de aceite

- Todas as telas principais podem ser abertas sem erros.
- A jornada completa pode ser demonstrada sem backend externo.
- Layout funcional em desktop e celular.
- Navegação contém apenas os módulos previstos no MVP.
- Estados de IA, humano e transferência são fáceis de distinguir.
- Nenhuma ação simulada dispara mensagens reais.

## 5. Segundo marco: domínio e backend jurídicos

### Entidades preservadas da base

- Tenant, User, Team e TeamMember.
- WaInstance e MetaInstance.
- Contact, Ticket, TicketEvent e Message.
- Tag, QuickResponse e ScheduledMessage.
- Knowledge e KnowledgeLog.
- Campaign e dados relacionados já existentes no código.

### Entidades novas ou adaptadas

- `LegalLead`: qualificação e etapa comercial. **Implementado.**
- `LegalMatter`: caso ou demanda jurídica vinculada ao cliente. **Implementado.**
- `LegalParty`: partes e respectivos papéis.
- `LegalTask`: próxima ação, prazo interno ou compromisso. **Implementado.**
- `LegalDocument`: metadados e vínculo dos arquivos. **Implementado.**
- `AiConversationState`: modo, classificação, resumo e regras de transferência.
- `ConsentRecord`: origem, finalidade, data e situação do contato.

Processo judicial completo, integrações com tribunais, financeiro de honorários e agenda externa ficam fora do primeiro MVP, salvo exigência expressa do escritório.

## 6. Terceiro marco: IA real

### Arquitetura

- Criar um adaptador comum de provedor com operações de resposta, classificação, resumo e extração estruturada.
- Manter chaves de API somente no backend.
- Registrar provedor, modelo, duração, consumo, custo estimado e resultado de cada execução.
- Implementar limite por empresa e mecanismo de interrupção global.

### Comportamentos iniciais

- Saudação e identificação do motivo do contato.
- Classificação da área jurídica.
- Perguntas de qualificação aprovadas pelo escritório.
- Extração dos dados para o CRM.
- Consulta à base de conhecimento aprovada.
- Resumo e encaminhamento para atendimento humano.
- Recusa ou transferência quando a pergunta estiver fora do escopo permitido.

### Observação sobre contas Pro

O projeto não dependerá da interface web das assinaturas Claude Pro ou ChatGPT Pro. A integração será preparada para APIs oficiais, com credenciais e faturamento próprios do provedor. Antes da ativação, será confirmado no console de cada fornecedor quais acessos e créditos estão disponíveis.

## 7. Quarto marco: WhatsApp e campanhas reais

- Revalidar conexão, webhooks e envio pela Evolution API.
- Garantir idempotência para não duplicar mensagens ou leads.
- Implementar fila, tentativas e limites de envio.
- Separar números e contatos de homologação dos dados reais.
- Validar pausa da IA quando um humano assumir.
- Validar descadastro, listas de bloqueio e interrupção de campanha.

## 8. Quinto marco: VPS e piloto

- Ambientes separados para homologação e produção.
- PostgreSQL com backup automático e teste de restauração.
- HTTPS, firewall, segredos fora do repositório e acesso administrativo restrito.
- Logs da aplicação sem expor conteúdo sensível desnecessariamente.
- Monitoramento de disponibilidade, filas e falhas de integração.
- Política de retenção de mensagens, documentos e logs definida com o escritório.
- Piloto inicial com poucos usuários, um número de WhatsApp e áreas jurídicas selecionadas.

## 9. Fora do MVP inicial

- Ordens de serviço e equipamentos.
- Sincronização Firebird.
- Faturamento técnico da LCD Digital.
- Prospecção automática por busca externa.
- Integração automática com tribunais.
- Gestão financeira e cobrança de honorários.
- Assinatura eletrônica.
- Aplicativo móvel nativo.

## 10. Sequência recomendada de execução

1. Criar branch de trabalho e registrar a identidade temporária do produto.
2. Simplificar rotas e menu sem apagar módulos antigos imediatamente.
3. Construir o teste visual com dados jurídicos simulados.
4. Validar o protótipo com o contratante e registrar alterações.
5. Criar migrações e APIs do domínio jurídico.
6. Conectar o frontend à API e validar oportunidades, casos, tarefas e histórico.
7. Conectar IA em ambiente local ou de homologação.
8. Conectar um WhatsApp de teste e validar atendimento híbrido.
9. Validar campanhas com uma lista controlada.
10. Preparar VPS e publicar homologação.
11. Executar piloto, corrigir falhas e somente depois liberar produção.

## 11. Decisões necessárias antes da integração real

- Nome e identidade visual provisória do sistema.
- Áreas jurídicas atendidas no piloto.
- Perguntas obrigatórias de qualificação para cada área.
- Situações que exigem transferência imediata para um humano.
- Campos obrigatórios do cliente e da oportunidade.
- Papéis e permissões dos usuários.
- Provedor de IA escolhido para a primeira homologação.
- Número de WhatsApp destinado aos testes.
- Forma atual de hospedagem da Evolution API.
