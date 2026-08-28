import { Banknote, CarFront, FileSearch, Landmark } from 'lucide-react';
import OfficeLanding from '../features/site/OfficeLanding';
import BankReviewCalculator from './BankReviewCalculator';
import content from '../content/revisional-bancario.json';

// Nomes de ícone ficam como texto no JSON (editável pelo CMS) e são
// resolvidos aqui para os componentes reais do lucide-react.
const ICONS = { Banknote, Landmark, FileSearch, CarFront };

const NAV_ITEMS = [
  { href: '#sobre-o-tema', label: 'Revisional bancário' },
  { href: '#calculadora', label: 'Calculadora' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#sobre', label: 'Sobre' },
];

const whatsappUrl = `https://wa.me/555193665581?text=${encodeURIComponent(content.whatsapp.message)}`;

export default function BankReviewLanding() {
  return (
    <OfficeLanding
      content={content}
      icons={ICONS}
      navItems={NAV_ITEMS}
      ariaLabel="Conversar sobre revisional bancário pelo WhatsApp"
      heroExtras={false}
    >
      <BankReviewCalculator whatsappUrl={whatsappUrl} />
    </OfficeLanding>
  );
}
