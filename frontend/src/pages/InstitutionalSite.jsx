import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  CarFront,
  FileText,
  Handshake,
  Landmark,
  Menu,
  MessageCircle,
  Search,
  Scale,
  ShieldCheck,
  Stamp,
  X,
} from 'lucide-react';
import portrait from '../assets/pedro-bastos-lund-hero-cutout.png';
import aboutPortrait from '../assets/pedro-bastos-lund-about.jpg';
import eduardaPortrait from '../assets/dra-eduarda-hq.png';
import ladyJustice from '../assets/lady-justice.png';
import logo from '../assets/pedro-bastos-lund-monogram.png';
import content from '../content/institutional-site.json';
import './institutional-site.css';
import './institutional-brand-overrides.css';

// Nomes de ícone (guardados como texto no content JSON, editável pelo CMS)
// mapeados para os componentes reais do lucide-react.
const ICONS = { Banknote, CarFront, FileText, Landmark, BriefcaseBusiness, Scale, Stamp };
// Idem para as fotos da equipe — o JSON só guarda "pedro" ou "eduarda".
const PORTRAITS = { pedro: aboutPortrait, eduarda: eduardaPortrait };
const DIFFERENTIATOR_ICONS = [Handshake, Search, MessageCircle];

const whatsappNumber = '555193665581';
const baseUrl = import.meta.env.BASE_URL || '/';
const siteRoutes = {
  home: baseUrl,
  areas: `${baseUrl}atuacao/`,
  process: `${baseUrl}como-funciona/`,
  guides: `${baseUrl}conteudos/`,
  team: `${baseUrl}equipe/`,
};
const siteNavItems = [
  { key: 'areas', label: 'Áreas de atuação', path: siteRoutes.areas },
  { key: 'sobre', label: 'Quem somos', path: `${siteRoutes.home}#quem-somos` },
  { key: 'diferenciais', label: 'Diferenciais', path: `${siteRoutes.home}#diferenciais` },
  { key: 'team', label: 'Nossa equipe', path: siteRoutes.team },
];
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(content.whatsapp.message)}`;

// content.areas[].href guarda só o slug (ex: "revisional-bancario"); aqui
// vira a URL completa considerando o BASE_URL do deploy (raiz ou subpasta
// do GitHub Pages).
const areas = content.areas.map((area) => ({
  ...area,
  icon: ICONS[area.icon] || FileText,
  href: area.href ? `${baseUrl.replace(/\/$/, '')}/${area.href}/` : null,
}));
const guides = content.guides;

function SocialIcon({ name }) {
  if (name === 'instagram') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14.5 8H17V5h-2.5C11.46 5 10 6.58 10 9.5V11H7v3h3v6h3v-6h3l1-3h-4V9.6c0-1.06.4-1.6 1.5-1.6Z" />
    </svg>
  );
}

function WhatsAppLink({ children, className = '', label }) {
  return (
    <a className={`office-button-link ${className}`} href={whatsappUrl} target="_blank" rel="noreferrer" aria-label={label}>
      {children}
    </a>
  );
}

function ContentModal({ content: modalContent, closeButtonRef, onClose }) {
  if (!modalContent) return null;

  return (
    <div className="office-modal" role="presentation" onMouseDown={onClose}>
      <section
        className="office-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="office-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button ref={closeButtonRef} className="office-modal__close" type="button" onClick={onClose} aria-label="Fechar conteúdo">
          <X size={19} />
        </button>
        <p className="office-kicker">{modalContent.kicker}</p>
        <h2 id="office-modal-title">{modalContent.title}</h2>
        <p className="office-modal__intro">{modalContent.intro}</p>
        <div className="office-modal__columns">
          <div>
            <h3>Pontos</h3>
            <ul>
              {modalContent.points.map((point) => <li key={point}>{point}</li>)}
            </ul>
          </div>
          {modalContent.documents && (
            <div>
                <h3>Documentos</h3>
              <p>{modalContent.documents}</p>
            </div>
          )}
        </div>
        <p className="office-modal__note"><ShieldCheck size={18} /> {modalContent.note}</p>
        <WhatsAppLink className="office-button office-button--gold" label="Falar sobre este assunto no WhatsApp">
          Falar com o escritório <ArrowRight size={17} />
        </WhatsAppLink>
      </section>
    </div>
  );
}

export default function InstitutionalSite({ section = 'home' }) {
  const isHome = section === 'home';
  const pageDetails = content.sectionDetails[section];
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const modalCloseButtonRef = useRef(null);
  const lastModalTriggerRef = useRef(null);

  useEffect(() => {
    const previousTitle = document.title;
    let description = document.querySelector('meta[name="description"]');
    const createdDescription = !description;
    if (!description) {
      description = document.createElement('meta');
      description.setAttribute('name', 'description');
      document.head.appendChild(description);
    }
    const previousDescription = description.getAttribute('content');
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(fontLink);
    document.title = pageDetails
      ? `${pageDetails.title} | Pedro Bastos Lund`
      : 'Pedro Bastos Lund | Advocacia e Consultoria Jurídica';
    description.setAttribute('content', content.meta.description);
    return () => {
      document.title = previousTitle;
      fontLink.remove();
      if (createdDescription) description.remove();
      else description.setAttribute('content', previousDescription || '');
    };
  }, [pageDetails]);

  useEffect(() => {
    if (!activeModal) {
      lastModalTriggerRef.current?.focus();
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modalCloseButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setActiveModal(null);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeModal]);

  useEffect(() => {
    if (!isHome || !window.location.hash) return undefined;

    const sectionId = decodeURIComponent(window.location.hash.slice(1));
    const timeoutId = window.setTimeout(() => {
      const target = document.getElementById(sectionId);
      if (target) window.scrollTo({ top: target.offsetTop, behavior: 'auto' });
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [isHome]);

  const closeMenu = () => setMenuOpen(false);
  const navigateWithTransition = (event, href) => {
    if (
      event.defaultPrevented
      || event.button !== 0
      || event.metaKey
      || event.ctrlKey
      || event.shiftKey
      || event.altKey
    ) return;

    event.preventDefault();
    document.documentElement.classList.add('office-page-is-leaving');
    window.setTimeout(() => window.location.assign(href), 420);
  };
  const openModal = (modalContent, event) => {
    lastModalTriggerRef.current = event.currentTarget;
    setActiveModal(modalContent);
  };
  const handleNavItemClick = (event, item) => {
    closeMenu();
    const anchor = item.path.split('#')[1];

    if (isHome && anchor) {
      event.preventDefault();
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${anchor}`);
      document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    navigateWithTransition(event, item.path);
  };

  return (
    <main className="office-site">
      <div className="office-page-transition" aria-hidden="true" />
      <header className="office-header">
        <a className="office-brand" href={siteRoutes.home} onClick={(event) => { closeMenu(); navigateWithTransition(event, siteRoutes.home); }} aria-label="Pedro Bastos Lund Advocacia — início">
          <span className="office-brand__mark"><img src={logo} alt="" /></span>
          <span><strong>Pedro Bastos Lund</strong><small>Advocacia e Consultoria Jurídica</small></span>
        </a>
        <button className="office-menu-toggle" type="button" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <nav className={`office-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Navegação principal">
          {siteNavItems.map((item) => (
            <a key={item.key} href={item.path} onClick={(event) => handleNavItemClick(event, item)}>{item.label}</a>
          ))}
          <WhatsAppLink className="office-header__cta" label="Falar com o escritório pelo WhatsApp" >
            <MessageCircle size={17} /> Falar no WhatsApp
          </WhatsAppLink>
          <div className="office-social-links" aria-label="Redes sociais">
            {content.social.map(({ label, href, icon }) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} title={label}>
                <SocialIcon name={icon} />
              </a>
            ))}
          </div>
        </nav>
      </header>

      {isHome ? (
      <section className="office-hero" id="inicio">
        <div className="office-shell office-hero__inner">
          <div className="office-hero__copy">
            <h1>{content.hero.title}<br className="office-hero__title-break" /> {content.hero.titleBreak}</h1>
          </div>
          <div className="office-hero__portrait">
            <img src={portrait} alt="Pedro Bastos Lund" />
            <p className="office-hero__portrait-name"><span>Pedro Bastos Lund</span> OAB/RS 74.953</p>
          </div>
        </div>
      </section>
      ) : (
        <section className="office-page-hero">
          <div className="office-shell office-page-hero__inner">
            <p className="office-kicker office-kicker--light">{pageDetails.kicker}</p>
            <h1>{pageDetails.title}</h1>
            <p>{pageDetails.text}</p>
          </div>
        </section>
      )}

      {isHome && <section className="office-about" id="quem-somos">
        <div className="office-shell office-about__layout">
          <div className="office-about__card">
            <h2>{content.editorial.title}</h2>
            {content.editorial.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 40)}>{paragraph}</p>
            ))}
          </div>
          <div className="office-about__media">
            <img src={aboutPortrait} alt="Pedro Bastos Lund" loading="lazy" />
          </div>
        </div>
      </section>}

      {isHome && <section className="office-differentiators" id="diferenciais">
        <div className="office-shell office-differentiators__layout">
          <div className="office-differentiators__content">
            <p className="office-kicker office-kicker--light">{content.differentiators.kicker}</p>
            <h2>{content.differentiators.title}</h2>
            <div className="office-differentiators__list">
              {content.differentiators.items.map((item, index) => {
                const Icon = DIFFERENTIATOR_ICONS[index] || ShieldCheck;
                return (
                  <article className="office-differentiator" key={item.title}>
                    <span className="office-differentiator__icon" aria-hidden="true"><Icon size={34} strokeWidth={1.5} /></span>
                    <div><h3>{item.title}</h3><p>{item.text}</p></div>
                  </article>
                );
              })}
            </div>
          </div>
          <div className="office-differentiators__art" aria-hidden="true">
            <img src={ladyJustice} alt="" loading="lazy" />
          </div>
        </div>
      </section>}

      {isHome && <section className="office-home-services" id="atuacao">
        <div className="office-shell">
          <div className="office-section-heading">
            <p className="office-kicker">{content.servicesIntro.kicker}</p>
            <h2>{content.servicesIntro.title}</h2>
            <p>{content.servicesIntro.text}</p>
          </div>
          <div className="office-home-services__list">
            {areas.map(({ title, text, href, modal }, index) => {
              const rowContent = <><span className="office-service-row__number">{String(index + 1).padStart(2, '0')}</span><span className="office-service-row__body"><strong>{title}</strong><span>{text}</span></span><ArrowRight size={18} /></>;
              return href ? (
                <a className="office-service-row" href={href} key={title} onClick={(event) => navigateWithTransition(event, href)}>{rowContent}</a>
              ) : (
                <button className="office-service-row" type="button" key={title} onClick={(event) => openModal(modal, event)}>{rowContent}</button>
              );
            })}
          </div>
        </div>
      </section>}

      {section === 'areas' && <section className="office-areas" id="atuacao">
        <div className="office-shell">
          <div className="office-section-heading">
            <h2>{content.areasPage.title}</h2>
            <p>{content.areasPage.text}</p>
          </div>
          <div className="office-areas__grid">
            {areas.map(({ icon: Icon, title, text, href, modal }) => (
              <article className="office-area-card" key={title}>
                <span className="office-area-card__icon"><Icon size={23} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
                {href ? <a href={href} onClick={(event) => navigateWithTransition(event, href)}>Saiba mais <ArrowRight size={16} /></a> : (
                  <button className="office-card-link" type="button" onClick={(event) => openModal(modal, event)}>
                    Ver detalhes <ArrowRight size={16} />
                  </button>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>}

      {section === 'guides' && <section className="office-guides" id="conteudos">
        <div className="office-shell">
          <div className="office-section-heading">
            <h2>Conteúdos jurídicos.</h2>
            <p>Informação prática para consulta.</p>
          </div>
          <div className="office-guides__grid">
            {guides.map((guide) => (
              <article className="office-guide-card" key={guide.title}>
                <p className="office-guide-card__category">{guide.category}</p>
                <h3>{guide.title}</h3>
                <p>{guide.excerpt}</p>
                <button className="office-card-link" type="button" onClick={(event) => openModal(guide.modal, event)}>
                  Ler conteúdo <ArrowRight size={16} />
                </button>
              </article>
            ))}
          </div>
          <p className="office-guides__source">Conteúdo informativo. A análise depende de cada caso.</p>
        </div>
      </section>}

      {section === 'process' && <section className="office-process" id="como-funciona">
        <div className="office-shell office-process__grid">
          <div className="office-process__heading">
            <h2>{content.process.title}</h2>
            <p>{content.process.text}</p>
            <WhatsAppLink className="office-text-link" label="Falar com a equipe pelo WhatsApp">Falar no WhatsApp <ArrowRight size={17} /></WhatsAppLink>
          </div>
          <div className="office-process__steps">
            {content.process.steps.map(({ number, title, text }) => (
              <article className="office-step" key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></article>
            ))}
          </div>
        </div>
      </section>}

      {section === 'team' && <section className="office-team" id="equipe">
        <div className="office-shell">
          <div className="office-section-heading office-section-heading--team">
            <h2>Equipe jurídica.</h2>
          </div>
          <div className="office-team__grid">
            {content.team.members.map((member) => (
              <article className="office-person" key={member.name}>
                <img src={PORTRAITS[member.portraitKey]} alt={member.name} />
                <div className="office-person__body"><p className="office-person__eyebrow">{member.eyebrow}</p><h3>{member.name}</h3>{member.extra && <span>{member.extra}</span>}<p>{member.bio}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>}

      <footer className="office-footer">
        <div className="office-shell office-footer__inner">
          <div className="office-footer__brand">
            <img src={logo} alt="" />
            <span><strong>Pedro Bastos Lund</strong><small>Advocacia e Consultoria Jurídica</small></span>
          </div>
          <div className="office-footer__contact" aria-label="Informações de contato">
            <span><strong>Endereço</strong>{content.footer.addressLine}<br />{content.footer.addressCity}</span>
            <a href={`tel:${content.footer.phoneHref}`}><strong>Telefone</strong>{content.footer.phoneDisplay}</a>
            <a href={`mailto:${content.footer.email}`}><strong>E-mail</strong>{content.footer.email}</a>
          </div>
          <p>{content.footer.note}</p>
          <span>© {new Date().getFullYear()} Pedro Bastos Lund</span>
        </div>
      </footer>
      <WhatsAppLink className="office-float" label="Abrir conversa no WhatsApp"><MessageCircle size={20} /><span>Fale conosco</span></WhatsAppLink>
      <ContentModal content={activeModal} closeButtonRef={modalCloseButtonRef} onClose={() => setActiveModal(null)} />
    </main>
  );
}
