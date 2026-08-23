import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  CarFront,
  Check,
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
  { key: 'areas', label: 'Áreas de atuação', path: siteRoutes.areas, number: '01', description: 'Conheça as principais frentes de atendimento.' },
  { key: 'process', label: 'Como podemos ajudar', path: siteRoutes.process, number: '02', description: 'Veja o que você recebe do escritório.' },
  { key: 'guides', label: 'Conteúdos', path: siteRoutes.guides, number: '03', description: 'Informação jurídica para decidir melhor.' },
  { key: 'team', label: 'Equipe', path: siteRoutes.team, number: '04', description: 'Conheça quem acompanha cada demanda.' },
];
const sectionDetails = {
  areas: {
    kicker: 'Atuação',
    title: 'Áreas de atuação',
    text: 'Conheça as situações em que o escritório pode orientar você.',
  },
  process: {
    kicker: 'O que oferecemos',
    title: 'Seu caso merece atenção de verdade.',
    text: 'Você fala diretamente com a equipe, apresenta o que aconteceu e recebe uma leitura honesta sobre os caminhos possíveis.',
  },
  guides: {
    kicker: 'Conteúdos jurídicos',
    title: 'Direito explicado sem rodeios',
    text: 'Informações práticas para entender seus direitos antes de tomar uma decisão.',
  },
  team: {
    kicker: 'O escritório',
    title: 'Pessoas que acompanham o seu caso.',
    text: 'Conheça quem está à frente do atendimento e da condução das demandas.',
  },
};
const revisionalUrl = `${baseUrl.replace(/\/$/, '')}/revisional-bancario/`;
const whatsappMessage = 'Olá, vim pelo site do escritório e gostaria de falar com a equipe.';
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

const areas = [
  {
    icon: Banknote,
    title: 'Revisional bancário',
    text: 'Revisão de juros, tarifas e seguros no contrato.',
    href: revisionalUrl,
  },
  {
    icon: CarFront,
    title: 'Busca e apreensão',
    text: 'Defesa e orientação quando o financiamento entra em conflito.',
    modal: {
      kicker: 'Direito bancário',
      title: 'Busca e apreensão exige atenção ao procedimento completo.',
      intro: 'O atraso da parcela é apenas o início. A notificação, a ação judicial e os prazos seguintes podem definir quais alternativas ainda estão disponíveis.',
      points: ['Constituição em mora e notificação', 'Etapas da ação de busca e apreensão', 'Defesa, quitação e regularização quando cabíveis'],
      documents: 'Contrato de financiamento, notificações recebidas, comprovantes de pagamento e documentos do veículo.',
      note: 'Cada caso depende da fase do processo e dos documentos disponíveis.',
    },
  },
  {
    icon: FileText,
    title: 'Contratos e cobranças',
    text: 'Leitura de cláusulas, valores, prazos e cobranças.',
    modal: {
      kicker: 'Prevenção jurídica',
      title: 'Antes de assinar, leia. Entenda. Decida com segurança.',
      intro: 'Um contrato pode produzir efeitos importantes muito depois da assinatura. A análise preventiva ajuda a identificar obrigações, riscos e pontos que precisam de negociação.',
      points: ['Cláusulas, prazos e multas', 'Cobranças, garantias e obrigações', 'Riscos na contratação e alternativas de ajuste'],
      documents: 'Contrato completo, aditivos, propostas comerciais, comprovantes e comunicações trocadas.',
      note: 'A orientação jurídica antes da assinatura pode evitar conflitos e custos posteriores.',
    },
  },
  {
    icon: Landmark,
    title: 'Direito do consumidor',
    text: 'Resposta a cobranças indevidas e falhas na prestação do serviço.',
    modal: {
      kicker: 'Relações de consumo',
      title: 'Informação clara também é um direito.',
      intro: 'Instituições e empresas devem apresentar condições de contratação de forma clara, segura e completa. Quando isso não acontece, vale organizar os documentos e avaliar os próximos passos.',
      points: ['Informações incompletas ou divergentes', 'Tarifas e serviços não reconhecidos', 'Falhas de atendimento, segurança ou prestação do serviço'],
      documents: 'Contrato, faturas, protocolos, comprovantes e registros de atendimento.',
      note: 'A análise considera a relação contratual e as circunstâncias específicas de cada consumidor.',
    },
  },
  {
    icon: BriefcaseBusiness,
    title: 'Direito trabalhista',
    text: 'Organização de documentos sobre vínculo, verbas e jornada.',
    modal: {
      kicker: 'Direito trabalhista',
      title: 'Organize os fatos antes de decidir o caminho.',
      intro: 'Relações de trabalho envolvem documentos, datas e provas. Uma conversa inicial bem organizada ajuda a compreender direitos, riscos e possibilidades de atuação.',
      points: ['Rescisão, verbas e horas trabalhadas', 'Assédio, acidentes e adoecimento', 'Reconhecimento de vínculo e demais questões do contrato de trabalho'],
      documents: 'CTPS, contrato, holerites, termo de rescisão, mensagens e outros registros relevantes.',
      note: 'Prazos trabalhistas podem ser importantes. Procure orientação assim que surgir a dúvida.',
    },
  },
  {
    icon: Scale,
    title: 'Família e sucessões',
    text: 'Inventário, partilha e decisões patrimoniais com cuidado.',
    modal: {
      kicker: 'Direito de família e sucessões',
      title: 'Patrimônio e família pedem orientação cuidadosa.',
      intro: 'Inventários, heranças e decisões familiares envolvem pessoas, documentos e efeitos duradouros. A orientação adequada ajuda a preservar direitos e reduzir conflitos.',
      points: ['Inventário, partilha e cessão de direitos', 'Venda de bens durante o inventário', 'Organização patrimonial e acordos familiares'],
      documents: 'Certidões, documentos dos herdeiros, relação de bens, dívidas e eventuais contratos.',
      note: 'A venda ou negociação de um bem hereditário pode exigir formalidades e análise individual.',
    },
  },
];

