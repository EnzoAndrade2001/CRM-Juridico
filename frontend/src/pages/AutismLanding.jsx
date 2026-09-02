import { GraduationCap, HeartHandshake, Landmark, Scale, Puzzle } from 'lucide-react';
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
      <section className="office-landing__gallery" id="informacoes">
        <div className="office-shell">
          <div className="office-section-heading">
            <p className="office-kicker" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Puzzle size={18} style={{ color: 'var(--office-gold)' }} />
              Avisos e Direitos
            </p>
            <h2>Informações Importantes</h2>
          </div>
          <div className="office-landing__gallery-grid">
            <div className="office-landing__gallery-item">
              <img src={`${import.meta.env.BASE_URL}assets/autismo/deducao-ir.jpg`} alt="Imposto de Renda: dedução integral de despesas escolares" className="office-landing__gallery-img" />
            </div>
            <div className="office-landing__gallery-item">
              <img src={`${import.meta.env.BASE_URL}assets/autismo/alerta-fraude.jpg`} alt="Alerta: Estão se passando pelo nosso escritório" className="office-landing__gallery-img" />
            </div>
            <div className="office-landing__gallery-item">
              <img src={`${import.meta.env.BASE_URL}assets/autismo/pais-obtem-deducao.jpg`} alt="Pais obtêm dedução integral no IR" className="office-landing__gallery-img" />
            </div>
            <div className="office-landing__gallery-item">
              <img src={`${import.meta.env.BASE_URL}assets/autismo/milhares-de-familias.jpg`} alt="Milhares de famílias declaram IR errado e podem restituir" className="office-landing__gallery-img" />
            </div>
          </div>
        </div>
      </section>
    </OfficeLanding>
  );
}
