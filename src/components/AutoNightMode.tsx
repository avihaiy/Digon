import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import SunCalc from 'suncalc';

const LAT = 32.0853; // Default to Tel Aviv
const LON = 34.7818;

export function AutoNightMode() {
  const { theme, setTheme } = useTheme();
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  useEffect(() => {
    // Check every 5 minutes if we need to switch theme
    const checkTime = () => {
      const now = new Date();
      const times = SunCalc.getTimes(now, LAT, LON);
      
      const isNight = now < times.sunrise || now > times.sunset;
      
      // Only switch if currently 'system' or 'light' and it's night
      if (isNight && theme !== 'dark') {
        // Log to console for debugging
        console.log('[AutoNightMode] Switching to dark mode (Night time detected)');
        setTheme('dark');
      } 
      // Optional: switch back to light during day if they didn't explicitly want dark? 
      // Usually, it's safer to only force dark at night, and let them choose during the day.
      // But if we want it completely automatic:
      // else if (!isNight && theme === 'dark') {
      //   setTheme('light');
      // }
      
      setLastCheck(now);
    };

    // Initial check
    checkTime();

    const interval = setInterval(checkTime, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [theme, setTheme]);

  // Hidden component, just runs the effect
  return null;
}
