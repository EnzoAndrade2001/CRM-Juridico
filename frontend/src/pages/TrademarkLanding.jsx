import { useEffect } from 'react';
import {
  ArrowRight,
  Check,
  FileText,
  MessageCircle,
  Scale,
  Search,
  ShieldCheck,
  Stamp,
} from 'lucide-react';
import portrait from '../assets/pedro-bastos-lund-hero-hq.png';
import aboutPortrait from '../assets/pedro-bastos-lund-about.jpg';
import logo from '../assets/pedro-bastos-lund-monogram.png';
import content from '../content/registro-de-marca.json';
import './trademark-landing.css';

// Mapa de nomes de ícone (guardados como texto no content JSON, editável
// pelo CMS) para os componentes reais do lucide-react.
const ICONS = { Search, Stamp, ShieldCheck, FileText };

const whatsappNumber = '555193665581';
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(content.whatsapp.message)}`;

function WhatsAppLink({ children, className = '', label }) {
  return (
    <a
      className={className}
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={label || 'Conversar sobre registro de marca pelo WhatsApp'}
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

export default function TrademarkLanding() {
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

    document.title = content.meta.title;
    description?.setAttribute('content', content.meta.description);

    return () => {
      document.title = previousTitle;
      if (createdDescription) description.remove();
      else if (previousDescription) description.setAttribute('content', previousDescription);
    };
  }, []);

  return (
    <main className="trademark-page">
      <header className="trademark-header">
        <a className="trademark-brand" href="#inicio" aria-label="Pedro Bastos Lund Advocacia — início">
          <span className="trademark-brand__mark"><img src={logo} alt="" /></span>
          <span><strong>Pedro Bastos Lund</strong><small>Advocacia e Consultoria Jurídica</small></span>
        </a>
        <nav className="trademark-nav" aria-label="Navegação principal">
          <a href="#marca">Registro de marca</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="#sobre">Sobre</a>
        </nav>
        <WhatsAppLink className="trademark-header__cta">
          <MessageCircle size={18} /> Falar no WhatsApp
        </WhatsAppLink>
      </header>

      <section
        id="inicio"
        className="trademark-hero"
        style={{ '--trademark-hero-image': `url(${portrait})` }}
      >
        <div className="trademark-shell trademark-hero__inner">
          <div className="trademark-hero__copy">
            <p className="trademark-eyebrow"><span /> {content.hero.eyebrow}</p>
            <h1>
              <span>{content.hero.titleStart}</span>{' '}
              <em><span>{content.hero.titleEmphasis}</span></em>
            </h1>
            <p className="trademark-hero__lead">{content.hero.lead}</p>
            <WhatsAppLink className="trademark-button trademark-button--gold">
              {content.hero.ctaLabel} <ArrowRight size={19} />
            </WhatsAppLink>
            <div className="trademark-hero__assurances" aria-label="Características do atendimento">
              {content.hero.assurances.map((item) => <span key={item}><Check size={15} /> {item}</span>)}
            </div>
          </div>
          <p className="trademark-hero__name"><span>Pedro Bastos Lund</span> Advogado</p>
        </div>
      </section>

      <section className="trademark-intro" id="marca">
        <div className="trademark-shell trademark-intro__grid">
          <div>
            <p className="trademark-kicker">{content.intro.kicker}</p>
            <h2>{content.intro.title}</h2>
          </div>
          <div className="trademark-intro__text">
            <p>{content.intro.text}</p>
            <p className="trademark-note"><ShieldCheck size={20} /> {content.intro.note}</p>
          </div>
        </div>
      </section>

      <section className="trademark-review">
        <div className="trademark-shell">
          <div className="trademark-section-heading">
            <p className="trademark-kicker">{content.review.kicker}</p>
            <h2>{content.review.title}</h2>
          </div>
          <div className="trademark-review__cards">
            {content.review.items.map(({ icon, title, text }, index) => {
              const Icon = ICONS[icon] || ShieldCheck;
              return (
                <article className="trademark-review-card" key={title}>
                  <span className="trademark-review-card__number">0{index + 1}</span>
                  <span className="trademark-review-card__icon"><Icon size={25} /></span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="trademark-process" id="como-funciona">
        <div className="trademark-shell trademark-process__grid">
          <div className="trademark-process__heading">
            <p className="trademark-kicker trademark-kicker--light">{content.process.kicker}</p>
            <h2>{content.process.title}</h2>
            <p>{content.process.text}</p>
            <WhatsAppLink className="trademark-text-link">
              {content.process.ctaLabel} <ArrowRight size={18} />
            </WhatsAppLink>
          </div>
          <div className="trademark-steps">
            {content.process.steps.map(({ number, title, text }) => (
              <article className="trademark-step" key={number}>
                <span>{number}</span>
                <div><h3>{title}</h3><p>{text}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="trademark-about" id="sobre">
        <div className="trademark-shell trademark-about__grid">
          <div className="trademark-about__portrait">
            <img src={aboutPortrait} alt="Advogado Pedro Bastos Lund" />
            <div className="trademark-about__identity">
              <strong>Pedro Bastos Lund</strong>
              <span>OAB/RS 74.953</span>
            </div>
          </div>
          <div className="trademark-about__copy">
            <p className="trademark-kicker">{content.about.kicker}</p>
            <h2>Pedro Bastos Lund</h2>
            <p className="trademark-about__role">{content.about.role}</p>
            <p>{content.about.text}</p>
            <blockquote>“{content.about.quote}”</blockquote>
            <WhatsAppLink className="trademark-button trademark-button--navy">
              {content.about.ctaLabel} <MessageCircle size={19} />
            </WhatsAppLink>
          </div>
        </div>
      </section>

      <section className="trademark-final-cta">
        <div className="trademark-shell trademark-final-cta__inner">
          <span className="trademark-final-cta__icon"><Scale size={30} /></span>
          <div>
            <p className="trademark-kicker trademark-kicker--light">{content.finalCta.kicker}</p>
            <h2>{content.finalCta.title}</h2>
            <p>{content.finalCta.text}</p>
          </div>
          <WhatsAppLink className="trademark-button trademark-button--gold">
            {content.finalCta.ctaLabel} <ArrowRight size={19} />
          </WhatsAppLink>
        </div>
      </section>

      <footer className="trademark-footer">
        <div className="trademark-shell trademark-footer__inner">
          <div className="trademark-footer__brand">
            <span className="trademark-footer__mark"><img src={logo} alt="" /></span>
            <span><strong>Pedro Bastos Lund</strong><small>Advocacia e Consultoria Jurídica</small></span>
          </div>
          <p>{content.footer.note}</p>
          <span>© {new Date().getFullYear()} Pedro Bastos Lund</span>
        </div>
      </footer>

      <WhatsAppLink className="trademark-whatsapp-float" label="Abrir conversa no WhatsApp">
        <WhatsAppIcon />
        <span>Fale conosco</span>
      </WhatsAppLink>
    </main>
  );
}
