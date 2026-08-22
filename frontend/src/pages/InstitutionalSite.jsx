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
import portrait from '../assets/pedro-bastos-lund-hero-hq.png';
import aboutPortrait from '../assets/pedro-bastos-lund-about.jpg';
import eduardaPortrait from '../assets/dra-eduarda-hq.png';
import logo from '../assets/pedro-bastos-lund-monogram.png';
import './institutional-site.css';
import './institutional-brand-overrides.css';

const whatsappNumber = '555193665581';
const baseUrl = import.meta.env.BASE_URL || '/';
const revisionalUrl = `${baseUrl.replace(/\/$/, '')}/revisional-bancario/`;
const whatsappMessage = 'Olá, vim pelo site do escritório e gostaria de falar com a equipe.';
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

const areas = [
  {
    icon: Banknote,
    title: 'Revisional bancário',
    text: 'Análise de juros, tarifas, seguros e demais encargos em contratos bancários.',
    href: revisionalUrl,
  },
  {
    icon: CarFront,
    title: 'Busca e apreensão',
    text: 'Orientação jurídica para situações que envolvem financiamento e risco de apreensão do veículo.',
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
    text: 'Leitura técnica de contratos, cobranças indevidas e obrigações que precisam de atenção.',
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
    text: 'Atuação em relações de consumo e na defesa de direitos diante de práticas abusivas.',
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
    text: 'Análise individualizada de questões trabalhistas, documentos e possíveis medidas.',
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
    text: 'Orientação responsável para decisões familiares, inventários e organização patrimonial.',
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

const clients = ['SIA', 'Boom Mania', 'Hamorim', 'DGI Log', 'Rodrigues Distribuidora'];

const highlights = [
  {
    icon: Scale,
    label: 'Direito Civil',
    title: 'Direito Civil',
    text: 'Contratos, responsabilidade civil e obrigações analisados com atenção às particularidades de cada caso.',
  },
  {
    icon: BriefcaseBusiness,
    label: 'Direito Empresarial',
    title: 'Direito Empresarial',
    text: 'Orientação societária, contratos comerciais e prevenção de riscos na rotina do seu negócio.',
  },
  {
    icon: Landmark,
    label: 'Direito do Consumidor',
    title: 'Direito do Consumidor',
    text: 'Defesa de direitos em relações de consumo diante de práticas abusivas ou cobranças indevidas.',
  },
  {
    icon: Banknote,
    label: 'Direito Bancário',
    title: 'Direito Bancário',
    text: 'Análise de juros, tarifas, seguros e demais encargos em contratos bancários e financeiros.',
  },
  {
    icon: Stamp,
    label: 'Registro de Marcas',
    title: 'Registro de Marcas',
    text: 'Proteção da identidade e dos ativos intangíveis da empresa junto ao INPI.',
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

export default function InstitutionalSite() {
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
    document.title = 'Pedro Bastos Lund | Advocacia e Consultoria Jurídica';
    description.setAttribute(
      'content',
      'Advocacia e consultoria jurídica com análise responsável, comunicação clara e acompanhamento próximo em cada etapa.',
    );
    return () => {
      document.title = previousTitle;
      if (createdDescription) description.remove();
      else description.setAttribute('content', previousDescription || '');
    };
  }, []);

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
  const openModal = (content, event) => {
    lastModalTriggerRef.current = event.currentTarget;
    setActiveModal(content);
  };

  return (
    <main className="office-site">
      <header className="office-header">
        <a className="office-brand" href="#inicio" onClick={closeMenu} aria-label="Pedro Bastos Lund Advocacia — início">
          <span className="office-brand__mark"><img src={logo} alt="" /></span>
          <span><strong>Pedro Bastos Lund</strong><small>Advocacia e Consultoria Jurídica</small></span>
        </a>
        <button className="office-menu-toggle" type="button" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <nav className={`office-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Navegação principal">
          <a href="#atuacao" onClick={closeMenu}>Áreas de atuação</a>
          <a href="#como-funciona" onClick={closeMenu}>Como funciona</a>
          <a href="#conteudos" onClick={closeMenu}>Conteúdos</a>
          <a href="#equipe" onClick={closeMenu}>Equipe</a>
          <WhatsAppLink className="office-header__cta" label="Falar com o escritório pelo WhatsApp" >
            <MessageCircle size={17} /> Falar com a equipe
          </WhatsAppLink>
        </nav>
      </header>

      <section className="office-hero" id="inicio" style={{ '--office-hero-image': `url(${portrait})` }}>
        <div className="office-shell office-hero__inner">
          <div className="office-hero__copy">
            <h1>Clareza para decidir. <em>Segurança para agir.</em></h1>
            <p className="office-hero__lead">
              Atendimento jurídico próximo, com análise criteriosa dos documentos e orientação objetiva para cada situação.
            </p>
            <WhatsAppLink className="office-button office-button--gold" label="Iniciar atendimento com o escritório">
              Iniciar atendimento <ArrowRight size={18} />
            </WhatsAppLink>
            <div className="office-hero__assurances" aria-label="Compromissos do escritório">
              <span><Check size={15} /> Atendimento individual</span>
              <span><Check size={15} /> Comunicação clara</span>
              <span><Check size={15} /> Análise responsável</span>
            </div>
          </div>
          <p className="office-hero__name"><span>Pedro Bastos Lund</span> OAB/RS 74.953</p>
        </div>
      </section>

      <section className="office-intro">
        <div className="office-shell office-intro__grid">
          <div>
            <p className="office-kicker">Atuação dedicada</p>
            <h2>Entender o seu caso é o primeiro passo para orientar o caminho jurídico.</h2>
          </div>
          <div className="office-intro__copy">
            <p>O escritório Pedro Bastos Lund une atendimento acessível e análise técnica para que você compreenda suas opções antes de tomar uma decisão.</p>
            <p className="office-note"><ShieldCheck size={20} /> Cada atendimento é analisado de forma individual. As medidas possíveis dependem dos documentos e das circunstâncias do caso.</p>
          </div>
        </div>
      </section>

      <section className="office-highlights" id="destaque">
        <div className="office-shell">
          <div className="office-section-heading">
            <p className="office-kicker office-kicker--light">Áreas de destaque</p>
            <h2>Um panorama rápido das frentes que mais procuram o escritório.</h2>
          </div>
          <div className="office-highlights__grid">
            <div className="office-highlights__art" aria-hidden="true">
              <Scale size={96} />
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
                    <item.icon size={16} /> {item.label}
                  </button>
                ))}
              </div>
              <div className="office-highlights__content">
                <h3>{highlights[activeHighlight].title}</h3>
                <p>{highlights[activeHighlight].text}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="office-areas" id="atuacao">
        <div className="office-shell">
          <div className="office-section-heading">
            <p className="office-kicker">Áreas de atuação</p>
            <h2>Orientação jurídica para decisões que merecem atenção.</h2>
            <p>Conheça as principais frentes de atendimento do escritório e fale com a equipe sobre a sua situação.</p>
          </div>
          <div className="office-areas__grid">
            {areas.map(({ icon: Icon, title, text, href, modal }) => (
              <article className="office-area-card" key={title}>
                <span className="office-area-card__icon"><Icon size={23} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
                {href ? <a href={href}>Conhecer atendimento <ArrowRight size={16} /></a> : (
                  <button className="office-card-link" type="button" onClick={(event) => openModal(modal, event)}>
                    Ver orientação <ArrowRight size={16} />
                  </button>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="office-guides" id="conteudos">
        <div className="office-shell">
          <div className="office-section-heading">
            <p className="office-kicker">Conteúdos jurídicos</p>
            <h2>Informação para decidir com mais segurança.</h2>
            <p>Orientações objetivas sobre temas que aparecem no dia a dia de clientes, empresas e famílias.</p>
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
          <p className="office-guides__source">Conteúdo informativo. A análise jurídica depende das particularidades de cada caso.</p>
        </div>
      </section>

      <section className="office-process" id="como-funciona">
        <div className="office-shell office-process__grid">
          <div className="office-process__heading">
            <p className="office-kicker office-kicker--light">Como funciona</p>
            <h2>Um atendimento simples, direto e transparente.</h2>
            <p>O primeiro contato acontece pelo WhatsApp. A partir dele, entendemos a demanda e indicamos os documentos necessários para a análise jurídica.</p>
            <WhatsAppLink className="office-text-link" label="Iniciar conversa no WhatsApp">Iniciar conversa <ArrowRight size={17} /></WhatsAppLink>
          </div>
          <div className="office-process__steps">
            {[
              ['01', 'Conte o que aconteceu', 'Explique brevemente a situação e o que precisa resolver.'],
              ['02', 'Organize os documentos', 'A equipe orienta quais informações são importantes para o caso.'],
              ['03', 'Receba os próximos passos', 'Você entende as possibilidades jurídicas antes de decidir.'],
            ].map(([number, title, text]) => (
              <article className="office-step" key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div></article>
            ))}
          </div>
        </div>
      </section>

      <section className="office-team" id="equipe">
        <div className="office-shell">
          <div className="office-section-heading office-section-heading--team">
            <p className="office-kicker">Nossa equipe</p>
            <h2>Atendimento próximo em cada etapa.</h2>
          </div>
          <div className="office-team__grid">
            <article className="office-person">
              <img src={aboutPortrait} alt="Pedro Bastos Lund" />
              <div className="office-person__body"><p className="office-person__eyebrow">Advogado responsável</p><h3>Pedro Bastos Lund</h3><span>OAB/RS 74.953</span><p>Atuação dedicada à análise criteriosa dos contratos e à orientação jurídica clara.</p></div>
            </article>
            <article className="office-person">
              <img src={eduardaPortrait} alt="Equipe jurídica do escritório" />
              <div className="office-person__body"><p className="office-person__eyebrow">Equipe jurídica</p><h3>Suporte jurídico dedicado</h3><p>Organização das informações e acompanhamento cuidadoso de cada demanda, do primeiro contato à conclusão do caso.</p></div>
            </article>
          </div>
        </div>
      </section>

      <section className="office-clients" id="clientes">
        <div className="office-shell">
          <p className="office-clients__title">Clientes e Parceiros</p>
          <div className="office-clients__grid">
            {clients.map((name) => (
              <span className="office-clients__name" key={name}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="office-final-cta">
        <div className="office-shell office-final-cta__inner">
          <div><p className="office-kicker office-kicker--light">Fale com o escritório</p><h2>Uma orientação clara começa com uma boa conversa.</h2><p>Envie uma mensagem e conte como podemos ajudar.</p></div>
          <WhatsAppLink className="office-button office-button--gold" label="Conversar com a equipe pelo WhatsApp">Conversar com a equipe <ArrowRight size={18} /></WhatsAppLink>
        </div>
      </section>

      <footer className="office-footer"><div className="office-shell office-footer__inner"><div className="office-footer__brand"><img src={logo} alt="" /><span><strong>Pedro Bastos Lund</strong><small>Advocacia e Consultoria Jurídica</small></span></div><p>Conteúdo informativo. A análise jurídica depende das particularidades de cada caso.</p><span>© {new Date().getFullYear()} Pedro Bastos Lund</span></div></footer>
      <WhatsAppLink className="office-float" label="Abrir conversa no WhatsApp"><MessageCircle size={20} /><span>Fale conosco</span></WhatsAppLink>
      <ContentModal content={activeModal} closeButtonRef={modalCloseButtonRef} onClose={() => setActiveModal(null)} />
    </main>
  );
}
