import { useEffect, useState } from 'react';
import { ArrowRight, Check, Menu, MessageCircle, Scale, ShieldCheck, X } from 'lucide-react';
import portrait from '../../assets/pedro-bastos-lund-hero-hq.png';
import aboutPortrait from '../../assets/pedro-bastos-lund-about.jpg';
import logo from '../../assets/pedro-bastos-lund-monogram.png';
import site from '../../content/institutional-site.json';
import '../../pages/institutional-site.css';
import './office-landing.css';

// Número oficial da instância PBL: todos os CTAs das landings caem na mesma
// triagem da IA no WhatsApp.
const WHATSAPP_NUMBER = '555193665581';

// No GitHub Pages o site é servido em /CRM-Juridico/, não na raiz do domínio.
// Um href="/" fixo levaria o visitante para fora do site e devolveria 404.
const HOME_URL = import.meta.env.BASE_URL || '/';

function WhatsAppIcon({ size = 25 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20.25 11.6a8.25 8.25 0 0 1-12.18 7.25L3.7 20.3l1.43-4.2A8.25 8.25 0 1 1 20.25 11.6Z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.15 7.5c.2-.45.42-.46.75-.47h.62c.2 0 .4.07.51.36l.78 1.9c.08.2.05.4-.08.57l-.6.78c-.13.17-.13.34-.03.51.43.76 1.08 1.42 1.82 1.87.18.11.36.1.5-.06l.84-.97c.15-.17.35-.2.55-.12l1.87.88c.24.11.35.25.33.48-.06.76-.42 1.47-1.02 1.93-.47.36-1.08.49-1.66.35-1.22-.3-2.83-1.09-4.24-2.48-1.17-1.16-1.94-2.44-2.27-3.47-.2-.61-.11-1.29.24-1.83.2-.31.39-.45.59-.23Z" fill="currentColor" />
    </svg>
  );
}

/**
 * Estrutura comum das landings de campanha, escrita na mesma linguagem visual
 * do site institucional: os tokens, o header, o rodapé e as primitivas vêm de
 * institutional-site.css, e office-landing.css acrescenta apenas as seções que
 * só existem em landing.
 *
 * O conteúdo inteiro chega por JSON, editável sem tocar em código. O slot
 * `children` entra logo abaixo da introdução — é onde a landing do revisional
 * encaixa a calculadora.
 */
// Rola ate a secao respeitando a altura do header fixo. Quem pediu para
// reduzir animacoes no sistema recebe o salto direto, sem transicao.
function scrollToSection(id) {
  const target = document.getElementById(id);
  if (!target) return false;

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  return true;
}

