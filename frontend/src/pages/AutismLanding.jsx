import { GraduationCap, HeartHandshake, Landmark, Scale, Puzzle, AlertTriangle, Check, ArrowRight } from 'lucide-react';
import OfficeLanding from '../features/site/OfficeLanding';
import content from '../content/autismo.json';

// Nomes de ícone ficam como texto no JSON (editável pelo CMS) e são
// resolvidos aqui para os componentes reais do lucide-react.
const ICONS = { HeartHandshake, Landmark, GraduationCap, Scale };

const NAV_ITEMS = [
  { href: '#sobre-o-tema', label: 'Direitos da pessoa autista' },
  { href: '#informacoes', label: 'Informações Importantes' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#sobre', label: 'Sobre' },
];

export default function AutismLanding() {
  return (
    <OfficeLanding
      content={content}
      icons={ICONS}
      navItems={NAV_ITEMS}
      ariaLabel="Conversar sobre direitos da pessoa autista pelo WhatsApp"
    >
      {/* Seção 1: Alerta de Fraude */}
      <section className="office-landing__creative office-landing__creative--alert" id="informacoes">
        <div className="office-shell">
          <div className="office-creative-content">
            <span className="office-creative-icon"><AlertTriangle size={48} /></span>
            <h2>Atenção!</h2>
            <p className="office-creative-lead">
              Estão entrando em contato com alguns clientes se passando pelo nosso escritório, usando números pessoais dos sócios. Nosso atendimento ocorre somente pelos canais oficiais do escritório.
            </p>
            <div className="office-creative-footer-box">
              <p>Não faça PIX, não compartilhe códigos/senhas e não envie documentos antes de confirmar.</p>
              <strong>#FiqueAtento</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Seção 2: Detalhamento IR */}
      <section className="office-landing__creative office-landing__creative--detailed">
        <div className="office-shell office-creative-grid">
          <div className="office-creative-left">
            <div className="office-section-heading">
              <p className="office-kicker">Imposto de Renda</p>
              <h2>É possível discutir a dedução integral de despesas escolares de dependente com TEA/PCD</h2>
            </div>
            
            <p>Se você tem um filho com transtorno do espectro autista (TEA) ou outra deficiência mental/cognitiva, paga escola particular e declara Imposto de Renda, esta informação pode ser relevante.</p>
            <p>Uma decisão judicial recente reconheceu, em caso concreto, que os gastos com escola regular de pessoa com deficiência/TEA podem ser enquadrados como <strong>despesa médica</strong>.</p>
            
            <div className="office-creative-checklist">
              <p><strong>Na prática, isso pode permitir a dedução integral das mensalidades, com potencial de:</strong></p>
              <ul>
                <li><Check size={18} /> Aumentar a restituição; ou</li>
                <li><Check size={18} /> Reduzir o imposto a pagar.</li>
              </ul>
            </div>
            
            <p className="office-creative-small">Além disso, dependendo do caso, pode haver discussão sobre recuperação de valores dos últimos cinco anos, observadas as regras de prescrição e a documentação comprobatória.</p>
          </div>

          <div className="office-creative-right">
            <div className="office-creative-warning">
              <h3><AlertTriangle size={20} /> Atenção</h3>
              <p>A Receita Federal não reconhece isso automaticamente na declaração. Em regra, para buscar esse enquadramento e assegurar o direito, é necessário ajuizar medida judicial, com pedido para:</p>
              <ul>
                <li>Autorizar a dedução nas próximas declarações;</li>
                <li>Viabilizar a restituição/compensação do que foi pago a maior nos últimos 5 anos, quando cabível.</li>
              </ul>
            </div>
            <div className="office-creative-cta-box">
              <h4>Precisa de orientação?</h4>
              <p>Se quiser entender se o seu caso se encaixa, quais documentos são necessários e quais são os riscos/benefícios do caminho judicial, fale conosco.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Seção 3: Teaser Pais Obtêm Dedução */}
      <section className="office-landing__creative office-landing__creative--teaser1">
        <div className="office-shell office-creative-content">
          <Puzzle size={56} className="office-creative-huge-icon" />
          <h2>Pais obtêm dedução integral no IR de gastos com educação do filho autista</h2>
          <div className="office-creative-highlight-pill">
            <span>ADVOGADO, PRESTE ATENÇÃO NISSO AQUI!</span> <ArrowRight size={18} />
          </div>
        </div>
      </section>

      {/* Seção 4: Teaser Milhares de Famílias */}
      <section className="office-landing__creative office-landing__creative--teaser2">
        <div className="office-shell office-creative-content">
          <h2>Milhares de famílias com filhos autistas declaram o IR errado nos últimos 5 anos</h2>
          <div className="office-creative-massive-text">
            E PODEM CHEGAR AOS<br/><strong>R$ 100 MIL RESTITUÍDOS.</strong>
          </div>
          <p className="office-creative-subtext">
            Essas famílias provavelmente estão nos seus contatos do WhatsApp agora.
          </p>
        </div>
      </section>
    </OfficeLanding>
  );
}
