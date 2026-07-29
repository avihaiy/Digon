import { useState, useEffect, useCallback } from 'react';

// Default to Tel Aviv coordinates if geolocation fails
const DEFAULT_LAT = 32.0853;
const DEFAULT_LON = 34.7818;

interface MarineWeatherData {
  waveHeight: number | null; // in meters
  windSpeed: number | null; // in km/h
  windDirection: number | null; // in degrees
  temperature: number | null; // in celsius
  locationName: string;
  hourlyTides?: { time: string; height: number }[];
}

export function useMarineWeather() {
  const [data, setData] = useState<MarineWeatherData>({
    waveHeight: null,
    windSpeed: null,
    windDirection: null,
    temperature: null,
    locationName: 'תל אביב (ברירת מחדל)',
    hourlyTides: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchWeatherData = async (lat: number, lon: number, locationName: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch Weather (Wind & Temp)
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m`
      );
      const weatherJson = await weatherRes.json();
      
      // Fetch Marine (Waves & Tides) - We use fixed coastal coordinates for marine data
      // because Open-Meteo returns null if the exact GPS location is inland.
      const marineLat = 32.08;
      const marineLon = 34.75;
      const marineRes = await fetch(
        `https://marine-api.open-meteo.com/v1/marine?latitude=${marineLat}&longitude=${marineLon}&current=wave_height&hourly=wave_height&timezone=auto`
      );
      const marineJson = await marineRes.json();

      let hourlyTides = [];
      if (marineJson.hourly?.time && marineJson.hourly?.sea_level) {
        // Get next 24 hours
        const startIndex = marineJson.hourly.time.findIndex((t: string) => new Date(t) >= new Date());
        const endIndex = startIndex + 24;
        
        for (let i = startIndex > -1 ? startIndex : 0; i < endIndex && i < marineJson.hourly.time.length; i++) {
           hourlyTides.push({
             time: new Date(marineJson.hourly.time[i]).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
             height: marineJson.hourly.sea_level[i] || 0
           });
        }
      }

      setData({
        waveHeight: marineJson.current?.wave_height ?? null,
        windSpeed: weatherJson.current?.wind_speed_10m ?? null,
        windDirection: weatherJson.current?.wind_direction_10m ?? null,
        temperature: weatherJson.current?.temperature_2m ?? null,
        locationName,
        hourlyTides,
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch weather data:', err);
      setError('שגיאה בטעינת נתוני מזג האוויר');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = useCallback(() => {
    setLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeatherData(
            position.coords.latitude, 
            position.coords.longitude, 
            'המיקום שלך'
          );
        },
        (error) => {
          console.warn('Geolocation failed or denied, using default location', error);
          fetchWeatherData(DEFAULT_LAT, DEFAULT_LON, 'תל אביב (ברירת מחדל)');
        },
        { timeout: 5000 }
      );
    } else {
      fetchWeatherData(DEFAULT_LAT, DEFAULT_LON, 'תל אביב (ברירת מחדל)');
    }
  }, []);

  useEffect(() => {
    refreshData();
    
    // Auto refresh every 30 minutes
    const interval = setInterval(() => {
      refreshData();
    }, 30 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [refreshData]);

  return { data, loading, error, refreshData, lastUpdated };
}

// Helper to convert degrees to compass direction in Hebrew
export function getWindDirectionHebrew(degrees: number | null): string {
  if (degrees === null) return 'לא ידוע';
  const val = Math.floor((degrees / 22.5) + 0.5);
  const arr = [
    "צפונית", "צפון-מזרחית", "מזרחית", "דרום-מזרחית", 
    "דרומית", "דרום-מערבית", "מערבית", "צפון-מערבית"
  ];
  return arr[(val % 16) % 8]; // Open-Meteo uses standard degrees, mapped to 8 main points
}
