import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowRight,
  Banknote,
  BadgeDollarSign,
  BriefcaseBusiness,
  Building2,
  CarFront,
  FileText,
  Gavel,
  Handshake,
  Landmark,
  LockKeyhole,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  ReceiptText,
  Search,
  Scale,
  ShieldCheck,
  Stamp,
  X,
  ChevronUp,
} from 'lucide-react';
import aboutPortrait from '../assets/pedro-bastos-lund-about.jpg';
import editorialPortrait from '../assets/pedro-bastos-lund-editorial.png';
import eduardaPortrait from '../assets/dra-eduarda-hq.png';
import ladyJustice from '../assets/lady-justice.png';
import contactEditorial from '../assets/office-contact-editorial.png';
import logo from '../assets/pedro-bastos-lund-monogram.png';
import blogVehicle from '../assets/blog-busca-apreensao.png';
import blogInheritance from '../assets/blog-inventario.png';
import blogProperty from '../assets/blog-bem-familia.png';
import areaBanking from '../assets/services/revisional-bancario-v2.jpg';
import areaVehicle from '../assets/services/busca-apreensao-v2.jpg';
import areaContracts from '../assets/services/contratos-cobrancas-v2.jpg';
import areaConsumer from '../assets/services/direito-consumidor-v2.jpg';
import areaLabor from '../assets/services/direito-trabalhista-v2.jpg';
import areaFamily from '../assets/services/familia-sucessoes-v2.jpg';
import areaDigital from '../assets/services/direito-digital-v2.jpg';
import areaSocialSecurity from '../assets/services/direito-previdenciario-v2.jpg';
import areaProperty from '../assets/services/direito-imobiliario.jpg';
import areaCriminal from '../assets/services/direito-penal-v2.jpg';
import areaTax from '../assets/services/direito-tributario-v2.jpg';
import areaBusiness from '../assets/services/direito-empresarial-v2.jpg';
import partnerSia from '../assets/clients/partner-sia.png';
import partnerWorkshop from '../assets/clients/partner-workshop.png';
import partnerBarcelos from '../assets/clients/partner-barcelos.png';
import partnerGabrielleAdames from '../assets/clients/partner-gabrielle-adames.png';
import partnerRodrigues from '../assets/clients/partner-rodrigues.png';
import partnerItalinea from '../assets/clients/partner-italinea.png';
import partnerKwa from '../assets/clients/partner-kwa.png';
import partnerDellAnno from '../assets/clients/partner-dell-anno.png';
import partnerDgiLog from '../assets/clients/partner-dgilog.png';
import partnerBoomMania from '../assets/clients/partner-boom-mania.png';
import partnerHarmony from '../assets/clients/partner-harmony.png';
import partnerAtenas from '../assets/clients/partner-atenas.png';
import partnerViaVerde from '../assets/clients/partner-via-verde.png';
import partnerMega from '../assets/clients/partner-mega.png';
import partnerHamorim from '../assets/clients/partner-hamorim.png';
import partnerVilaFinamor from '../assets/clients/partner-vila-finamor.png';
import partnerMagnani from '../assets/clients/partner-magnani.png';
import partnerDbOrtoli from '../assets/clients/partner-db-ortoli.png';
import partnerTiaCarmen from '../assets/clients/partner-tia-carmen.png';
import partnerGrupoDekka from '../assets/clients/partner-grupo-dekka.png';
import partnerBersaglio from '../assets/clients/partner-bersaglio.png';
import partnerCimentoGuaiba from '../assets/clients/partner-cimento-guaiba.png';
import content from '../content/institutional-site.json';
import './institutional-site.css';
import './institutional-brand-overrides.css';

