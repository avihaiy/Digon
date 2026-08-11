import { useState, useEffect, useCallback } from 'react';

// Default to Tel Aviv coordinates if geolocation fails
const DEFAULT_LAT = 32.0853;
const DEFAULT_LON = 34.7818;

interface MarineWeatherData {
  waveHeight: number | null; // in meters
  windSpeed: number | null; // in km/h
  windDirection: number | null; // in degrees
  windGusts: number | null; // in km/h
  cape: number | null; // Convective Available Potential Energy (Thunderstorm risk)
  oceanCurrentVelocity: number | null; // in km/h
  oceanCurrentDirection: number | null; // in degrees
  temperature: number | null; // in celsius
  surfacePressure: number | null; // in hPa
  wavePeriod: number | null; // in seconds
  cloudCover: number | null; // in percentage
  pressureTrend: number | null; // delta hPa over last 12h
  isTurbid: boolean; // if max wave in past 48h > 1.5m
  waveDirection: number | null; // in degrees
  locationName: string;
  hourlyForecast?: { time: string; waveHeight: number; temperature: number; windSpeed: number }[];
  dailyForecast?: { 
    date: Date; 
    dayName: string;
    waveHeightMax: number; 
    tempMax: number; 
    tempMin: number;
    windSpeedMax: number;
    windGustsMax: number;
    capeMax: number; 
    hours: { time: string; date: Date; waveHeight: number; temperature: number; windSpeed: number; windDirection: number; wavePeriod: number; surfacePressure: number; cloudCover: number; waveDirection: number; windGusts: number; cape: number; oceanCurrentVelocity: number; oceanCurrentDirection: number }[];
  }[];
}

