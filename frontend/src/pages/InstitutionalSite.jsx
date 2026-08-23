import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  CarFront,
  FileText,
  Landmark,
  Menu,
  MessageCircle,
  Scale,
  ShieldCheck,
  Stamp,
  X,
} from 'lucide-react';
import portrait from '../assets/pedro-bastos-lund-hero-cutout.png';
import aboutPortrait from '../assets/pedro-bastos-lund-about.jpg';
import eduardaPortrait from '../assets/dra-eduarda-hq.png';
import logo from '../assets/pedro-bastos-lund-monogram.png';
import './institutional-site.css';
import './institutional-brand-overrides.css';

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
  { key: 'guides', label: 'Dúvidas', path: siteRoutes.guides },
  { key: 'team', label: 'Nossa equipe', path: siteRoutes.team },
];
const sectionDetails = {
  areas: {
    kicker: 'O que defendemos',
    title: 'Serviços jurídicos.',
    text: 'Contratos, bancos, consumo, trabalho, família e empresas.',
  },
  process: {
    kicker: 'Como trabalhamos',
    title: 'Atendimento direto.',
    text: 'Você relata o caso. A equipe analisa os documentos e indica os próximos passos.',
  },
  guides: {
    kicker: 'Dúvidas jurídicas',
    title: 'Informação prática.',
    text: 'Orientações práticas sobre direitos, contratos e decisões do dia a dia.',
  },
  team: {
    kicker: 'Nossa equipe',
    title: 'Equipe jurídica.',
    text: 'Pedro Bastos Lund e equipe jurídica.',
  },
};
const revisionalUrl = `${baseUrl.replace(/\/$/, '')}/revisional-bancario/`;
const whatsappMessage = 'Olá, vim pelo site do escritório e gostaria de falar com a equipe.';
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
const socialLinks = [
  { label: 'Instagram', href: 'https://www.instagram.com/pedrobastoslund/', icon: 'instagram' },
  { label: 'Facebook', href: 'https://www.facebook.com/peedrobastoss/', icon: 'facebook' },
];

const areas = [
  {
    icon: Banknote,
    title: 'Revisional bancário',
    text: 'Juros, tarifas e seguros cobrados no contrato.',
    href: revisionalUrl,
  },
  {
    icon: CarFront,
    title: 'Busca e apreensão',
    text: 'Defesa em casos de atraso e retomada do veículo.',
    modal: {
      kicker: 'Direito bancário',
      title: 'Busca e apreensão.',
      intro: 'Análise da notificação, do processo e das alternativas disponíveis.',
      points: ['Constituição em mora e notificação', 'Etapas da ação de busca e apreensão', 'Defesa, quitação e regularização quando cabíveis'],
      documents: 'Contrato de financiamento, notificações recebidas, comprovantes de pagamento e documentos do veículo.',
      note: 'A orientação depende da fase do processo.',
    },
  },
  {
    icon: FileText,
    title: 'Contratos e cobranças',
    text: 'Cláusulas, prazos, valores e cobranças.',
    modal: {
      kicker: 'Prevenção jurídica',
      title: 'Contratos e cobranças.',
      intro: 'Leitura de obrigações, prazos, multas e pontos de negociação.',
      points: ['Cláusulas, prazos e multas', 'Cobranças, garantias e obrigações', 'Riscos na contratação e alternativas de ajuste'],
      documents: 'Contrato completo, aditivos, propostas comerciais, comprovantes e comunicações trocadas.',
      note: 'A análise deve ser feita com o contrato completo.',
    },
  },
  {
    icon: Landmark,
    title: 'Direito do consumidor',
    text: 'Cobranças indevidas e falhas na prestação do serviço.',
    modal: {
      kicker: 'Relações de consumo',
      title: 'Direito do consumidor.',
      intro: 'Análise de cobranças, contratos e falhas de atendimento.',
      points: ['Informações incompletas ou divergentes', 'Tarifas e serviços não reconhecidos', 'Falhas de atendimento, segurança ou prestação do serviço'],
      documents: 'Contrato, faturas, protocolos, comprovantes e registros de atendimento.',
      note: 'Separe contratos, faturas e protocolos de atendimento.',
    },
  },
  {
    icon: BriefcaseBusiness,
    title: 'Direito trabalhista',
    text: 'Vínculo, verbas, jornada e rescisão.',
    modal: {
      kicker: 'Direito trabalhista',
      title: 'Direito trabalhista.',
      intro: 'Análise de vínculo, verbas, jornada e documentos do trabalho.',
      points: ['Rescisão, verbas e horas trabalhadas', 'Assédio, acidentes e adoecimento', 'Reconhecimento de vínculo e demais questões do contrato de trabalho'],
      documents: 'CTPS, contrato, holerites, termo de rescisão, mensagens e outros registros relevantes.',
      note: 'Prazos trabalhistas devem ser observados.',
    },
  },
  {
    icon: Scale,
    title: 'Família e sucessões',
    text: 'Inventário, partilha e patrimônio familiar.',
    modal: {
      kicker: 'Direito de família e sucessões',
      title: 'Família e sucessões.',
      intro: 'Inventário, partilha, herança e organização patrimonial.',
      points: ['Inventário, partilha e cessão de direitos', 'Venda de bens durante o inventário', 'Organização patrimonial e acordos familiares'],
      documents: 'Certidões, documentos dos herdeiros, relação de bens, dívidas e eventuais contratos.',
      note: 'A documentação define os próximos passos.',
    },
  },
];

