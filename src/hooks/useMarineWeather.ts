import { useState, useEffect, useCallback } from 'react';

// Default to Tel Aviv coordinates if geolocation fails
const DEFAULT_LAT = 32.0853;
const DEFAULT_LON = 34.7818;

interface MarineWeatherData {
  waveHeight: number | null; // in meters
  windSpeed: number | null; // in km/h
  windDirection: number | null; // in degrees
  temperature: number | null; // in celsius
  surfacePressure: number | null; // in hPa
  wavePeriod: number | null; // in seconds
  cloudCover: number | null; // in percentage
  locationName: string;
  hourlyForecast?: { time: string; waveHeight: number; temperature: number; windSpeed: number }[];
  dailyForecast?: { 
    date: Date; 
    dayName: string;
    waveHeightMax: number; 
    tempMax: number; 
    tempMin: number;
    windSpeedMax: number; 
    hours: { time: string; date: Date; waveHeight: number; temperature: number; windSpeed: number; windDirection: number; wavePeriod: number; surfacePressure: number; cloudCover: number }[];
  }[];
}

export function useMarineWeather() {
  const [data, setData] = useState<MarineWeatherData>({
    waveHeight: null,
    windSpeed: null,
    windDirection: null,
    temperature: null,
    surfacePressure: null,
    wavePeriod: null,
    cloudCover: null,
    locationName: 'תל אביב (ברירת מחדל)',
    hourlyForecast: [],
    dailyForecast: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchWeatherData = async (lat: number, lon: number, locationName: string) => {
    try {
      setLoading(true);
      setError(null);

      // Fetch Weather (Wind, Temp, Pressure, Clouds - Current and Hourly)
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m,surface_pressure,cloud_cover&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,surface_pressure,cloud_cover&timezone=auto&models=best_match`
      );
      const weatherJson = await weatherRes.json();
      
      // Fetch Marine (Waves & Period)
      const marineLat = 32.08;
      const marineLon = 34.75;
      const marineRes = await fetch(
        `https://marine-api.open-meteo.com/v1/marine?latitude=${marineLat}&longitude=${marineLon}&current=wave_height,wave_period&hourly=wave_height,wave_period&timezone=auto&models=best_match`
      );
      const marineJson = await marineRes.json();

      let hourlyForecast = [];
      let dailyForecastMap = new Map();

      if (marineJson.hourly?.time && weatherJson.hourly?.time) {
        // Get next 24 hours for hourly forecast
        const startIndex = marineJson.hourly.time.findIndex((t: string) => new Date(t) >= new Date(new Date().setHours(0,0,0,0)));
        const currentIndex = marineJson.hourly.time.findIndex((t: string) => new Date(t) >= new Date());
        const endIndex = currentIndex > -1 ? currentIndex + 24 : 24;
        
        for (let i = currentIndex > -1 ? currentIndex : 0; i < endIndex && i < marineJson.hourly.time.length; i++) {
           hourlyForecast.push({
             time: new Date(marineJson.hourly.time[i]).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
             waveHeight: marineJson.hourly.wave_height[i] || 0,
             temperature: weatherJson.hourly.temperature_2m[i] || 0,
             windSpeed: weatherJson.hourly.wind_speed_10m[i] || 0
           });
        }

        // Compute Daily Forecast for 7 days
        const daysToProcess = Math.min(marineJson.hourly.time.length, startIndex + 7 * 24);
        for (let i = startIndex > -1 ? startIndex : 0; i < daysToProcess; i++) {
          const dateStr = marineJson.hourly.time[i];
          const dateObj = new Date(dateStr);
          const dayKey = dateObj.toLocaleDateString('he-IL');
          
          const wave = marineJson.hourly.wave_height[i] || 0;
          const period = marineJson.hourly.wave_period ? marineJson.hourly.wave_period[i] || 0 : 0;
          const temp = weatherJson.hourly.temperature_2m[i] || 0;
          const wind = weatherJson.hourly.wind_speed_10m[i] || 0;
          const dir = weatherJson.hourly.wind_direction_10m[i] || 0;
          const pressure = weatherJson.hourly.surface_pressure ? weatherJson.hourly.surface_pressure[i] || 0 : 0;
          const clouds = weatherJson.hourly.cloud_cover ? weatherJson.hourly.cloud_cover[i] || 0 : 0;
          
          const hourData = {
            time: dateObj.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
            date: dateObj,
            waveHeight: wave,
            temperature: temp,
            windSpeed: wind,
            windDirection: dir,
            wavePeriod: period,
            surfacePressure: pressure,
            cloudCover: clouds
          };

          if (!dailyForecastMap.has(dayKey)) {
            dailyForecastMap.set(dayKey, {
              date: dateObj,
              dayName: dateObj.toLocaleDateString('he-IL', { weekday: 'long' }),
              waveHeightMax: wave,
              tempMax: temp,
              tempMin: temp,
              windSpeedMax: wind,
              hours: [hourData]
            });
          } else {
            const current = dailyForecastMap.get(dayKey);
            current.waveHeightMax = Math.max(current.waveHeightMax, wave);
            current.tempMax = Math.max(current.tempMax, temp);
            current.tempMin = Math.min(current.tempMin, temp);
            current.windSpeedMax = Math.max(current.windSpeedMax, wind);
            current.hours.push(hourData);
          }
        }
      }

      const dailyForecast = Array.from(dailyForecastMap.values()).slice(0, 7);

      setData({
        waveHeight: marineJson.current?.wave_height ?? null,
        windSpeed: weatherJson.current?.wind_speed_10m ?? null,
        windDirection: weatherJson.current?.wind_direction_10m ?? null,
        temperature: weatherJson.current?.temperature_2m ?? null,
        surfacePressure: weatherJson.current?.surface_pressure ?? null,
        wavePeriod: marineJson.current?.wave_period ?? null,
        cloudCover: weatherJson.current?.cloud_cover ?? null,
        locationName,
        hourlyForecast,
        dailyForecast,
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
