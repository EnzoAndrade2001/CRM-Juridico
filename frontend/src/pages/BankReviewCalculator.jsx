import { useState } from 'react';
import { ArrowRight, Calculator, Check, CircleAlert } from 'lucide-react';
import { submitPublicCalculatorLead } from '../services/api';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const contractTypes = [
  'Financiamento veicular',
  'Cartão de crédito',
  'Empréstimo',
  'Busca e apreensão',
];

const emptyForm = {
  financing: '',
  installment: '',
  totalInstallments: '',
  paidInstallments: '',
  bank: '',
  contractType: '',
  name: '',
  email: '',
  phone: '',
  consent: false,
};

function formatCurrencyInput(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? currencyFormatter.format(Number(digits) / 100) : '';
}

function parseCurrency(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? Number(digits) / 100 : 0;
}

function parseInteger(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}

function formatResult(value) {
  return currencyFormatter.format(Math.max(0, value));
}

export default function BankReviewCalculator({ whatsappUrl }) {
  const [form, setForm] = useState(emptyForm);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [submissionState, setSubmissionState] = useState('idle');

  function updateField(name, value) {
    const nextValue = name === 'financing' || name === 'installment'
      ? formatCurrencyInput(value)
      : name === 'totalInstallments' || name === 'paidInstallments'
        ? String(value || '').replace(/\D/g, '')
        : value;
    setForm((current) => ({ ...current, [name]: nextValue }));
    if (error) setError('');
  }

  async function calculate(event) {
    event.preventDefault();
    const financing = parseCurrency(form.financing);
    const installment = parseCurrency(form.installment);
    const totalInstallments = parseInteger(form.totalInstallments);
    const paidInstallments = parseInteger(form.paidInstallments);
    const normalizedEmail = form.email.trim().toLowerCase();
    const phoneDigits = form.phone.replace(/\D/g, '');

    if (!form.name.trim()) {
      setError('Informe seu nome para receber o resultado.');
      setResult(null);
      return;
    }
    if (!financing || !installment || !totalInstallments) {
      setError('Informe o valor financiado, o valor da parcela e o total de parcelas.');
      setResult(null);
      return;
    }
    if (!normalizedEmail && !phoneDigits) {
      setError('Informe um WhatsApp ou e-mail para receber o retorno da simulação.');
      setResult(null);
      return;
    }
    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Informe um e-mail válido ou deixe esse campo em branco.');
      setResult(null);
      return;
    }
    if (phoneDigits && phoneDigits.length < 10) {
      setError('Informe um WhatsApp válido com DDD.');
      setResult(null);
      return;
    }
    if (!form.consent) {
      setError('Autorize o contato para receber o resultado da simulação.');
      setResult(null);
      return;
    }
    if (paidInstallments > totalInstallments) {
      setError('O número de parcelas pagas não pode ser maior que o total contratado.');
      setResult(null);
      return;
    }

    // Mantém a mesma lógica de estimativa da referência: metade da parcela atual
    // acrescida de R$ 7,50. É uma simulação inicial, não um recálculo pericial.
    const estimatedInstallment = installment / 2 + 7.5;
    const monthlySavings = Math.max(0, installment - estimatedInstallment);
    const remainingInstallments = Math.max(0, totalInstallments - paidInstallments);

    const calculatedResult = {
      estimatedInstallment,
      monthlySavings,
      totalSavings: monthlySavings * remainingInstallments,
      remainingInstallments,
      reductionPercent: installment ? (monthlySavings / installment) * 100 : 0,
    };
    setResult(calculatedResult);
    setSubmissionState('sending');
    try {
      const response = await submitPublicCalculatorLead({
        name: form.name.trim(),
        email: normalizedEmail || null,
        phone: form.phone || null,
        financing,
        installment,
        totalInstallments,
        paidInstallments,
        bank: form.bank.trim() || null,
        contractType: form.contractType || null,
        consent: form.consent,
        estimatedInstallment,
        monthlySavings,
        totalSavings: calculatedResult.totalSavings,
        remainingInstallments,
      });
      setSubmissionState(response.data?.stored ? 'received' : 'unavailable');
    } catch {
      // O resultado local continua disponível mesmo quando o backend ainda não
      // tem um tenant ou provedor de mensagens configurado.
      setSubmissionState('unavailable');
    }
  }

  return (
    <section className="bank-calculator" id="calculadora">
      <div className="bank-shell bank-calculator__grid">
        <div className="bank-calculator__copy">
          <p className="bank-kicker"><span /> Simulação inicial</p>
          <h2>Veja uma estimativa do que pode ser revisto no seu contrato.</h2>
          <p>
            Informe os dados básicos da sua operação e visualize uma estimativa de parcela após a revisão. O resultado serve como orientação inicial e não substitui a análise jurídica individual do contrato.
          </p>
          <div className="bank-calculator__benefits">
            <span><Check size={16} /> Resultado imediato na tela</span>
            <span><Check size={16} /> Sem compromisso</span>
            <span><Check size={16} /> Análise responsável do contrato</span>
          </div>
        </div>

        <div className="bank-calculator__card">
          <div className="bank-calculator__card-heading">
            <span className="bank-calculator__icon"><Calculator size={22} /></span>
            <div>
              <h3>Calculadora revisional</h3>
              <p>Preencha os campos para simular uma possível redução.</p>
            </div>
          </div>

          <form onSubmit={calculate} noValidate>
            <div className="bank-calculator__fields bank-calculator__fields--two">
              <label>
                <span>Valor financiado</span>
                <input inputMode="decimal" value={form.financing} onChange={(event) => updateField('financing', event.target.value)} placeholder="R$ 0,00" />
              </label>
              <label>
                <span>Valor da parcela</span>
                <input required inputMode="decimal" value={form.installment} onChange={(event) => updateField('installment', event.target.value)} placeholder="R$ 0,00" />
              </label>
            </div>

            <div className="bank-calculator__fields bank-calculator__fields--two">
              <label>
                <span>Total de parcelas</span>
                <input required inputMode="numeric" value={form.totalInstallments} onChange={(event) => updateField('totalInstallments', event.target.value)} placeholder="Ex.: 48" />
              </label>
              <label>
                <span>Parcelas já pagas</span>
                <input inputMode="numeric" value={form.paidInstallments} onChange={(event) => updateField('paidInstallments', event.target.value)} placeholder="Ex.: 12" />
              </label>
            </div>

            <label className="bank-calculator__field">
              <span>Banco ou instituição financeira</span>
              <input value={form.bank} onChange={(event) => updateField('bank', event.target.value)} placeholder="Ex.: Banco do Brasil" />
            </label>

            <div className="bank-calculator__fields bank-calculator__fields--two bank-calculator__contact-fields">
              <label>
                <span>Seu nome</span>
                <input required value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Nome completo" />
              </label>
              <label>
                <span>WhatsApp</span>
                <input inputMode="tel" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="(51) 99999-9999" />
              </label>
            </div>

            <label className="bank-calculator__field">
              <span>E-mail</span>
              <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="voce@email.com" />
            </label>

            <fieldset className="bank-calculator__type">
              <legend>Qual o tipo do seu contrato?</legend>
              <div className="bank-calculator__contract-options">
                {contractTypes.map((type) => (
                  <button key={type} type="button" className={form.contractType === type ? 'is-selected' : ''} onClick={() => updateField('contractType', form.contractType === type ? '' : type)}>{type}</button>
                ))}
              </div>
            </fieldset>

            <label className="bank-calculator__consent">
              <input type="checkbox" checked={form.consent} onChange={(event) => updateField('consent', event.target.checked)} />
              <span>Autorizo o escritório a usar estes dados para enviar o resultado da simulação e entrar em contato sobre a análise do contrato.</span>
            </label>

            {error && <p className="bank-calculator__error" role="alert"><CircleAlert size={16} /> {error}</p>}

            <button type="submit" className="bank-button bank-button--gold bank-calculator__submit" disabled={submissionState === 'sending'}>
              {submissionState === 'sending' ? 'Enviando dados...' : 'Calcular e receber retorno'} <ArrowRight size={18} />
            </button>
          </form>

          {result && (
            <div className="bank-calculator__result" aria-live="polite">
              <p className="bank-calculator__result-kicker">Estimativa de nova parcela</p>
              <strong>{formatResult(result.estimatedInstallment)}</strong>
              <div className="bank-calculator__result-grid">
                <span>Economia mensal estimada <b>{formatResult(result.monthlySavings)}</b></span>
                <span>Possível economia restante <b>{formatResult(result.totalSavings)}</b></span>
              </div>
              <p>Simulação de até {result.reductionPercent.toFixed(0)}% de redução sobre a parcela informada, considerando {result.remainingInstallments} parcela(s) restante(s).</p>
              <small>O resultado é apenas informativo. A existência de valores revisáveis depende da análise do contrato e dos documentos do caso.</small>
              {submissionState === 'received' && <p className="bank-calculator__submission bank-calculator__submission--success">Recebemos seus dados. O retorno será enviado pelo WhatsApp ou e-mail informado.</p>}
              {submissionState === 'unavailable' && <p className="bank-calculator__submission">A simulação foi concluída. O envio automático será ativado assim que o canal de contato do escritório estiver configurado.</p>}
              <a className="bank-button bank-button--navy" href={whatsappUrl} target="_blank" rel="noreferrer">Solicitar análise do contrato <ArrowRight size={17} /></a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