export default function OfficeLanding({ content, icons = {}, navItems = [], ariaLabel, heroExtras = true, children }) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Link compartilhado com ancora (#calculadora, por exemplo) precisa rolar
  // depois que a pagina montou, senao a secao ainda nao existe no documento.
  useEffect(() => {
    if (!window.location.hash) return undefined;
    const sectionId = decodeURIComponent(window.location.hash.slice(1));
    const timeoutId = window.setTimeout(() => scrollToSection(sectionId), 120);
    return () => window.clearTimeout(timeoutId);
  }, []);

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
  }, [content]);

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(content.whatsapp.message)}`;

  function handleNavClick(event, href) {
    setMenuOpen(false);
    if (!href.startsWith('#')) return;
    // Deixa o navegador cuidar de abrir em nova aba ou salvar o link.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const sectionId = href.slice(1);
    if (!scrollToSection(sectionId)) return;

    event.preventDefault();
    // Mantem a ancora na URL para o link continuar compartilhavel, sem que o
    // navegador desfaca a rolagem suave com um salto.
    window.history.replaceState(null, '', href);
  }

  function WhatsAppLink({ children: label, className = '', ariaLabel: linkLabel }) {
    return (
      <a className={className} href={whatsappUrl} target="_blank" rel="noreferrer" aria-label={linkLabel || ariaLabel}>
        {label}
      </a>
    );
  }

  return (
    <main className="office-site office-landing">
      <header className="office-header">
        <a className="office-brand" href={HOME_URL} aria-label="Pedro Bastos Lund Advocacia — início">
          <span className="office-brand__mark"><img src={logo} alt="" /></span>
          <span><strong>Pedro Bastos Lund</strong><small>Advocacia e Consultoria Jurídica</small></span>
        </a>
        <button
          className="office-menu-toggle"
          type="button"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <nav className={`office-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Navegação principal">
          {navItems.map((item) => (
            <a key={item.href} href={item.href} onClick={(event) => handleNavClick(event, item.href)}>
              {item.label}
            </a>
          ))}
        </nav>
        <WhatsAppLink className="office-button office-button--gold office-landing__header-cta">
          <MessageCircle size={17} /> Falar no WhatsApp
        </WhatsAppLink>
      </header>

      <section className="office-landing__hero" id="inicio" style={{ '--office-hero-image': `url(${portrait})` }}>
        <div className="office-shell office-landing__hero-inner">
          <div className="office-landing__hero-copy">
            <p className="office-kicker office-kicker--light"><span className="office-landing__kicker-rule" /> {content.hero.eyebrow}</p>
            <h1>{content.hero.titleStart} <em>{content.hero.titleEmphasis}</em></h1>
            <p className="office-landing__lead">{content.hero.lead}</p>
            <WhatsAppLink className="office-button office-button--gold">
              {content.hero.ctaLabel} <ArrowRight size={18} />
            </WhatsAppLink>
            {heroExtras ? (
              <div className="office-landing__assurances" aria-label="Características do atendimento">
                {content.hero.assurances.map((item) => <span key={item}><Check size={15} /> {item}</span>)}
              </div>
            ) : null}
          </div>
          {heroExtras ? <p className="office-landing__hero-name"><span>Pedro Bastos Lund</span> Advogado</p> : null}
        </div>
      </section>

      <section className="office-landing__intro" id={content.intro.anchor || 'sobre-o-tema'}>
        <div className="office-shell office-landing__intro-grid">
          <div className="office-section-heading">
            <p className="office-kicker">{content.intro.kicker}</p>
            <h2>{content.intro.title}</h2>
          </div>
          <div className="office-landing__intro-text">
            <p>{content.intro.text}</p>
            <p className="office-landing__note"><ShieldCheck size={20} /> {content.intro.note}</p>
          </div>
        </div>
      </section>

      {children}

      <section className="office-landing__review">
        <div className="office-shell">
          <div className="office-section-heading">
            <p className="office-kicker">{content.review.kicker}</p>
            <h2>{content.review.title}</h2>
          </div>
          <div className="office-landing__cards">
            {content.review.items.map((item, index) => {
              const Icon = icons[item.icon];
              return (
                <article className="office-landing__card" key={item.title}>
                  <span className="office-landing__card-number">0{index + 1}</span>
                  {Icon ? <span className="office-landing__card-icon"><Icon size={24} /></span> : null}
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="office-landing__process" id="como-funciona">
        <div className="office-shell office-landing__process-grid">
          <div className="office-section-heading office-section-heading--dark">
            <p className="office-kicker office-kicker--light">{content.process.kicker}</p>
            <h2>{content.process.title}</h2>
            <p>{content.process.text}</p>
            <WhatsAppLink className="office-landing__text-link">
              {content.process.ctaLabel} <ArrowRight size={17} />
            </WhatsAppLink>
          </div>
          <div className="office-landing__steps">
            {content.process.steps.map((step) => (
              <article className="office-landing__step" key={step.number}>
                <span>{step.number}</span>
                <div><h3>{step.title}</h3><p>{step.text}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="office-landing__about" id="sobre">
        <div className="office-shell office-landing__about-grid">
          <div className="office-landing__portrait">
            <img src={aboutPortrait} alt="Advogado Pedro Bastos Lund" />
            <div className="office-landing__identity">
              <strong>Pedro Bastos Lund</strong>
              <span>OAB/RS 74.953</span>
            </div>
          </div>
          <div className="office-landing__about-copy">
            <p className="office-kicker">{content.about.kicker}</p>
            <h2>Pedro Bastos Lund</h2>
            <p className="office-landing__role">{content.about.role}</p>
            <p>{content.about.text}</p>
            <blockquote>{content.about.quote}</blockquote>
            <WhatsAppLink className="office-button">
              {content.about.ctaLabel} <MessageCircle size={18} />
            </WhatsAppLink>
          </div>
        </div>
      </section>

      <section className="office-landing__final-cta">
        <div className="office-shell office-landing__final-cta-inner">
          <span className="office-landing__final-icon"><Scale size={28} /></span>
          <div>
            <p className="office-kicker office-kicker--light">{content.finalCta.kicker}</p>
            <h2>{content.finalCta.title}</h2>
            <p>{content.finalCta.text}</p>
          </div>
          <WhatsAppLink className="office-button office-button--gold">
            {content.finalCta.ctaLabel} <ArrowRight size={18} />
          </WhatsAppLink>
        </div>
      </section>

      <footer className="office-footer">
        <div className="office-shell office-footer__inner">
          <div className="office-footer__brand">
            <img src={logo} alt="" />
            <span><strong>Pedro Bastos Lund</strong><small>Advocacia e Consultoria Jurídica</small></span>
          </div>
          <div className="office-footer__contact" aria-label="Informações de contato">
            <span><strong>Endereço</strong>{site.footer.addressLine}, {site.footer.addressCity}</span>
            <a href={`tel:${site.footer.phoneHref}`}><strong>Telefone</strong>{site.footer.phoneDisplay}</a>
            <a href={`mailto:${site.footer.email}`}><strong>E-mail</strong>{site.footer.email}</a>
          </div>
          <p>{content.footer.note}</p>
        </div>
      </footer>

      <WhatsAppLink className="office-float" ariaLabel="Abrir conversa no WhatsApp">
        <WhatsAppIcon /><span>Fale conosco</span>
      </WhatsAppLink>
    </main>
  );
}
