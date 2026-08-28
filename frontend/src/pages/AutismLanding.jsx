import { GraduationCap, HeartHandshake, Landmark, Scale } from 'lucide-react';
import OfficeLanding from '../features/site/OfficeLanding';
import content from '../content/autismo.json';

// Nomes de ícone ficam como texto no JSON (editável pelo CMS) e são
// resolvidos aqui para os componentes reais do lucide-react.
const ICONS = { HeartHandshake, Landmark, GraduationCap, Scale };

const NAV_ITEMS = [
  { href: '#sobre-o-tema', label: 'Direitos da pessoa autista' },
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
    />
  );
}
