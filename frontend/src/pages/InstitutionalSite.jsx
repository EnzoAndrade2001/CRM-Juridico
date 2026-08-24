import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  CarFront,
  FileText,
  Handshake,
  Landmark,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Search,
  Scale,
  ShieldCheck,
  Stamp,
  X,
  ChevronUp,
} from 'lucide-react';
import portrait from '../assets/pedro-bastos-lund-hero-blue.png';
import aboutPortrait from '../assets/pedro-bastos-lund-about.jpg';
import editorialPortrait from '../assets/pedro-bastos-lund-editorial.png';
import eduardaPortrait from '../assets/dra-eduarda-hq.png';
import ladyJustice from '../assets/lady-justice.png';
import contactEditorial from '../assets/office-contact-editorial.png';
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
  team: `${baseUrl}equipe/`,
};
// Todos os destinos do menu vivem na própria home: os botões rolam até a
// seção em vez de trocar de página. As rotas dedicadas seguem existindo para
// quem chegar por link direto.
const siteNavItems = [
  { key: 'sobre', label: 'Quem somos', path: `${siteRoutes.home}#quem-somos` },
  { key: 'areas', label: 'Áreas de atuação', path: `${siteRoutes.home}#atuacao` },
  { key: 'diferenciais', label: 'Diferenciais', path: `${siteRoutes.home}#diferenciais` },
  { key: 'team', label: 'Nossa equipe', path: `${siteRoutes.home}#equipe` },
  { key: 'blog', label: 'Blog', disabled: true },
  { key: 'contact', label: 'Contato', path: `${siteRoutes.home}#contato` },
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

function WhatsAppIcon({ size = 21 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20.25 11.6a8.25 8.25 0 0 1-12.18 7.25L3.7 20.3l1.43-4.2A8.25 8.25 0 1 1 20.25 11.6Z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.15 7.5c.2-.45.42-.46.75-.47h.62c.2 0 .4.07.51.36l.78 1.9c.08.2.05.4-.08.57l-.6.78c-.13.17-.13.34-.03.51.43.76 1.08 1.42 1.82 1.87.18.11.36.1.5-.06l.84-.97c.15-.17.35-.2.55-.12l1.87.88c.24.11.35.25.33.48-.06.76-.42 1.47-1.02 1.93-.47.36-1.08.49-1.66.35-1.22-.3-2.83-1.09-4.24-2.48-1.17-1.16-1.94-2.44-2.27-3.47-.2-.61-.11-1.29.24-1.83.2-.31.39-.45.59-.23Z" fill="currentColor" />
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
  const [showScrollTop, setShowScrollTop] = useState(false);
  const modalCloseButtonRef = useRef(null);
  const lastModalTriggerRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Clear the hash from the URL so F5 doesn't jump back down
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  };

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
            item.disabled
              ? <span className="office-nav__placeholder" key={item.key} aria-disabled="true">{item.label}</span>
              : <a className={item.key === 'contact' ? 'office-header__cta' : undefined} key={item.key} href={item.path} onClick={(event) => handleNavItemClick(event, item)}>{item.label}</a>
          ))}
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
            <img src={editorialPortrait} alt="Pedro Bastos Lund" width="739" height="984" loading="eager" />
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

      {(isHome || section === 'team') && <section className="office-team" id="equipe">
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

      {isHome && <section className="office-contact" id="contato">
        <div className="office-shell office-contact__layout">
          <div className="office-contact__media">
            <img src={contactEditorial} alt="Pedro Bastos Lund analisando documentos no escritório" loading="lazy" />
          </div>
          <div className="office-contact__content">
            <p className="office-kicker office-kicker--light">Fale com o escritório</p>
            <h2>Contatos</h2>
            <div className="office-contact__details" aria-label="Canais de contato do escritório">
              <div className="office-contact__row">
                <Phone aria-hidden="true" />
                <div><span>Telefones</span><a href={`tel:${content.footer.phoneHref}`}>{content.footer.phoneDisplay}</a><WhatsAppLink label="Conversar com o escritório pelo WhatsApp">(51) 9366-5581</WhatsAppLink></div>
              </div>
              <div className="office-contact__row">
                <Mail aria-hidden="true" />
                <div><span>E-mail</span><a href={`mailto:${content.footer.email}`}>{content.footer.email}</a></div>
              </div>
              <div className="office-contact__row">
                <SocialIcon name="instagram" />
                <div><span>Instagram</span><a href={content.social[0].href} target="_blank" rel="noreferrer">@pbl.adv</a></div>
              </div>
              <div className="office-contact__row">
                <MapPin aria-hidden="true" />
                <div><span>Endereço</span><a href="https://www.google.com/maps/search/?api=1&query=Rua+Visconde+do+Herval+1092+sala+503+Porto+Alegre+RS" target="_blank" rel="noreferrer">{content.footer.addressLine}<br />{content.footer.addressCity}</a></div>
              </div>
            </div>
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
      <WhatsAppLink className="office-float" label="Abrir conversa no WhatsApp"><WhatsAppIcon /><span>Fale conosco</span></WhatsAppLink>
      <button
        type="button"
        className={`office-scroll-top ${showScrollTop ? 'is-visible' : ''}`}
        onClick={scrollToTop}
        aria-label="Voltar ao topo"
      >
        <ChevronUp size={24} />
      </button>
      <ContentModal content={activeModal} closeButtonRef={modalCloseButtonRef} onClose={() => setActiveModal(null)} />
    </main>
  );
}
