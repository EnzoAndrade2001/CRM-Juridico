import { useEffect } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Check,
  FileSearch,
  Landmark,
  MessageCircle,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import portrait from '../assets/pedro-bastos-lund.jpg';
import logo from '../assets/pedro-bastos-lund-logo.jpg';
import './bank-review-landing.css';

const whatsappMessage = 'Olá, vim pela página de Revisional Bancário e gostaria de solicitar uma análise do meu contrato.';
const whatsappNumber = (import.meta.env.VITE_LANDING_WHATSAPP || '').replace(/\D/g, '');
const whatsappUrl = whatsappNumber
  ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`
  : `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;

const reviewItems = [
  {
    icon: Banknote,
    title: 'Empréstimos e consignados',
    text: 'Avaliação das condições contratadas, encargos e evolução do saldo devedor.',
  },
  {
    icon: Landmark,
    title: 'Financiamentos',
    text: 'Análise técnica de contratos de veículos, imóveis e outras operações bancárias.',
  },
  {
    icon: FileSearch,
    title: 'Cobranças e contratos',
    text: 'Verificação de tarifas, seguros, serviços agregados e cláusulas contratuais.',
  },
];

const steps = [
  ['01', 'Envie seu contrato', 'Fale conosco pelo WhatsApp e conte brevemente a sua situação.'],
  ['02', 'Receba uma análise', 'A documentação é avaliada de forma técnica e individualizada.'],
  ['03', 'Conheça os caminhos', 'Você recebe uma orientação clara sobre as medidas juridicamente possíveis.'],
];

function WhatsAppLink({ children, className = '', label }) {
  return (
    <a
      className={className}
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={label || 'Conversar sobre revisional bancário pelo WhatsApp'}
    >
      {children}
    </a>
  );
}

