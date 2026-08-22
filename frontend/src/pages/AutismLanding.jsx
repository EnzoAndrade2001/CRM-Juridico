import { useEffect } from 'react';
import {
  ArrowRight,
  Check,
  GraduationCap,
  HeartHandshake,
  Landmark,
  MessageCircle,
  Scale,
  ShieldCheck,
} from 'lucide-react';
import portrait from '../assets/pedro-bastos-lund-hero-hq.png';
import aboutPortrait from '../assets/pedro-bastos-lund-about.jpg';
import logo from '../assets/pedro-bastos-lund-monogram.png';
import './autism-landing.css';

const whatsappMessage = 'Olá, vim pela página sobre direitos da pessoa autista e gostaria de orientação sobre a minha situação.';
// Número oficial da instância LUND/PBL. Todos os CTAs da landing usam o
// mesmo destino para que o cliente caia diretamente na triagem da IA.
const whatsappNumber = '555193665581';
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

const reviewItems = [
  {
    icon: HeartHandshake,
    title: 'Plano de saúde',
    text: 'Negativa ou limitação de cobertura de terapias como ABA, fonoaudiologia, terapia ocupacional e psicomotricidade.',
  },
  {
    icon: Landmark,
    title: 'BPC/LOAS',
    text: 'Orientação sobre o benefício assistencial ao autista com indeferimento indevido ou cessação pelo INSS.',
  },
  {
    icon: GraduationCap,
    title: 'Inclusão escolar',
    text: 'Direito à educação inclusiva, acompanhante especializado e adaptações necessárias na escola.',
  },
  {
    icon: Scale,
    title: 'Curatela e apoio',
    text: 'Curatela e tomada de decisão apoiada para a fase adulta, conforme a necessidade de cada pessoa.',
  },
];

const steps = [
  ['01', 'Conte a sua situação', 'Explique brevemente o que está acontecendo — negativa, dúvida ou pedido negado.'],
  ['02', 'Organize os documentos', 'Orientamos quais laudos, relatórios e documentos são importantes para o caso.'],
  ['03', 'Conheça os caminhos possíveis', 'Você entende as medidas juridicamente cabíveis antes de decidir como seguir.'],
];

