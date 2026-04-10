import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

/**
 * Dynamically sets the correct PWA manifest based on the current route
 * and the display rotation setting.
 * - /display + portrait rotation → manifest-display-portrait.json
 * - /display + landscape/normal   → manifest-display.json
 * - All other routes               → manifest-admin.json
 */
export function useManifestSwitcher() {
  const location = useLocation();

  useEffect(() => {
    const isDisplay = location.pathname.startsWith('/display');

    const setManifest = (href: string) => {
      let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
      if (link) {
        if (link.getAttribute('href') !== href) {
          link.setAttribute('href', href);
        }
      } else {
        link = document.createElement('link');
        link.rel = 'manifest';
        link.href = href;
        document.head.appendChild(link);
      }
    };

    if (!isDisplay) {
      setManifest('/manifest-admin.json');
      return;
    }

    // For display routes, check rotation setting to choose orientation
    const fetchAndSet = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'display_rotation')
        .maybeSingle();

      const rotation = data?.value || '0';
      const isPortrait = rotation === '90' || rotation === '270';
      setManifest(isPortrait ? '/manifest-display-portrait.json' : '/manifest-display.json');
    };

    fetchAndSet();
  }, [location.pathname]);
}
