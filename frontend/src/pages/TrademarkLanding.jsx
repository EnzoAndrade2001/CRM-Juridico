import { FileText, Search, ShieldCheck, Stamp } from 'lucide-react';
import OfficeLanding from '../features/site/OfficeLanding';
import content from '../content/registro-de-marca.json';

// Nomes de ícone ficam como texto no JSON (editável pelo CMS) e são
// resolvidos aqui para os componentes reais do lucide-react.
const ICONS = { Search, Stamp, ShieldCheck, FileText };

const NAV_ITEMS = [
  { href: '#sobre-o-tema', label: 'Registro de marca' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#sobre', label: 'Sobre' },
];

export default function TrademarkLanding() {
  return (
    <OfficeLanding
      content={content}
      icons={ICONS}
      navItems={NAV_ITEMS}
      ariaLabel="Conversar sobre registro de marca pelo WhatsApp"
    />
  );
}