function WhatsAppLink({ children, className = '', label }) {
  return (
    <a
      className={className}
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={label || 'Conversar sobre direitos da pessoa autista pelo WhatsApp'}
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

export default function AutismLanding() {
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

    document.title = 'Direitos da Pessoa Autista | Pedro Bastos Lund Advocacia';
    description?.setAttribute(
      'content',
      'Orientação jurídica sobre negativa de plano de saúde, BPC/LOAS, inclusão escolar e curatela para pessoas com TEA. Atendimento direto com Pedro Bastos Lund Advocacia.',
    );

    return () => {
      document.title = previousTitle;
      if (createdDescription) description.remove();
      else if (previousDescription) description.setAttribute('content', previousDescription);
    };
  }, []);

  return (
    <main className="autism-page">
      <header className="autism-header">
        <a className="autism-brand" href="#inicio" aria-label="Pedro Bastos Lund Advocacia — início">
          <span className="autism-brand__mark"><img src={logo} alt="" /></span>
          <span><strong>Pedro Bastos Lund</strong><small>Advocacia e Consultoria Jurídica</small></span>
        </a>
        <nav className="autism-nav" aria-label="Navegação principal">
          <a href="#direitos">Direitos da pessoa autista</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#sobre">Sobre</a>
        </nav>
        <WhatsAppLink className="autism-header__cta">
          <MessageCircle size={18} /> Falar no WhatsApp
        </WhatsAppLink>
      </header>

      <section
        id="inicio"
        className="autism-hero"
        style={{ '--autism-hero-image': `url(${portrait})` }}
      >
        <div className="autism-shell autism-hero__inner">
          <div className="autism-hero__copy">
            <p className="autism-eyebrow"><span /> Direitos da pessoa com TEA</p>
            <h1>
              <span>O plano negou a terapia?</span>{' '}
              <em><span>Você não precisa</span>{' '}<span>aceitar isso.</span></em>
            </h1>
            <p className="autism-hero__lead">
              Pessoas com Transtorno do Espectro Autista têm direitos garantidos por lei — cobertura de terapias pelo plano de saúde, BPC/LOAS, inclusão escolar e prioridade de atendimento. Quando esses direitos são negados, há caminhos jurídicos para revertê-los.
            </p>
            <WhatsAppLink className="autism-button autism-button--gold">
              QUERO ORIENTAÇÃO <ArrowRight size={19} />
            </WhatsAppLink>
            <div className="autism-hero__assurances" aria-label="Características do atendimento">
              <span><Check size={15} /> Atendimento humanizado</span>
              <span><Check size={15} /> Análise individual</span>
              <span><Check size={15} /> Acompanhamento próximo</span>
            </div>
          </div>
          <p className="autism-hero__name"><span>Pedro Bastos Lund</span> Advogado</p>
        </div>
      </section>

      <section className="autism-intro" id="direitos">
        <div className="autism-shell autism-intro__grid">
          <div>
            <p className="autism-kicker">Lei 12.764/2012 e Lei 13.146/2015</p>
            <h2>A pessoa com TEA é considerada pessoa com deficiência para todos os efeitos legais.</h2>
          </div>
          <div className="autism-intro__text">
            <p>
              Isso garante direitos como prioridade de atendimento, cobertura de terapias pelo plano de saúde, benefício assistencial (BPC/LOAS) e inclusão escolar com os apoios necessários. Na prática, esses direitos são negados com frequência — e é possível contestar essas negativas.
            </p>
            <p className="autism-note"><ShieldCheck size={20} /> Cada situação é analisada de forma individual. As medidas possíveis dependem dos documentos, laudos e do histórico do caso.</p>
          </div>
        </div>
      </section>

      <section className="autism-review">
        <div className="autism-shell">
          <div className="autism-section-heading">
            <p className="autism-kicker">Onde podemos ajudar</p>
            <h2>As frentes mais comuns em que a orientação jurídica faz diferença.</h2>
          </div>
          <div className="autism-review__cards">
            {reviewItems.map(({ icon: Icon, title, text }, index) => (
              <article className="autism-review-card" key={title}>
                <span className="autism-review-card__number">0{index + 1}</span>
                <span className="autism-review-card__icon"><Icon size={25} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="autism-process" id="como-funciona">
        <div className="autism-shell autism-process__grid">
          <div className="autism-process__heading">
            <p className="autism-kicker autism-kicker--light">Como funciona</p>
            <h2>Um atendimento simples, direto e acolhedor.</h2>
            <p>O atendimento inicial é realizado pelo WhatsApp. Entendemos a situação com calma e orientamos sobre os documentos e laudos necessários para avaliar o caso.</p>
            <WhatsAppLink className="autism-text-link">
              Iniciar atendimento <ArrowRight size={18} />
            </WhatsAppLink>
          </div>
          <div className="autism-steps">
            {steps.map(([number, title, text]) => (
              <article className="autism-step" key={number}>
                <span>{number}</span>
                <div><h3>{title}</h3><p>{text}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="autism-about" id="sobre">
        <div className="autism-shell autism-about__grid">
          <div className="autism-about__portrait">
            <img src={aboutPortrait} alt="Advogado Pedro Bastos Lund" />
            <div className="autism-about__identity">
              <strong>Pedro Bastos Lund</strong>
              <span>OAB/RS 74.953</span>
            </div>
          </div>
          <div className="autism-about__copy">
            <p className="autism-kicker">Atendimento jurídico</p>
            <h2>Pedro Bastos Lund</h2>
            <p className="autism-about__role">Advocacia e Consultoria Jurídica</p>
            <p>
              Atuação dedicada a famílias que enfrentam negativas de direitos relacionados ao TEA, com análise responsável, comunicação clara e acompanhamento próximo em cada etapa — do primeiro contato até a solução do caso.
            </p>
            <blockquote>“Conhecer os direitos da pessoa autista é o primeiro passo para não aceitar uma negativa indevida.”</blockquote>
            <WhatsAppLink className="autism-button autism-button--navy">
              Conversar com o escritório <MessageCircle size={19} />
            </WhatsAppLink>
          </div>
        </div>
      </section>

      <section className="autism-final-cta">
        <div className="autism-shell autism-final-cta__inner">
          <span className="autism-final-cta__icon"><Scale size={30} /></span>
          <div>
            <p className="autism-kicker autism-kicker--light">Fale com o escritório</p>
            <h2>Não enfrente essa negativa sozinho.</h2>
            <p>Conte a sua situação e receba orientação sobre os próximos passos possíveis.</p>
          </div>
          <WhatsAppLink className="autism-button autism-button--gold">
            Quero orientação <ArrowRight size={19} />
          </WhatsAppLink>
        </div>
      </section>

      <footer className="autism-footer">
        <div className="autism-shell autism-footer__inner">
          <div className="autism-footer__brand">
            <span className="autism-footer__mark"><img src={logo} alt="" /></span>
            <span><strong>Pedro Bastos Lund</strong><small>Advocacia e Consultoria Jurídica</small></span>
          </div>
          <p>Conteúdo informativo. A análise jurídica e as medidas possíveis dependem das particularidades de cada caso.</p>
          <span>© {new Date().getFullYear()} Pedro Bastos Lund</span>
        </div>
      </footer>

      <WhatsAppLink className="autism-whatsapp-float" label="Abrir conversa no WhatsApp">
        <WhatsAppIcon />
        <span>Fale conosco</span>
      </WhatsAppLink>
    </main>
  );
}