// Nomes de ícone (guardados como texto no content JSON, editável pelo CMS)
// mapeados para os componentes reais do lucide-react.
const ICONS = {
  Banknote,
  BadgeDollarSign,
  BriefcaseBusiness,
  Building2,
  CarFront,
  FileText,
  Gavel,
  Landmark,
  LockKeyhole,
  ReceiptText,
  Scale,
  Stamp,
};
// Idem para as fotos da equipe — o JSON só guarda "pedro" ou "eduarda".
const PORTRAITS = { pedro: aboutPortrait, eduarda: eduardaPortrait };
const BLOG_IMAGES = { vehicle: blogVehicle, inheritance: blogInheritance, property: blogProperty };
const AREA_IMAGES = {
  banking: areaBanking,
  vehicle: areaVehicle,
  contracts: areaContracts,
  consumer: areaConsumer,
  labor: areaLabor,
  family: areaFamily,
  digital: areaDigital,
  socialSecurity: areaSocialSecurity,
  property: areaProperty,
  criminal: areaCriminal,
  tax: areaTax,
  business: areaBusiness,
};
const CLIENT_LOGOS = [
  { name: 'SIA', image: partnerSia },
  { name: 'Workshop Móveis para Escritório', image: partnerWorkshop },
  { name: 'Barcelos', image: partnerBarcelos },
  { name: 'Gabrielle Adames Clínica', image: partnerGabrielleAdames },
  { name: 'Rodrigues Distribuidora', image: partnerRodrigues },
  { name: 'Italínea', image: partnerItalinea },
  { name: 'Grupo KWA Iluminação', image: partnerKwa },
  { name: 'Dell Anno Porto Alegre', image: partnerDellAnno },
  { name: 'DGI Log', image: partnerDgiLog },
  { name: 'Boom Mania', image: partnerBoomMania },
  { name: 'Harmony Serralheria', image: partnerHarmony },
  { name: 'Atenas Contabilidade', image: partnerAtenas },
  { name: 'Via Verde Restaurante', image: partnerViaVerde },
  { name: 'Mega Supermercado', image: partnerMega },
  { name: 'Hamorim', image: partnerHamorim },
  { name: 'Vila Finamor Terra & Mar', image: partnerVilaFinamor },
  { name: 'Magnani Mármores', image: partnerMagnani },
  { name: 'DB Ortoli Segurança', image: partnerDbOrtoli },
  { name: 'Tia Carmen', image: partnerTiaCarmen },
  { name: 'Grupo Dekka', image: partnerGrupoDekka },
  { name: 'Bersaglio Alimentos', image: partnerBersaglio },
  { name: 'Cimento Guaíba', image: partnerCimentoGuaiba },
];
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
  { key: 'blog', label: 'Blog', path: `${siteRoutes.home}#blog` },
  { key: 'partners', label: 'PARCEIROS', path: `${siteRoutes.home}#parceiros` },
  { key: 'contact', label: 'Contato', path: `${siteRoutes.home}#contato` },
];
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(content.whatsapp.message)}`;

// content.areas[].href guarda só o slug (ex: "revisional-bancario"); aqui
// vira a URL completa considerando o BASE_URL do deploy (raiz ou subpasta
// do GitHub Pages).
const areas = content.areas.map((area) => ({
  ...area,
  icon: ICONS[area.icon] || FileText,
  image: AREA_IMAGES[area.imageKey],
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

function AreaCard({ area, onNavigate, onOpenModal }) {
  const { icon: Icon, image, title, text, href, modal } = area;

  return (
    <article className="office-area-card">
      <div className="office-area-card__media" aria-hidden="true">
        <img src={image} alt="" width="1200" height="800" loading="lazy" />
      </div>
      <div className="office-area-card__panel">
        <span className="office-area-card__icon"><Icon size={22} /></span>
        <h3>{title}</h3>
        <p>{text}</p>
        {href ? <a href={href} onClick={(event) => onNavigate(event, href)}>Saiba mais <ArrowRight size={16} /></a> : (
          <button className="office-card-link" type="button" onClick={(event) => onOpenModal(modal, event)}>
            Ver detalhes <ArrowRight size={16} />
          </button>
        )}
      </div>
    </article>
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
  const { articleSlug } = useParams();
  const isHome = section === 'home';
  const article = section === 'article'
    ? content.blog.posts.find((post) => post.slug === articleSlug)
    : null;
  const navigationItems = article
    ? [{ key: 'home', label: 'Início', path: siteRoutes.home }, ...siteNavItems]
    : siteNavItems;
  const pageDetails = content.sectionDetails[section] || (section === 'article'
    ? { title: 'Conteúdo não encontrado', text: 'Esta matéria não está disponível.' }
    : null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const modalCloseButtonRef = useRef(null);
  const lastModalTriggerRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.remove('office-page-is-leaving');
    const handlePageShow = (event) => {
      if (event.persisted) {
        document.documentElement.classList.remove('office-page-is-leaving');
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

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
    document.title = article
      ? `${article.title} | Pedro Bastos Lund`
      : pageDetails
      ? `${pageDetails.title} | Pedro Bastos Lund`
      : 'Pedro Bastos Lund | Advocacia e Consultoria Jurídica';
    description.setAttribute('content', content.meta.description);
    return () => {
      document.title = previousTitle;
      fontLink.remove();
      if (createdDescription) description.remove();
      else description.setAttribute('content', previousDescription || '');
    };
  }, [article, pageDetails]);

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
      const headerHeight = document.querySelector('.office-header')?.offsetHeight || 0;
      if (target) window.scrollTo({ top: Math.max(0, target.offsetTop - headerHeight), behavior: 'auto' });
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
          {navigationItems.map((item) => (
            item.disabled
              ? <span className="office-nav__placeholder" key={item.key} aria-disabled="true">{item.label}</span>
              : <a key={item.key} href={item.path} onClick={(event) => handleNavItemClick(event, item)}>{item.label}</a>
          ))}
          <div className="office-social-links" aria-label="Redes sociais">
            {content.social.map(({ label, href, icon }) => href ? (
              <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} title={label}><SocialIcon name={icon} /></a>
            ) : (
              <span key={label} aria-label={label} aria-disabled="true" title={label}><SocialIcon name={icon} /></span>
            ))}
          </div>
        </nav>
      </header>

      {article ? (
        <article className="office-article">
          <header className="office-article__hero">
            <div className="office-shell office-article__hero-inner">
              <a href={`${siteRoutes.home}#blog`} onClick={(event) => navigateWithTransition(event, `${siteRoutes.home}#blog`)}>
                <ArrowRight size={15} /> Voltar ao blog
              </a>
              <p>{article.category}</p>
              <h1>{article.title}</h1>
            </div>
          </header>
          <div className="office-shell office-article__layout">
            <figure className="office-article__media">
              <img src={BLOG_IMAGES[article.imageKey]} alt="" />
            </figure>
            <div className="office-article__body">
              {article.paragraphs.map((paragraph) => <p key={paragraph.slice(0, 50)}>{paragraph}</p>)}
            </div>
          </div>
        </article>
      ) : isHome ? (
      <section className="office-hero" id="inicio">
        <div className="office-shell office-hero__inner">
          <img className="office-hero__watermark" src={logo} alt="" aria-hidden="true" />
          <div className="office-hero__copy">
            <h1>{content.hero.title} {content.hero.titleBreak}</h1>
          </div>
        </div>
      </section>
      ) : (
        <section className="office-page-hero">
          <div className="office-shell office-page-hero__inner">
            {pageDetails.kicker && <p className="office-kicker office-kicker--light">{pageDetails.kicker}</p>}
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
            <h2>{content.servicesIntro.title}</h2>
            <p>{content.servicesIntro.text}</p>
          </div>
          <div className="office-areas__grid">
            {areas.map((area) => (
              <AreaCard key={area.title} area={area} onNavigate={navigateWithTransition} onOpenModal={openModal} />
            ))}
          </div>
        </div>
      </section>}

      {isHome && <section className="office-differentiators" id="diferenciais">
        <div className="office-shell office-differentiators__layout">
          <div className="office-differentiators__content">
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
            {areas.map((area) => (
              <AreaCard key={area.title} area={area} onNavigate={navigateWithTransition} onOpenModal={openModal} />
            ))}
          </div>
        </div>
      </section>}

      {(isHome || section === 'team') && <section className="office-team" id="equipe">
        <div className="office-shell">
          <div className="office-section-heading office-section-heading--team">
            <h2>Nosso time</h2>
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

      {isHome && <section className="office-blog" id="blog">
        <div className="office-shell">
          <div className="office-section-heading office-section-heading--dark">
            <h2>{content.blog.title}</h2>
          </div>
          <div className="office-blog__grid">
            {content.blog.posts.map((post) => {
              const href = `${baseUrl.replace(/\/$/, '')}/blog/${post.slug}/`;
              return (
                <article className="office-blog-card" key={post.slug}>
                  <a className="office-blog-card__media" href={href} onClick={(event) => navigateWithTransition(event, href)} aria-label={`Ler ${post.title}`}>
                    <img src={BLOG_IMAGES[post.imageKey]} alt="" loading="lazy" />
                  </a>
                  <div className="office-blog-card__body">
                    <p>{post.category}</p>
                    <h3>{post.title}</h3>
                    <a href={href} onClick={(event) => navigateWithTransition(event, href)}>Leia mais <ArrowRight size={15} /></a>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>}

      {isHome && <section className="office-clients" id="parceiros" aria-labelledby="office-clients-title">
        <div className="office-shell office-clients__layout">
          <div className="office-clients__heading">
            <h2 id="office-clients-title">CLIENTES PARCEIROS</h2>
          </div>
          <div className="office-clients__grid" aria-label="Clientes parceiros do escritório">
            {CLIENT_LOGOS.map((client) => (
              <figure className="office-client-logo" key={client.name}>
                <img src={client.image} alt={client.name} loading="lazy" />
              </figure>
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
            <p className="office-kicker office-kicker--light">FALE CONOSCO</p>
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
            <span><strong>Endereço</strong>{content.footer.addressLine}, {content.footer.addressCity}</span>
            <a href={`tel:${content.footer.phoneHref}`}><strong>Telefone</strong>{content.footer.phoneDisplay}</a>
            <a href={`mailto:${content.footer.email}`}><strong>E-mail</strong>{content.footer.email}</a>
          </div>
          <p>{content.footer.note}</p>
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
