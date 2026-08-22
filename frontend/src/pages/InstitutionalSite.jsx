import { useEffect, useState } from 'react';
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
  { icon: Banknote, title: 'Revisional bancário', text: 'Análise de juros, tarifas, seguros e demais encargos em contratos bancários.', href: revisionalUrl },
  { icon: CarFront, title: 'Busca e apreensão', text: 'Orientação jurídica para situações que envolvem financiamento e risco de apreensão do veículo.' },
  { icon: FileText, title: 'Contratos e cobranças', text: 'Leitura técnica de contratos, cobranças indevidas e obrigações que precisam de atenção.' },
  { icon: Landmark, title: 'Direito do consumidor', text: 'Atuação em relações de consumo e na defesa de direitos diante de práticas abusivas.' },
  { icon: BriefcaseBusiness, title: 'Direito trabalhista', text: 'Análise individualizada de questões trabalhistas, documentos e possíveis medidas.' },
  { icon: Scale, title: 'Família e sucessões', text: 'Orientação responsável para decisões familiares, inventários e organização patrimonial.' },
];

function WhatsAppLink({ children, className = '', label }) {
  return (
    <a className={`office-button-link ${className}`} href={whatsappUrl} target="_blank" rel="noreferrer" aria-label={label}>
      {children}
    </a>
  );
}

export default function InstitutionalSite() {
  const [menuOpen, setMenuOpen] = useState(false);

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

  const closeMenu = () => setMenuOpen(false);

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
          <a href="#equipe" onClick={closeMenu}>Equipe</a>
          <WhatsAppLink className="office-header__cta" label="Falar com o escritório pelo WhatsApp" >
            <MessageCircle size={17} /> Falar com a equipe
          </WhatsAppLink>
        </nav>
      </header>

      <section className="office-hero" id="inicio" style={{ '--office-hero-image': `url(${portrait})` }}>
        <div className="office-shell office-hero__inner">
          <div className="office-hero__copy">
            <p className="office-eyebrow"><span /> Advocacia e consultoria jurídica</p>
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

      <section className="office-areas" id="atuacao">
        <div className="office-shell">
          <div className="office-section-heading">
            <p className="office-kicker">Áreas de atuação</p>
            <h2>Orientação jurídica para decisões que merecem atenção.</h2>
            <p>Conheça as principais frentes de atendimento do escritório e fale com a equipe sobre a sua situação.</p>
          </div>
          <div className="office-areas__grid">
            {areas.map(({ icon: Icon, title, text, href }) => (
              <article className="office-area-card" key={title}>
                <span className="office-area-card__icon"><Icon size={23} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
                {href ? <a href={href}>Conhecer atendimento <ArrowRight size={16} /></a> : <WhatsAppLink label={`Falar sobre ${title}`}>Falar com a equipe <ArrowRight size={16} /></WhatsAppLink>}
              </article>
            ))}
          </div>
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
              <img src={eduardaPortrait} alt="Dra. Eduarda Marranghello" />
              <div className="office-person__body"><p className="office-person__eyebrow">Advogada</p><h3>Dra. Eduarda Marranghello</h3><p>Atuação dedicada, organização das informações e acompanhamento cuidadoso de cada demanda.</p></div>
            </article>
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
    </main>
  );
}
