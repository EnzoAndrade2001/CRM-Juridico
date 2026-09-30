import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Mantem <link rel="canonical"> e og:url alinhados com a rota atual. Como o app
// e uma SPA, o index.html so traz a URL da home; sem isso todas as paginas
// apontariam para "/" e os buscadores consolidariam tudo nela.
export default function useCanonical() {
  const { pathname } = useLocation();

  useEffect(() => {
    const url = `${window.location.origin}${pathname === '/' ? '/' : pathname.replace(/\/$/, '')}`;

    let canonical = document.querySelector('link[rel="canonical"]');
    const createdCanonical = !canonical;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    const previousHref = canonical.getAttribute('href');
    canonical.setAttribute('href', url);

    const ogUrl = document.querySelector('meta[property="og:url"]');
    const previousOgUrl = ogUrl?.getAttribute('content');
    ogUrl?.setAttribute('content', url);

    return () => {
      if (createdCanonical) canonical.remove();
      else canonical.setAttribute('href', previousHref || '');
      if (ogUrl && previousOgUrl) ogUrl.setAttribute('content', previousOgUrl);
    };
  }, [pathname]);
}
