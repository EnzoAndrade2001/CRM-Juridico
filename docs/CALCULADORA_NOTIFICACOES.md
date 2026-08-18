# Notificações da calculadora revisional

Quando o visitante conclui a calculadora da landing page, o backend:

1. valida nome, WhatsApp/e-mail, dados da simulação e consentimento;
2. grava a submissão no modelo `CalculatorSubmission` do escritório;
3. tenta enviar o resultado para o WhatsApp informado usando a instância conectada da Evolution API;
4. tenta enviar o mesmo resultado para o e-mail informado usando Resend;
5. registra o status geral (`sent`, `partial` ou `pending`) e o detalhe de eventuais falhas.

## Configuração mínima

No ambiente do backend, configure o tenant que recebe os contatos:

```env
PUBLIC_CALCULATOR_TENANT_SLUG=crm-juridico
```

O slug precisa ser o slug real do escritório na tabela `Tenant`.

## WhatsApp

O envio usa as credenciais de Evolution API já salvas em `TenantSettings` (`evolutionUrl` e `evolutionKey`) e a primeira instância do escritório com status `connected`.

Portanto, basta conectar a instância no CRM. Não existe número fixo no código da landing page.

## E-mail

O e-mail usa a API do Resend:

```env
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM_EMAIL="Pedro Bastos Lund <contato@seudominio.com.br>"
```

O domínio usado em `RESEND_FROM_EMAIL` precisa estar verificado no Resend. Se o Resend não estiver configurado, a submissão continua sendo salva e o resultado continua aparecendo na tela; apenas o canal de e-mail fica como `not_configured`.

## Endpoint público

```text
POST /api/public/calculator-leads
```

Esse endpoint não exige login porque é usado pela landing page. Ele possui validação de campos, honeypot e limite básico por endereço IP. O consentimento do visitante é obrigatório antes de qualquer notificação.
