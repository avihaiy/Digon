import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Dynamically sets the correct PWA manifest based on the current route.
 * - /display → manifest-display.json
 * - All other routes → manifest-admin.json
 */
export function useManifestSwitcher() {
  const location = useLocation();

  useEffect(() => {
    const isDisplay = location.pathname.startsWith('/display');
    const manifestHref = isDisplay ? '/manifest-display.json' : '/manifest-admin.json';

    let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;

    if (link) {
      if (link.getAttribute('href') !== manifestHref) {
        link.setAttribute('href', manifestHref);
      }
    } else {
      link = document.createElement('link');
      link.rel = 'manifest';
      link.href = manifestHref;
      document.head.appendChild(link);
    }
  }, [location.pathname]);
}
