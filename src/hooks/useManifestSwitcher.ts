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

    if (location.pathname.startsWith('/my/')) {
      const origin = window.location.origin;
      const manifest = {
        name: "אזור אישי - ברית שלום",
        short_name: "איזור אישי",
        start_url: origin + location.pathname,
        scope: origin + location.pathname,
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#ffffff",
        dir: "rtl",
        lang: "he",
        icons: [
          {
            src: origin + "/pwa-personal-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: origin + "/pwa-personal-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          }
        ]
      };
      
      const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      setManifest(url);
      
      return () => {
        URL.revokeObjectURL(url);
      };
    }

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
