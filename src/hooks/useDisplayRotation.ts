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
        // backward compat: old "true" → "180"
        setRotation(data.value === 'true' ? '180' : data.value);
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
          setRotation(val === 'true' ? '180' : val);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const isPortrait = rotation === '90' || rotation === '270';

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