export function useMarineWeather() {
  const [data, setData] = useState<MarineWeatherData>({
    waveHeight: null,
    windSpeed: null,
    windDirection: null,
    windGusts: null,
    cape: null,
    oceanCurrentVelocity: null,
    oceanCurrentDirection: null,
    temperature: null,
    surfacePressure: null,
    wavePeriod: null,
    cloudCover: null,
    pressureTrend: null,
    isTurbid: false,
    waveDirection: null,
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

      // Fetch Weather (Wind, Temp, Pressure, Clouds - Current and Hourly with past 12h)
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,cloud_cover,cape&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,cloud_cover,cape&past_hours=12&timezone=auto&models=best_match`
      );
      const weatherJson = await weatherRes.json();
      
      // Fetch Marine (Waves, Direction & Period with past 48h)
      const marineLat = 32.08;
      const marineLon = 34.75;
      const marineRes = await fetch(
        `https://marine-api.open-meteo.com/v1/marine?latitude=${marineLat}&longitude=${marineLon}&current=wave_height,wave_direction,wave_period,ocean_current_velocity,ocean_current_direction&hourly=wave_height,wave_direction,wave_period,ocean_current_velocity,ocean_current_direction&past_hours=48&timezone=auto&models=best_match`
      );
      const marineJson = await marineRes.json();

      let hourlyForecast = [];
      let dailyForecastMap = new Map();

      let isTurbid = false;
      let pressureTrend = null;
      let waveDirection = marineJson.current?.wave_direction ?? null;

      if (marineJson.hourly?.time && weatherJson.hourly?.time) {
        const marineStartIndex = marineJson.hourly.time.findIndex((t: string) => new Date(t) >= new Date(new Date().setHours(0,0,0,0)));
        const marineCurrentIndex = marineJson.hourly.time.findIndex((t: string) => new Date(t) >= new Date());
        
        const weatherStartIndex = weatherJson.hourly.time.findIndex((t: string) => new Date(t) >= new Date(new Date().setHours(0,0,0,0)));
        const weatherCurrentIndex = weatherJson.hourly.time.findIndex((t: string) => new Date(t) >= new Date());

        // Calculate Turbidity
        if (marineCurrentIndex > -1) {
          const pastWaves = marineJson.hourly.wave_height.slice(0, marineCurrentIndex);
          const maxPastWave = Math.max(...pastWaves.filter((w: number) => w !== null));
          if (maxPastWave >= 1.5) {
            isTurbid = true;
          }
        }

        // Calculate Pressure Trend
        if (weatherCurrentIndex >= 12) {
          const currentPressure = weatherJson.hourly.surface_pressure[weatherCurrentIndex];
          const pastPressure = weatherJson.hourly.surface_pressure[weatherCurrentIndex - 12];
          if (currentPressure !== null && pastPressure !== null) {
            pressureTrend = currentPressure - pastPressure;
          }
        }

        // Align arrays for forecast loop (using start index of each)
        const endIndex = marineCurrentIndex > -1 ? marineCurrentIndex + 24 : 24;
        
        for (let i = 0; i < 24; i++) {
           const mIdx = (marineCurrentIndex > -1 ? marineCurrentIndex : 0) + i;
           const wIdx = (weatherCurrentIndex > -1 ? weatherCurrentIndex : 0) + i;
           
           if (mIdx < marineJson.hourly.time.length && wIdx < weatherJson.hourly.time.length) {
             hourlyForecast.push({
               time: new Date(marineJson.hourly.time[mIdx]).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
               waveHeight: marineJson.hourly.wave_height[mIdx] || 0,
               temperature: weatherJson.hourly.temperature_2m[wIdx] || 0,
               windSpeed: weatherJson.hourly.wind_speed_10m[wIdx] || 0
             });
           }
        }

        // Compute Daily Forecast for 7 days
        for (let i = 0; i < 7 * 24; i++) {
          const mIdx = (marineStartIndex > -1 ? marineStartIndex : 0) + i;
          const wIdx = (weatherStartIndex > -1 ? weatherStartIndex : 0) + i;

          if (mIdx >= marineJson.hourly.time.length || wIdx >= weatherJson.hourly.time.length) break;

          const dateStr = marineJson.hourly.time[mIdx];
          const dateObj = new Date(dateStr);
          const dayKey = dateObj.toLocaleDateString('he-IL');
          
          const wave = marineJson.hourly.wave_height[mIdx] || 0;
          const period = marineJson.hourly.wave_period ? marineJson.hourly.wave_period[mIdx] || 0 : 0;
          const wDir = marineJson.hourly.wave_direction ? marineJson.hourly.wave_direction[mIdx] || 0 : 0;
          
          const temp = weatherJson.hourly.temperature_2m[wIdx] || 0;
          const wind = weatherJson.hourly.wind_speed_10m[wIdx] || 0;
          const dir = weatherJson.hourly.wind_direction_10m[wIdx] || 0;
          const pressure = weatherJson.hourly.surface_pressure ? weatherJson.hourly.surface_pressure[wIdx] || 0 : 0;
          const clouds = weatherJson.hourly.cloud_cover ? weatherJson.hourly.cloud_cover[wIdx] || 0 : 0;
          const gusts = weatherJson.hourly.wind_gusts_10m ? weatherJson.hourly.wind_gusts_10m[wIdx] || 0 : 0;
          const cape = weatherJson.hourly.cape ? weatherJson.hourly.cape[wIdx] || 0 : 0;
          const curVel = marineJson.hourly.ocean_current_velocity ? marineJson.hourly.ocean_current_velocity[mIdx] || 0 : 0;
          const curDir = marineJson.hourly.ocean_current_direction ? marineJson.hourly.ocean_current_direction[mIdx] || 0 : 0;
          
          const hourData = {
            time: dateObj.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
            date: dateObj,
            waveHeight: wave,
            temperature: temp,
            windSpeed: wind,
            windDirection: dir,
            wavePeriod: period,
            surfacePressure: pressure,
            cloudCover: clouds,
            waveDirection: wDir,
            windGusts: gusts,
            cape: cape,
            oceanCurrentVelocity: curVel,
            oceanCurrentDirection: curDir
          };

          if (!dailyForecastMap.has(dayKey)) {
            dailyForecastMap.set(dayKey, {
              date: dateObj,
              dayName: dateObj.toLocaleDateString('he-IL', { weekday: 'long' }),
              waveHeightMax: wave,
              tempMax: temp,
              tempMin: temp,
              windSpeedMax: wind,
              windGustsMax: gusts,
              capeMax: cape,
              hours: [hourData]
            });
          } else {
            const current = dailyForecastMap.get(dayKey);
            current.waveHeightMax = Math.max(current.waveHeightMax, wave);
            current.tempMax = Math.max(current.tempMax, temp);
            current.tempMin = Math.min(current.tempMin, temp);
            current.windSpeedMax = Math.max(current.windSpeedMax, wind);
            current.windGustsMax = Math.max(current.windGustsMax, gusts);
            current.capeMax = Math.max(current.capeMax, cape);
            current.hours.push(hourData);
          }
        }
      }

      const dailyForecast = Array.from(dailyForecastMap.values()).slice(0, 7);

      setData({
        waveHeight: marineJson.current?.wave_height ?? null,
        windSpeed: weatherJson.current?.wind_speed_10m ?? null,
        windDirection: weatherJson.current?.wind_direction_10m ?? null,
        windGusts: weatherJson.current?.wind_gusts_10m ?? null,
        cape: weatherJson.current?.cape ?? null,
        oceanCurrentVelocity: marineJson.current?.ocean_current_velocity ?? null,
        oceanCurrentDirection: marineJson.current?.ocean_current_direction ?? null,
        temperature: weatherJson.current?.temperature_2m ?? null,
        surfacePressure: weatherJson.current?.surface_pressure ?? null,
        wavePeriod: marineJson.current?.wave_period ?? null,
        cloudCover: weatherJson.current?.cloud_cover ?? null,
        pressureTrend,
        isTurbid,
        waveDirection,
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