const guides = [
  {
    category: 'Direito bancário',
    title: 'Direitos do cliente do banco',
    excerpt: 'Portabilidade, informações, quitação e proteção de dados.',
    modal: {
      kicker: 'Orientação prática',
      title: 'Direitos bancários.',
      intro: 'Pontos para conferir antes de aceitar uma cobrança ou contratar um produto.',
      points: ['Portabilidade de crédito e produtos financeiros', 'Informações claras e completas na contratação', 'Desconto proporcional na quitação antecipada', 'Proteção e sigilo dos dados fornecidos'],
      note: 'O contrato deve ser analisado antes de qualquer decisão.',
    },
  },
  {
    category: 'Contratos',
    title: 'O que conferir em um contrato',
    excerpt: 'Prazos, multas, garantias e obrigações.',
    modal: {
      kicker: 'Orientação prática',
      title: 'Antes de assinar.',
      intro: 'Confira as cláusulas que definem responsabilidades e formas de saída.',
      points: ['Verifique objeto, prazo e forma de pagamento', 'Observe multas, garantias e hipóteses de rescisão', 'Guarde a versão assinada e os documentos da negociação'],
      note: 'Envie o documento completo para uma análise adequada.',
    },
  },
  {
    category: 'Societário e sucessões',
    title: 'Decisões sobre patrimônio',
    excerpt: 'Sócios, inventário, partilha e venda de bens.',
    modal: {
      kicker: 'Orientação prática',
      title: 'Patrimônio e sucessões.',
      intro: 'Contratos, prazos e documentos definem a condução de cada etapa.',
      points: ['Contrato social, prazo de saída e apuração de haveres', 'Responsabilidade por obrigações anteriores', 'Inventário, partilha e cessão de direitos hereditários'],
      note: 'A documentação define a análise do caso.',
    },
  },
];

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

function ContentModal({ content, closeButtonRef, onClose }) {
  if (!content) return null;

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
        <p className="office-kicker">{content.kicker}</p>
        <h2 id="office-modal-title">{content.title}</h2>
        <p className="office-modal__intro">{content.intro}</p>
        <div className="office-modal__columns">
          <div>
            <h3>Pontos</h3>
            <ul>
              {content.points.map((point) => <li key={point}>{point}</li>)}
            </ul>
          </div>
          {content.documents && (
            <div>
                <h3>Documentos</h3>
              <p>{content.documents}</p>
            </div>
          )}
        </div>
        <p className="office-modal__note"><ShieldCheck size={18} /> {content.note}</p>
        <WhatsAppLink className="office-button office-button--gold" label="Falar sobre este assunto no WhatsApp">
          Falar com o escritório <ArrowRight size={17} />
        </WhatsAppLink>
      </section>
    </div>
  );
}