export default function BankReviewLanding() {
  useEffect(() => {
    const previousTitle = document.title;
    let description = document.querySelector('meta[name="description"]');
    const createdDescription = !description;
    if (!description) {
      description = document.createElement('meta');
      description.setAttribute('name', 'description');
      document.head.appendChild(description);
    }
    const previousDescription = description?.getAttribute('content');

    document.title = 'Revisional Bancário | Pedro Bastos Lund Advocacia';
    description?.setAttribute(
      'content',
      'Análise jurídica de contratos bancários, empréstimos e financiamentos. Atendimento direto com Pedro Bastos Lund Advocacia.',
    );

    return () => {
      document.title = previousTitle;
      if (createdDescription) description.remove();
      else if (previousDescription) description.setAttribute('content', previousDescription);
    };
  }, []);

  return (
    <main className="bank-page">
      <header className="bank-header">
        <a className="bank-brand" href="#inicio" aria-label="Pedro Bastos Lund Advocacia — início">
          <span className="bank-brand__mark"><img src={logo} alt="" /></span>
          <span><strong>Pedro Bastos Lund</strong><small>Advocacia e Consultoria Jurídica</small></span>
        </a>
        <nav className="bank-nav" aria-label="Navegação principal">
          <a href="#revisional">Revisional bancário</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#sobre">Sobre</a>
        </nav>
        <WhatsAppLink className="bank-header__cta">
          <MessageCircle size={18} /> Falar no WhatsApp
        </WhatsAppLink>
      </header>

      <section
        id="inicio"
        className="bank-hero"
        style={{ '--bank-hero-image': `url(${portrait})` }}
      >
        <div className="bank-shell bank-hero__inner">
          <div className="bank-hero__copy">
            <p className="bank-eyebrow"><span /> Desconfia de juros abusivos?</p>
            <h1>
              <span>Juros bancários</span>{' '}
              <span>altos demais?</span>{' '}
              <em><span>Seu contrato</span>{' '}<span>pode ser revisado.</span></em>
            </h1>
            <p className="bank-hero__lead">
              Taxas elevadas, cobranças que você não reconhece ou parcelas pesando no orçamento? Uma análise técnica mostra o que pode ser questionado.
            </p>
            <WhatsAppLink className="bank-button bank-button--gold">
              Quero analisar meu contrato <ArrowRight size={19} />
            </WhatsAppLink>
            <div className="bank-hero__assurances" aria-label="Características do atendimento">
              <span><Check size={15} /> Atendimento individual</span>
              <span><Check size={15} /> Análise responsável</span>
              <span><Check size={15} /> Orientação clara</span>
            </div>
          </div>
          <p className="bank-hero__name"><span>Pedro Bastos Lund</span> Advogado</p>
        </div>
      </section>

      <section className="bank-intro" id="revisional">
        <div className="bank-shell bank-intro__grid">
          <div>
            <p className="bank-kicker">Não pague sem entender</p>
            <h2>Parcelas pesando no bolso? Descubra o que está por trás dos valores cobrados.</h2>
          </div>
          <div className="bank-intro__text">
            <p>
              Juros muito acima do esperado, tarifas, seguros e serviços agregados podem aumentar consideravelmente uma dívida. A análise revisional verifica as condições contratadas e aponta quais cobranças merecem atenção.
            </p>
            <p className="bank-note"><ShieldCheck size={20} /> Cada contrato é analisado individualmente. A viabilidade depende dos documentos e das circunstâncias de cada caso.</p>
          </div>
        </div>
      </section>

      <section className="bank-review">
        <div className="bank-shell">
          <div className="bank-section-heading">
            <p className="bank-kicker">O que pode ser analisado</p>
            <h2>Encontre respostas antes de continuar pagando no escuro.</h2>
          </div>
          <div className="bank-review__cards">
            {reviewItems.map(({ icon: Icon, title, text }, index) => (
              <article className="bank-review-card" key={title}>
                <span className="bank-review-card__number">0{index + 1}</span>
                <span className="bank-review-card__icon"><Icon size={25} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bank-process" id="como-funciona">
        <div className="bank-shell bank-process__grid">
          <div className="bank-process__heading">
            <p className="bank-kicker bank-kicker--light">Como funciona</p>
            <h2>Um atendimento simples, direto e transparente.</h2>
            <p>O primeiro contato é feito pelo WhatsApp. A partir dele, entendemos o caso e indicamos os documentos necessários.</p>
            <WhatsAppLink className="bank-text-link">
              Iniciar atendimento <ArrowRight size={18} />
            </WhatsAppLink>
          </div>
          <div className="bank-steps">
            {steps.map(([number, title, text]) => (
              <article className="bank-step" key={number}>
                <span>{number}</span>
                <div><h3>{title}</h3><p>{text}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bank-about" id="sobre">
        <div className="bank-shell bank-about__grid">
          <div className="bank-about__portrait">
            <img src={portrait} alt="Advogado Pedro Bastos Lund" />
            <span><BadgeCheck size={17} /> Atendimento profissional e individualizado</span>
          </div>
          <div className="bank-about__copy">
            <p className="bank-kicker">Atendimento jurídico</p>
            <h2>Pedro Bastos Lund</h2>
            <p className="bank-about__role">Advocacia e Consultoria Jurídica</p>
            <p>
              Atuação dedicada a quem precisa entender e enfrentar cobranças bancárias, com análise responsável, comunicação acessível e acompanhamento próximo em cada etapa.
            </p>
            <blockquote>“Informação clara é o primeiro passo para uma decisão jurídica segura.”</blockquote>
            <WhatsAppLink className="bank-button bank-button--navy">
              Conversar com o escritório <MessageCircle size={19} />
            </WhatsAppLink>
          </div>
        </div>
      </section>

      <section className="bank-final-cta">
        <div className="bank-shell bank-final-cta__inner">
          <span className="bank-final-cta__icon"><Scale size={30} /></span>
          <div>
            <p className="bank-kicker bank-kicker--light">Fale com o escritório</p>
            <h2>Não continue pagando sem entender cada cobrança.</h2>
            <p>Envie seu contrato e solicite uma avaliação inicial da sua situação.</p>
          </div>
          <WhatsAppLink className="bank-button bank-button--gold">
            Quero uma análise <ArrowRight size={19} />
          </WhatsAppLink>
        </div>
      </section>

      <footer className="bank-footer">
        <div className="bank-shell bank-footer__inner">
          <div className="bank-footer__brand">
            <span className="bank-footer__mark"><img src={logo} alt="" /></span>
            <span><strong>Pedro Bastos Lund</strong><small>Advocacia e Consultoria Jurídica</small></span>
          </div>
          <p>Conteúdo informativo. A análise jurídica e os resultados possíveis dependem das particularidades de cada caso.</p>
          <span>© {new Date().getFullYear()} Pedro Bastos Lund</span>
        </div>
      </footer>

      <WhatsAppLink className="bank-whatsapp-float" label="Abrir conversa no WhatsApp">
        <MessageCircle size={25} fill="currentColor" />
        <span>Fale conosco</span>
      </WhatsAppLink>
    </main>
  );
}
