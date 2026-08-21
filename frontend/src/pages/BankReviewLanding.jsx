import { useEffect } from 'react';
import {
  ArrowRight,
  Banknote,
  CarFront,
  Check,
  FileSearch,
  Landmark,
  MessageCircle,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import portrait from '../assets/pedro-bastos-lund-hero-hq.png';
import aboutPortrait from '../assets/pedro-bastos-lund-about.jpg';
import logo from '../assets/pedro-bastos-lund-monogram.png';
import BankReviewCalculator from './BankReviewCalculator';
import './bank-review-landing.css';

const whatsappMessage = 'Olá, vim pela página de Revisional Bancário e gostaria de solicitar uma análise do meu contrato.';
// Número oficial da instância LUND/PBL. Todos os CTAs da landing usam o
// mesmo destino para que o cliente caia diretamente na triagem da IA.
const whatsappNumber = '555193665581';
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

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
  {
    icon: CarFront,
    title: 'Busca e apreensão de veículos',
    text: 'Orientação jurídica para quem recebeu uma ordem de busca e apreensão ou enfrenta risco de perder o veículo.',
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

function WhatsAppIcon({ size = 25 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20.25 11.6a8.25 8.25 0 0 1-12.18 7.25L3.7 20.3l1.43-4.2A8.25 8.25 0 1 1 20.25 11.6Z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.15 7.5c.2-.45.42-.46.75-.47h.62c.2 0 .4.07.51.36l.78 1.9c.08.2.05.4-.08.57l-.6.78c-.13.17-.13.34-.03.51.43.76 1.08 1.42 1.82 1.87.18.11.36.1.5-.06l.84-.97c.15-.17.35-.2.55-.12l1.87.88c.24.11.35.25.33.48-.06.76-.42 1.47-1.02 1.93-.47.36-1.08.49-1.66.35-1.22-.3-2.83-1.09-4.24-2.48-1.17-1.16-1.94-2.44-2.27-3.47-.2-.61-.11-1.29.24-1.83.2-.31.39-.45.59-.23Z" fill="currentColor" />
    </svg>
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
          <a href="#calculadora">Calculadora</a>
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
              Você pode ter valores a recuperar junto ao banco. Uma análise jurídica do contrato pode identificar juros e cobranças indevidas, além de verificar a possibilidade de restituição das quantias pagas a maior.
            </p>
            <WhatsAppLink className="bank-button bank-button--gold">
              REVISAR MEU CONTRATO <ArrowRight size={19} />
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

      <BankReviewCalculator whatsappUrl={whatsappUrl} />

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
            <p>O atendimento inicial é realizado pelo WhatsApp. Após a compreensão preliminar da demanda, orientamos sobre os documentos necessários para a análise jurídica do caso.</p>
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
            <img src={aboutPortrait} alt="Advogado Pedro Bastos Lund" />
            <div className="bank-about__identity">
              <strong>Pedro Bastos Lund</strong>
              <span>OAB/RS 74.953</span>
            </div>
          </div>
          <div className="bank-about__copy">
            <p className="bank-kicker">Atendimento jurídico</p>
            <h2>Pedro Bastos Lund</h2>
            <p className="bank-about__role">Advocacia e Consultoria Jurídica</p>
            <p>
              Atuação dedicada a quem precisa entender e enfrentar cobranças bancárias, com análise responsável, comunicação acessível e acompanhamento próximo em cada etapa.
            </p>
            <blockquote>“Uma defesa jurídica eficaz começa pela análise criteriosa do contrato e das cobranças que comprometem o seu patrimônio.”</blockquote>
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
        <WhatsAppIcon />
        <span>Fale conosco</span>
      </WhatsAppLink>
    </main>
  );
}
