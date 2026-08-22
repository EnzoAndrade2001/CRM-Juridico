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
import './trademark-landing.css';

const whatsappMessage = 'Olá, vim pela página de Registro de Marca e gostaria de falar sobre o registro da minha marca.';
// Número oficial da instância LUND/PBL. Todos os CTAs da landing usam o
// mesmo destino para que o cliente caia diretamente na triagem da IA.
const whatsappNumber = '555193665581';
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

const reviewItems = [
  {
    icon: Search,
    title: 'Busca de viabilidade',
    text: 'Verificação prévia de marcas iguais ou semelhantes já registradas ou em pedido no INPI.',
  },
  {
    icon: Stamp,
    title: 'Registro no INPI',
    text: 'Condução completa do pedido de registro, da classificação de Nice ao acompanhamento das publicações.',
  },
  {
    icon: ShieldCheck,
    title: 'Monitoramento e defesa',
    text: 'Acompanhamento de oposições, impugnações e tentativas de registro de marcas conflitantes.',
  },
  {
    icon: FileText,
    title: 'Contratos e licenciamento',
    text: 'Cessão, licenciamento de uso e demais contratos relacionados à marca já registrada.',
  },
];

const steps = [
  ['01', 'Conte sobre sua marca', 'Envie o nome, o segmento de atuação e, se tiver, a logomarca pelo WhatsApp.'],
  ['02', 'Receba a busca de viabilidade', 'Verificamos se há conflito com marcas já registradas antes de seguir com o pedido.'],
  ['03', 'Acompanhe o registro', 'Conduzimos o processo junto ao INPI e mantemos você informado em cada etapa.'],
];

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

    document.title = 'Registro de Marca | Pedro Bastos Lund Advocacia';
    description?.setAttribute(
      'content',
      'Registro de marca no INPI com análise de viabilidade, acompanhamento do processo e defesa em oposições. Atendimento direto com Pedro Bastos Lund Advocacia.',
    );

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
            <p className="trademark-eyebrow"><span /> Sua marca ainda não está registrada?</p>
            <h1>
              <span>Registre sua marca</span>{' '}
              <em><span>antes que outra</span>{' '}<span>pessoa registre.</span></em>
            </h1>
            <p className="trademark-hero__lead">
              Uma marca não registrada pode ser usada — e registrada — por outra empresa a qualquer momento. A análise de viabilidade e o registro no INPI protegem o nome, a identidade e o investimento feitos no seu negócio.
            </p>
            <WhatsAppLink className="trademark-button trademark-button--gold">
              REGISTRAR MINHA MARCA <ArrowRight size={19} />
            </WhatsAppLink>
            <div className="trademark-hero__assurances" aria-label="Características do atendimento">
              <span><Check size={15} /> Busca de viabilidade</span>
              <span><Check size={15} /> Acompanhamento no INPI</span>
              <span><Check size={15} /> Orientação clara</span>
            </div>
          </div>
          <p className="trademark-hero__name"><span>Pedro Bastos Lund</span> Advogado</p>
        </div>
      </section>

      <section className="trademark-intro" id="marca">
        <div className="trademark-shell trademark-intro__grid">
          <div>
            <p className="trademark-kicker">Proteja antes de expandir</p>
            <h2>Investiu em uma marca sem registrá-la? Isso pode custar caro mais tarde.</h2>
          </div>
          <div className="trademark-intro__text">
            <p>
              Sem o registro no INPI, qualquer pessoa pode contestar o uso da sua marca, registrá-la primeiro ou até exigir que você deixe de usá-la — mesmo que tenha sido você quem a criou. O registro garante exclusividade de uso em todo o território nacional.
            </p>
            <p className="trademark-note"><ShieldCheck size={20} /> A viabilidade do registro depende de uma busca prévia. Cada caso é analisado individualmente antes do pedido ser protocolado.</p>
          </div>
        </div>
      </section>

      <section className="trademark-review">
        <div className="trademark-shell">
          <div className="trademark-section-heading">
            <p className="trademark-kicker">O que está incluído</p>
            <h2>Do primeiro nome pensado até a marca protegida.</h2>
          </div>
          <div className="trademark-review__cards">
            {reviewItems.map(({ icon: Icon, title, text }, index) => (
              <article className="trademark-review-card" key={title}>
                <span className="trademark-review-card__number">0{index + 1}</span>
                <span className="trademark-review-card__icon"><Icon size={25} /></span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="trademark-process" id="como-funciona">
        <div className="trademark-shell trademark-process__grid">
          <div className="trademark-process__heading">
            <p className="trademark-kicker trademark-kicker--light">Como funciona</p>
            <h2>Um atendimento simples, direto e transparente.</h2>
            <p>O atendimento inicial é realizado pelo WhatsApp. Após entender o segmento e o nome pretendido, orientamos sobre a busca de viabilidade e os próximos passos do registro.</p>
            <WhatsAppLink className="trademark-text-link">
              Iniciar atendimento <ArrowRight size={18} />
            </WhatsAppLink>
          </div>
          <div className="trademark-steps">
            {steps.map(([number, title, text]) => (
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
            <p className="trademark-kicker">Atendimento jurídico</p>
            <h2>Pedro Bastos Lund</h2>
            <p className="trademark-about__role">Advocacia e Consultoria Jurídica</p>
            <p>
              Atuação dedicada a empreendedores e empresas que precisam proteger o nome e a identidade do seu negócio, com análise responsável, comunicação acessível e acompanhamento próximo em cada etapa do registro.
            </p>
            <blockquote>“Uma marca registrada é um ativo do negócio. Protegê-la é parte da estratégia, não um detalhe burocrático.”</blockquote>
            <WhatsAppLink className="trademark-button trademark-button--navy">
              Conversar com o escritório <MessageCircle size={19} />
            </WhatsAppLink>
          </div>
        </div>
      </section>

      <section className="trademark-final-cta">
        <div className="trademark-shell trademark-final-cta__inner">
          <span className="trademark-final-cta__icon"><Scale size={30} /></span>
          <div>
            <p className="trademark-kicker trademark-kicker--light">Fale com o escritório</p>
            <h2>Não deixe sua marca vulnerável.</h2>
            <p>Envie o nome da sua marca e solicite uma busca de viabilidade inicial.</p>
          </div>
          <WhatsAppLink className="trademark-button trademark-button--gold">
            Quero registrar <ArrowRight size={19} />
          </WhatsAppLink>
        </div>
      </section>

      <footer className="trademark-footer">
        <div className="trademark-shell trademark-footer__inner">
          <div className="trademark-footer__brand">
            <span className="trademark-footer__mark"><img src={logo} alt="" /></span>
            <span><strong>Pedro Bastos Lund</strong><small>Advocacia e Consultoria Jurídica</small></span>
          </div>
          <p>Conteúdo informativo. A viabilidade do registro e os prazos possíveis dependem das particularidades de cada marca e segmento.</p>
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
