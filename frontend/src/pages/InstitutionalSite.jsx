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
import clientSia from '../assets/clients/sia.png';
import clientBoomMania from '../assets/clients/boom-mania.png';
import clientRodrigues from '../assets/clients/rodrigues.png';
import clientHamorim from '../assets/clients/hamorim.png';
import clientDgiLog from '../assets/clients/dgi-log.png';
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
  { key: 'areas', label: 'Áreas', path: siteRoutes.areas },
  { key: 'process', label: 'Atendimento', path: siteRoutes.process },
  { key: 'guides', label: 'Conteúdos', path: siteRoutes.guides },
  { key: 'team', label: 'Equipe', path: siteRoutes.team },
];
const sectionDetails = {
  areas: {
    kicker: 'Atuação',
    title: 'Áreas de atuação',
    text: 'Contratos, bancos, consumo, trabalho, família e empresas.',
  },
  process: {
    kicker: 'Atendimento',
    title: 'Atendimento direto.',
    text: 'Você relata o caso. A equipe analisa os documentos e indica os próximos passos.',
  },
  guides: {
    kicker: 'Conteúdos jurídicos',
    title: 'Informação jurídica.',
    text: 'Orientações práticas sobre direitos, contratos e decisões do dia a dia.',
  },
  team: {
    kicker: 'O escritório',
    title: 'A equipe.',
    text: 'Pedro Bastos Lund e equipe jurídica.',
  },
};
const revisionalUrl = `${baseUrl.replace(/\/$/, '')}/revisional-bancario/`;
const whatsappMessage = 'Olá, vim pelo site do escritório e gostaria de falar com a equipe.';
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

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

const clients = [
  { name: 'SIA', logo: clientSia },
  { name: 'Boom Mania', logo: clientBoomMania },
  { name: 'Hamorim', logo: clientHamorim },
  { name: 'DGI Log', logo: clientDgiLog },
  { name: 'Rodrigues Distribuidora', logo: clientRodrigues },
];

const highlights = [
  {
    mark: '01',
    label: 'Direito Civil',
    title: 'Direito Civil',
    text: 'Contratos, indenizações e obrigações civis tratados a partir dos fatos e dos documentos do caso.',
  },
  {
    mark: '02',
    label: 'Direito Empresarial',
    title: 'Direito Empresarial',
    text: 'Contratos comerciais, relações entre sócios e decisões importantes para a rotina da empresa.',
  },
  {
    mark: '03',
    label: 'Direito do Consumidor',
    title: 'Direito do Consumidor',
    text: 'Cobranças indevidas, falhas na prestação de serviços e outros problemas de consumo.',
  },
  {
    mark: '04',
    label: 'Direito Bancário',
    title: 'Direito Bancário',
    text: 'Conferência de juros, tarifas, seguros e demais encargos cobrados em contratos bancários.',
  },
  {
    mark: '05',
    label: 'Registro de Marcas',
    title: 'Registro de Marcas',
    text: 'Pedido e acompanhamento do registro que protege o nome e a identidade da sua empresa.',
  },
];

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
  const [activeHighlight, setActiveHighlight] = useState(0);
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
        </nav>
      </header>

      {isHome ? (
      <section className="office-hero" id="inicio" style={{ '--office-hero-image': `url(${portrait})` }}>
        <div className="office-shell office-hero__inner">
          <div className="office-hero__copy">
            <h1>Orientação jurídica. <span>Decisões mais seguras.</span></h1>
            <p className="office-hero__lead">
              Atendimento direto para contratos, bancos, consumo e empresas.
            </p>
            <WhatsAppLink className="office-button office-button--gold" label="Iniciar atendimento com o escritório">
              Falar com o escritório <ArrowRight size={18} />
            </WhatsAppLink>
          </div>
          <p className="office-hero__name"><span>Pedro Bastos Lund</span> OAB/RS 74.953</p>
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

      {isHome && <section className="office-intro">
        <div className="office-shell office-intro__grid">
          <div>
            <p className="office-kicker">Atendimento</p>
            <h2>Análise individual.</h2>
          </div>
          <div className="office-intro__copy">
            <p>Você apresenta os fatos e os documentos. A equipe orienta os próximos passos.</p>
          </div>
        </div>
      </section>}

      {isHome && <section className="office-highlights" id="destaque">
        <div className="office-shell">
          <div className="office-section-heading">
            <p className="office-kicker office-kicker--light">Áreas de atuação</p>
            <h2>Principais áreas.</h2>
          </div>
          <div className="office-highlights__grid">
            <div className="office-highlights__art" aria-hidden="true">
              <span>{highlights[activeHighlight].mark}</span>
            </div>
            <div className="office-highlights__body">
              <div className="office-highlights__tabs" role="tablist" aria-label="Áreas de destaque">
                {highlights.map((item, index) => (
                  <button
                    key={item.label}
                    type="button"
                    role="tab"
                    aria-selected={activeHighlight === index}
                    className={`office-highlights__tab ${activeHighlight === index ? 'is-active' : ''}`}
                    onClick={() => setActiveHighlight(index)}
                  >
                    <span className="office-highlights__tab-mark" aria-hidden="true">{item.mark}</span>
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="office-highlights__content" key={activeHighlight}>
                <h3>{highlights[activeHighlight].title}</h3>
                <p>{highlights[activeHighlight].text}</p>
              </div>
            </div>
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

      {isHome && <section className="office-clients" id="clientes">
        <div className="office-shell">
          <p className="office-clients__title">Clientes e parceiros</p>
          <div className="office-clients__grid">
            {clients.map((client) => (
              <span className="office-clients__item" key={client.name}>
                {client.logo ? (
                  <img src={client.logo} alt={client.name} loading="lazy" />
                ) : (
                  <span className="office-clients__name">{client.name}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </section>}

      <section className="office-final-cta">
        <div className="office-shell office-final-cta__inner">
          <div><p className="office-kicker office-kicker--light">Contato</p><h2>Fale com o escritório.</h2><p>Envie uma mensagem sobre o seu caso.</p></div>
          <WhatsAppLink className="office-button office-button--gold" label="Conversar com a equipe pelo WhatsApp">Falar no WhatsApp <ArrowRight size={18} /></WhatsAppLink>
        </div>
      </section>

      <footer className="office-footer"><div className="office-shell office-footer__inner"><div className="office-footer__brand"><img src={logo} alt="" /><span><strong>Pedro Bastos Lund</strong><small>Advocacia e Consultoria Jurídica</small></span></div><p>Informações gerais. Não substituem uma consulta jurídica.</p><span>© {new Date().getFullYear()} Pedro Bastos Lund</span></div></footer>
      <WhatsAppLink className="office-float" label="Abrir conversa no WhatsApp"><MessageCircle size={20} /><span>Fale conosco</span></WhatsAppLink>
      <ContentModal content={activeModal} closeButtonRef={modalCloseButtonRef} onClose={() => setActiveModal(null)} />
    </main>
  );
}
