import { useState, useEffect, CSSProperties } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetches the display rotation setting from app_settings and returns
 * CSS styles + orientation info for the display container.
 */
export function useDisplayRotation() {
  const [rotation, setRotation] = useState('0');

  useEffect(() => {
    const fetchRotation = async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'display_rotation')
        .maybeSingle();
      if (data?.value) {
        const val = data.value === 'true' ? '180' : data.value;
        setRotation(val);
        localStorage.setItem('display_rotation', val);
      }
    };
    fetchRotation();

    // Listen for realtime changes
    const channel = supabase
      .channel('display-rotation-setting')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'app_settings',
        filter: 'key=eq.display_rotation',
      }, (payload: any) => {
        const val = payload.new?.value;
        if (val !== undefined) {
          const resolved = val === 'true' ? '180' : val;
          setRotation(resolved);
          localStorage.setItem('display_rotation', resolved);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const isPortrait = rotation === '90' || rotation === '270';

  // Try to lock screen orientation via Screen Orientation API (works in installed PWA)
  useEffect(() => {
    const lockOrientation = async () => {
      try {
        const screen = window.screen as any;
        if (screen?.orientation?.lock) {
          if (isPortrait) {
            await screen.orientation.lock('portrait');
          } else {
            await screen.orientation.lock('landscape');
          }
        }
      } catch (e) {
        // Screen Orientation API not supported or not in fullscreen/PWA – fall back to CSS rotation
        console.log('Screen orientation lock not available, using CSS rotation fallback');
      }
    };
    lockOrientation();

    return () => {
      try {
        const screen = window.screen as any;
        if (screen?.orientation?.unlock) {
          screen.orientation.unlock();
        }
      } catch (e) { /* ignore */ }
    };
  }, [isPortrait]);

  const rotationStyle: CSSProperties = rotation !== '0'
    ? {
        transform: `rotate(${rotation}deg)`,
        // When rotating 90/270, swap width/height to fill the screen
        ...(isPortrait ? {
          width: '100vh',
          height: '100vw',
          transformOrigin: 'center center',
          position: 'fixed' as const,
          top: '50%',
          left: '50%',
          marginTop: 'calc(-50vw)',
          marginLeft: 'calc(-50vh)',
        } : {}),
      }
    : {};

  return { rotation, rotationStyle, isPortrait };
}
