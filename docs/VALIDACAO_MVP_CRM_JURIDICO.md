# Validação do MVP — CRM Jurídico

Atualizado em 20/08/2026. Esta lista separa o que já foi validado no código do que ainda precisa ser conferido no ambiente da VPS.

## Validações automatizadas

- Backend: **76 testes aprovados**, nenhum erro.
- Frontend: `npm run build` concluído com sucesso.
- Prisma: `npx prisma validate` concluído com sucesso.
- Higiene do patch: `git diff --check` sem problemas.

## Módulos funcionais no ambiente real

| Módulo | Situação |
| --- | --- |
| Login e isolamento do escritório | JWT, tenant e rotas protegidas implementados. |
| Visão geral | Indicadores, funil, tarefas e atividades carregados pela API jurídica. |
| Clientes | Cadastro, edição, busca, duplicidade, dossiê e vínculos implementados. |
| Atendimentos | Inbox real, mensagens, notas, anexos, atribuição, resolução e reabertura. |
| Concluídos | Atendimento resolvido sai da fila ativa e aparece na aba de concluídos; pode ser reaberto. |
| CRM jurídico | Oportunidades, etapas, conversão em caso e tarefas. |
| Documentos | Solicitação, upload privado, análise, aprovação/recusa, download autenticado e auditoria. |
| Base de conhecimento | CRUD conectado ao banco; conteúdo só deve ser publicado após revisão. |
| Conexões | Tela operacional para QR Code, estado da Evolution API e pareamento do WhatsApp. |
| Campanhas | Tela real ligada ao disparo existente por tag ou contatos selecionados, com progresso via Socket.IO. |

## Roteiro manual na VPS

1. Entrar em dois computadores ou navegadores diferentes e confirmar que ambos conseguem trabalhar no mesmo escritório.
2. Criar um cliente, editar seus dados e tentar cadastrar o mesmo telefone novamente para confirmar a mensagem de duplicidade.
3. Enviar uma mensagem de teste pelo WhatsApp, responder pelo Inbox e conferir atualização em tempo real.
4. Encerrar o atendimento, conferir a aba **Concluídos** e reabrir a conversa.
5. Abrir o cliente a partir do Inbox e criar uma oportunidade já vinculada ao `ticketId`.
6. Avançar a oportunidade, criar um caso e adicionar uma tarefa com prazo.
7. Solicitar um documento, anexar um PDF pequeno, aprovar/recusar e conferir o download autenticado.
8. Criar uma orientação na Base de conhecimento e deixá-la em revisão; a IA não deve ser ativada antes da configuração do provedor.
9. Na aba Conexões, confirmar que o número está conectado e que o QR Code pode ser regenerado após desconexão.
10. Fazer uma campanha para **um único contato de teste**, com intervalo mínimo de 3 segundos, e conferir enviados/falhas.
11. Conferir backup do PostgreSQL e a persistência dos volumes de uploads e da Evolution API.

## Pendências que não bloqueiam o MVP sem IA

- Configurar o provedor de IA e as regras de triagem/transferência para humano.
- Histórico persistido de campanhas, fila com pausa/cancelamento, consentimento e descadastro.
- Integração direta com mensagens do Instagram/Meta e registro de origem da publicação.
- Busca global, notificações e menu de perfil da casca jurídica ainda são itens de experiência, não do fluxo principal.
- O envio automático da calculadora pública por WhatsApp/e-mail depende das credenciais e do canal configurados.

Até a IA estar disponível, o atendimento deve permanecer em modo humano: o Inbox, o CRM, os documentos, as conexões e as campanhas básicas podem ser validados normalmente.