export default function InstitutionalSite({ section = 'home' }) {
  const isHome = section === 'home';
  const pageDetails = sectionDetails[section];
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
    description.setAttribute(
      'content',
      'Advocacia e consultoria jurídica para contratos, bancos, consumo e empresas.',
    );
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
  const openModal = (content, event) => {
    lastModalTriggerRef.current = event.currentTarget;
    setActiveModal(content);
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
            <a key={item.key} href={item.path} onClick={(event) => { closeMenu(); navigateWithTransition(event, item.path); }}>{item.label}</a>
          ))}
          <WhatsAppLink className="office-header__cta" label="Falar com o escritório pelo WhatsApp" >
            <MessageCircle size={17} /> Falar no WhatsApp
          </WhatsAppLink>
          <div className="office-social-links" aria-label="Redes sociais">
            {socialLinks.map(({ label, href, icon }) => (
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
            <p className="office-hero__eyebrow"><span aria-hidden="true" /> Advocacia e consultoria jurídica</p>
            <h1>Decisões importantes pedem orientação clara.</h1>
            <p className="office-hero__lead">
              Atuação jurídica para pessoas e empresas, com análise do caso e caminhos objetivos para seguir.
            </p>
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

      {isHome && <section className="office-home-editorial">
        <div className="office-shell office-home-editorial__inner">
          <div>
            <p className="office-kicker">Atuação dedicada</p>
            <h2>O caso vem primeiro.</h2>
          </div>
          <p>Antes de indicar um caminho, entendemos os fatos, os documentos e o que precisa ser resolvido.</p>
        </div>
      </section>}

      {isHome && <section className="office-home-services" id="atuacao">
        <div className="office-shell">
          <div className="office-section-heading">
            <p className="office-kicker">O que defendemos</p>
            <h2>Onde podemos atuar.</h2>
            <p>Demandas concretas de pessoas, famílias e empresas.</p>
          </div>
          <div className="office-home-services__list">
            {areas.map(({ title, text, href, modal }, index) => {
              const content = <><span className="office-service-row__number">{String(index + 1).padStart(2, '0')}</span><span className="office-service-row__body"><strong>{title}</strong><span>{text}</span></span><ArrowRight size={18} /></>;
              return href ? (
                <a className="office-service-row" href={href} key={title} onClick={(event) => navigateWithTransition(event, href)}>{content}</a>
              ) : (
                <button className="office-service-row" type="button" key={title} onClick={(event) => openModal(modal, event)}>{content}</button>
              );
            })}
          </div>
        </div>
      </section>}

      {section === 'areas' && <section className="office-areas" id="atuacao">
        <div className="office-shell">
          <div className="office-section-heading">
            <h2>Áreas atendidas.</h2>
            <p>Conheça as principais demandas do escritório.</p>
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
            <h2>Atendimento jurídico.</h2>
            <p>Relato, análise dos documentos e orientação sobre os próximos passos.</p>
            <WhatsAppLink className="office-text-link" label="Falar com a equipe pelo WhatsApp">Falar no WhatsApp <ArrowRight size={17} /></WhatsAppLink>
          </div>
          <div className="office-process__steps">
            {[
              ['01', 'Relato', 'Você explica o que aconteceu.'],
              ['02', 'Análise', 'Conferimos os documentos relevantes.'],
              ['03', 'Orientação', 'Indicamos os caminhos possíveis.'],
            ].map(([number, title, text]) => (
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
            <article className="office-person">
              <img src={aboutPortrait} alt="Pedro Bastos Lund" />
              <div className="office-person__body"><p className="office-person__eyebrow">Advogado responsável</p><h3>Pedro Bastos Lund</h3><span>OAB/RS 74.953</span><p>Contratos, direito bancário e demandas empresariais.</p></div>
            </article>
            <article className="office-person">
              <img src={eduardaPortrait} alt="Eduarda Marranghello" />
              <div className="office-person__body"><p className="office-person__eyebrow">Equipe jurídica</p><h3>Eduarda Marranghello</h3><p>Atendimento e organização dos documentos.</p></div>
            </article>
          </div>
        </div>
      </section>}

      {isHome && <section className="office-home-team" id="equipe">
        <div className="office-shell office-home-team__layout">
          <div className="office-section-heading">
            <p className="office-kicker">Nossa equipe</p>
            <h2>Quem conduz cada atendimento.</h2>
            <p>Conheça os profissionais responsáveis pela análise e pelo acompanhamento das demandas.</p>
            <a className="office-text-link" href={siteRoutes.team} onClick={(event) => navigateWithTransition(event, siteRoutes.team)}>Conheça a equipe <ArrowRight size={17} /></a>
          </div>
          <div className="office-home-team__members">
            <article className="office-team-member">
              <img src={aboutPortrait} alt="Pedro Bastos Lund" loading="lazy" />
              <div><p className="office-person__eyebrow">Advogado responsável</p><h3>Pedro Bastos Lund</h3><span>OAB/RS 74.953</span></div>
            </article>
            <article className="office-team-member">
              <img src={eduardaPortrait} alt="Eduarda Marranghello" loading="lazy" />
              <div><p className="office-person__eyebrow">Equipe jurídica</p><h3>Eduarda Marranghello</h3><span>Atendimento e organização</span></div>
            </article>
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
            <span><strong>Endereço</strong>Rua Visconde do Herval, 1092, sala 503<br />Menino Deus, Porto Alegre/RS</span>
            <a href="tel:+555132235692"><strong>Telefone</strong>(51) 3223-5692</a>
            <a href="mailto:pedro@bastoslund.com.br"><strong>E-mail</strong>pedro@bastoslund.com.br</a>
          </div>
          <p>Informações gerais. Não substituem uma consulta jurídica.</p>
          <span>© {new Date().getFullYear()} Pedro Bastos Lund</span>
        </div>
      </footer>
      <WhatsAppLink className="office-float" label="Abrir conversa no WhatsApp"><MessageCircle size={20} /><span>Fale conosco</span></WhatsAppLink>
      <ContentModal content={activeModal} closeButtonRef={modalCloseButtonRef} onClose={() => setActiveModal(null)} />
    </main>
  );
}