const guides = [
  {
    category: 'Direito bancário',
    title: 'Quatro direitos que o cliente do banco precisa conhecer',
    excerpt: 'Portabilidade, informações da contratação, quitação antecipada e segurança dos dados.',
    modal: {
      kicker: 'Orientação prática',
      title: 'O cliente do banco tem direitos que merecem ser conhecidos.',
      intro: 'A relação bancária deve ser transparente. Conhecer as regras ajuda o consumidor a fazer perguntas, comparar propostas e identificar quando uma cobrança precisa ser analisada.',
      points: ['Portabilidade de crédito e produtos financeiros', 'Informações claras e completas na contratação', 'Desconto proporcional na quitação antecipada', 'Proteção e sigilo dos dados fornecidos'],
      note: 'Este conteúdo é informativo e não substitui a análise do contrato ou da situação concreta.',
    },
  },
  {
    category: 'Contratos',
    title: 'Leia antes de assinar: o contrato continua depois da assinatura',
    excerpt: 'Uma orientação preventiva pode revelar prazos, multas, garantias e obrigações que passam despercebidos.',
    modal: {
      kicker: 'Orientação prática',
      title: 'A melhor hora para entender um contrato é antes de assiná-lo.',
      intro: 'O texto contratual define responsabilidades e pode dificultar uma saída futura. Reserve tempo para entender as cláusulas e peça orientação quando houver dúvida.',
      points: ['Verifique objeto, prazo e forma de pagamento', 'Observe multas, garantias e hipóteses de rescisão', 'Guarde a versão assinada e os documentos da negociação'],
      note: 'Uma avaliação jurídica preventiva é feita a partir do documento completo e do contexto da contratação.',
    },
  },
  {
    category: 'Societário e sucessões',
    title: 'Decisões patrimoniais precisam de método',
    excerpt: 'Saída de sócio, apuração de haveres, inventário e venda de bens exigem documentos e etapas bem definidos.',
    modal: {
      kicker: 'Orientação prática',
      title: 'Quando patrimônio e relações pessoais se encontram, cada etapa importa.',
      intro: 'A saída de uma sociedade ou a organização de uma herança não se resolve apenas com um aviso ou um acordo informal. Contratos, prazos e critérios de cálculo precisam ser conferidos.',
      points: ['Contrato social, prazo de saída e apuração de haveres', 'Responsabilidade por obrigações anteriores', 'Inventário, partilha e cessão de direitos hereditários'],
      note: 'A solução adequada depende dos documentos, da estrutura patrimonial e do estágio da negociação ou do processo.',
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
            <h3>O que vale observar</h3>
            <ul>
              {content.points.map((point) => <li key={point}>{point}</li>)}
            </ul>
          </div>
          {content.documents && (
            <div>
              <h3>Documentos iniciais</h3>
              <p>{content.documents}</p>
            </div>
          )}
        </div>
        <p className="office-modal__note"><ShieldCheck size={18} /> {content.note}</p>
        <WhatsAppLink className="office-button office-button--gold" label="Falar sobre este assunto no WhatsApp">
          Falar sobre este assunto <ArrowRight size={17} />
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
      'Advocacia e consultoria jurídica com análise responsável, comunicação clara e acompanhamento próximo em cada etapa.',
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
            <MessageCircle size={17} /> Falar com a equipe
          </WhatsAppLink>
        </nav>
      </header>

      {isHome ? (
      <section className="office-hero" id="inicio" style={{ '--office-hero-image': `url(${portrait})` }}>
        <div className="office-shell office-hero__inner">
          <div className="office-hero__copy">
            <h1>O seu caso merece ser ouvido. <span>O próximo passo, bem orientado.</span></h1>
            <p className="office-hero__lead">
              Conte o que aconteceu. Nós ajudamos você a entender as opções e decidir com mais segurança.
            </p>
            <WhatsAppLink className="office-button office-button--gold" label="Iniciar atendimento com o escritório">
              Iniciar atendimento <ArrowRight size={18} />
            </WhatsAppLink>
            <div className="office-hero__assurances" aria-label="Compromissos do escritório">
              <span><Check size={15} /> Contato direto com a equipe</span>
              <span><Check size={15} /> Leitura dos documentos</span>
              <span><Check size={15} /> Orientação sem juridiquês</span>
            </div>
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
            <p className="office-kicker">Atuação dedicada</p>
            <h2>Primeiro, a gente entende o que aconteceu.</h2>
          </div>
          <div className="office-intro__copy">
            <p>O atendimento começa com uma conversa direta sobre os fatos, os documentos e o que você precisa resolver.</p>
          </div>
        </div>
      </section>}

      {isHome && <section className="office-highlights" id="destaque">
        <div className="office-shell">
          <div className="office-section-heading">
            <p className="office-kicker office-kicker--light">Áreas de destaque</p>
            <h2>Atuação para situações concretas.</h2>
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
            <h2>Veja onde podemos ajudar.</h2>
            <p>Conheça as principais demandas atendidas pelo escritório e os documentos que costumam ser importantes em cada uma delas.</p>
          </div>
          <div className="office-areas__grid">
            {areas.map(({ icon: Icon, title, text, href, modal }) => (
              <article className="office-area-card" key={title}>
                <span className="office-area-card__icon"><Icon size={23} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
                {href ? <a href={href} onClick={(event) => navigateWithTransition(event, href)}>Conhecer atendimento <ArrowRight size={16} /></a> : (
                  <button className="office-card-link" type="button" onClick={(event) => openModal(modal, event)}>
                    Ver orientação <ArrowRight size={16} />
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
            <h2>Informação jurídica para a vida real.</h2>
            <p>Textos diretos sobre situações que aparecem no dia a dia de pessoas e empresas.</p>
          </div>
          <div className="office-guides__grid">
            {guides.map((guide) => (
              <article className="office-guide-card" key={guide.title}>
                <p className="office-guide-card__category">{guide.category}</p>
                <h3>{guide.title}</h3>
                <p>{guide.excerpt}</p>
                <button className="office-card-link" type="button" onClick={(event) => openModal(guide.modal, event)}>
                  Ler orientação <ArrowRight size={16} />
                </button>
              </article>
            ))}
          </div>
          <p className="office-guides__source">Material geral para consulta inicial. Cada orientação depende dos fatos e documentos apresentados.</p>
        </div>
      </section>}

      {section === 'process' && <section className="office-process" id="como-funciona">
        <div className="office-shell office-process__grid">
          <div className="office-process__heading">
            <h2>Uma conversa que coloca as coisas no lugar.</h2>
            <p>Você conta o que aconteceu, nós analisamos os documentos e mostramos os caminhos que fazem sentido para o seu caso.</p>
            <WhatsAppLink className="office-text-link" label="Falar com a equipe pelo WhatsApp">Falar com a equipe <ArrowRight size={17} /></WhatsAppLink>
          </div>
          <div className="office-process__steps">
            {[
              ['01', 'Você conta o que aconteceu', 'A conversa começa pelos fatos e pelas dúvidas que trouxeram você até aqui.'],
              ['02', 'Analisamos os documentos', 'Conferimos contratos, mensagens, comprovantes e outros registros importantes.'],
              ['03', 'Indicamos os caminhos possíveis', 'Você entende riscos, alternativas e o que precisa ser feito a seguir.'],
            ].map(([number, title, text]) => (
              <article className="office-step" key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></article>
            ))}
          </div>
        </div>
      </section>}

      {section === 'team' && <section className="office-team" id="equipe">
        <div className="office-shell">
          <div className="office-section-heading office-section-heading--team">
            <h2>Profissionais que cuidam do seu caso.</h2>
          </div>
          <div className="office-team__grid">
            <article className="office-person">
              <img src={aboutPortrait} alt="Pedro Bastos Lund" />
              <div className="office-person__body"><p className="office-person__eyebrow">Advogado responsável</p><h3>Pedro Bastos Lund</h3><span>OAB/RS 74.953</span><p>Atendimento direto e atuação na análise de contratos, questões bancárias e demandas empresariais.</p></div>
            </article>
            <article className="office-person">
              <img src={eduardaPortrait} alt="Eduarda Marranghello" />
              <div className="office-person__body"><p className="office-person__eyebrow">Equipe jurídica</p><h3>Eduarda Marranghello</h3><p>Recepção, organização dos documentos e acompanhamento próximo durante o atendimento.</p></div>
            </article>
          </div>
        </div>
      </section>}

      {isHome && <section className="office-clients" id="clientes">
        <div className="office-shell">
          <p className="office-clients__title">Clientes e Parceiros</p>
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
          <div><p className="office-kicker office-kicker--light">Fale com o escritório</p><h2>Converse diretamente com a nossa equipe.</h2><p>Explique a sua situação e veja como podemos orientar você.</p></div>
          <WhatsAppLink className="office-button office-button--gold" label="Conversar com a equipe pelo WhatsApp">Conversar com a equipe <ArrowRight size={18} /></WhatsAppLink>
        </div>
      </section>

      <footer className="office-footer"><div className="office-shell office-footer__inner"><div className="office-footer__brand"><img src={logo} alt="" /><span><strong>Pedro Bastos Lund</strong><small>Advocacia e Consultoria Jurídica</small></span></div><p>Informações gerais para consulta. O atendimento considera os documentos e os fatos de cada situação.</p><span>© {new Date().getFullYear()} Pedro Bastos Lund</span></div></footer>
      <WhatsAppLink className="office-float" label="Abrir conversa no WhatsApp"><MessageCircle size={20} /><span>Fale conosco</span></WhatsAppLink>
      <ContentModal content={activeModal} closeButtonRef={modalCloseButtonRef} onClose={() => setActiveModal(null)} />
    </main>
  );
}
