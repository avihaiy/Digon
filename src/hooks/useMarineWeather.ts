import { useQuery } from '@tanstack/react-query';

// Default to Tel Aviv coordinates if geolocation fails
const DEFAULT_LAT = 32.0853;
const DEFAULT_LON = 34.7818;

export interface MarineWeatherData {
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
  fishingScore: number;
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
    sunrise: string;
    sunset: string;
    uvIndexMax: number;
    rainProbMax: number;
    biteTimes: { start: string, end: string, rating: 'good' | 'excellent' }[];
    hours: { time: string; date: Date; waveHeight: number; temperature: number; windSpeed: number; windDirection: number; wavePeriod: number; surfacePressure: number; cloudCover: number; waveDirection: number; windGusts: number; cape: number; oceanCurrentVelocity: number; oceanCurrentDirection: number }[];
  }[];
}

const fetchWeatherData = async (lat: number, lon: number, locationName: string): Promise<MarineWeatherData> => {
  let finalLocationName = locationName;
  
  if (locationName === 'המיקום שלך') {
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=he`, {
        headers: { 'User-Agent': 'Digon Fishing App' }
      });
      const geoJson = await geoRes.json();
      const city = geoJson.address?.city || geoJson.address?.town || geoJson.address?.village || geoJson.address?.suburb;
      if (city) {
        finalLocationName = `המיקום שלך - ${city.replace('־', ' ').split('–')[0]}`;
      }
    } catch (e) {
      console.warn('Geocoding failed', e);
    }
  }

  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,cloud_cover,cape&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,cloud_cover,cape&daily=sunrise,sunset,uv_index_max,precipitation_probability_max,temperature_2m_max,temperature_2m_min&past_hours=12&timezone=auto&models=best_match`
  );
  const weatherJson = await weatherRes.json();
  
  const marineRes = await fetch(
    `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wave_height,wave_direction,wave_period,ocean_current_velocity,ocean_current_direction&hourly=wave_height,wave_direction,wave_period,ocean_current_velocity,ocean_current_direction&past_hours=48&timezone=auto&models=best_match`
  );
  const marineJson = await marineRes.json();

  let isTurbid = false;
  if (marineJson.hourly?.wave_height) {
    const past48hWaves = marineJson.hourly.wave_height.slice(0, 48);
    const maxPastWave = Math.max(...past48hWaves.filter((v: number | null) => v !== null));
    if (maxPastWave > 1.2) {
      isTurbid = true;
    }
  }

  let pressureTrend = 0;
  if (weatherJson.hourly?.surface_pressure) {
    const currentPressure = weatherJson.current.surface_pressure;
    const pastPressure = weatherJson.hourly.surface_pressure[0];
    if (currentPressure && pastPressure) {
      pressureTrend = Number((currentPressure - pastPressure).toFixed(1));
    }
  }

  const currentW = weatherJson.current || {};
  const currentM = marineJson.current || {};
  
  let score = 100;
  if (currentM.wave_height > 1.5) score -= 30;
  else if (currentM.wave_height > 0.8) score -= 10;
  if (currentW.wind_speed_10m > 25) score -= 25;
  else if (currentW.wind_speed_10m > 15) score -= 10;
  if (pressureTrend < -2) score -= 15;
  else if (pressureTrend > 2) score += 5;
  if (isTurbid) score -= 10;
  score = Math.max(0, Math.min(100, score));

  const dailyForecast: any[] = [];
  const hourlyForecast: any[] = [];

  const days = weatherJson.daily?.time || [];
  for (let i = 0; i < days.length; i++) {
    const date = new Date(days[i]);
    const dayName = new Intl.DateTimeFormat('he-IL', { weekday: 'long' }).format(date);
    
    const dayHours = [];
    if (weatherJson.hourly?.time) {
      for (let j = 0; j < weatherJson.hourly.time.length; j++) {
        const hourTime = new Date(weatherJson.hourly.time[j]);
        if (hourTime.getDate() === date.getDate() && hourTime.getMonth() === date.getMonth()) {
          const w = marineJson.hourly?.wave_height?.[j] || 0;
          const wh = {
            time: hourTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
            date: hourTime,
            waveHeight: w,
            temperature: weatherJson.hourly.temperature_2m[j],
            windSpeed: weatherJson.hourly.wind_speed_10m[j],
            windDirection: weatherJson.hourly.wind_direction_10m[j],
            wavePeriod: marineJson.hourly?.wave_period?.[j] || 0,
            surfacePressure: weatherJson.hourly.surface_pressure[j],
            cloudCover: weatherJson.hourly.cloud_cover[j],
            waveDirection: marineJson.hourly?.wave_direction?.[j] || 0,
            windGusts: weatherJson.hourly.wind_gusts_10m[j],
            cape: weatherJson.hourly.cape[j],
            oceanCurrentVelocity: marineJson.hourly?.ocean_current_velocity?.[j] || 0,
            oceanCurrentDirection: marineJson.hourly?.ocean_current_direction?.[j] || 0,
          };
          dayHours.push(wh);
          
          const now = new Date();
          if (hourTime > now && hourlyForecast.length < 24) {
            hourlyForecast.push({
              time: wh.time,
              waveHeight: wh.waveHeight,
              temperature: wh.temperature,
              windSpeed: wh.windSpeed
            });
          }
        }
      }
    }

    const biteTimes = [];
    const sunrise = new Date(weatherJson.daily?.sunrise?.[i]);
    const sunset = new Date(weatherJson.daily?.sunset?.[i]);
    
    if (!isNaN(sunrise.getTime())) {
      const start = new Date(sunrise.getTime() - 60 * 60 * 1000).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
      const end = new Date(sunrise.getTime() + 60 * 60 * 1000).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
      biteTimes.push({ start, end, rating: 'excellent' as const });
    }
    
    if (!isNaN(sunset.getTime())) {
      const start = new Date(sunset.getTime() - 60 * 60 * 1000).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
      const end = new Date(sunset.getTime() + 60 * 60 * 1000).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
      biteTimes.push({ start, end, rating: 'good' as const });
    }

    let waveHeightMax = 0;
    if (marineJson.hourly?.wave_height) {
      const startIndex = i * 24;
      const endIndex = startIndex + 24;
      const dayWaves = marineJson.hourly.wave_height.slice(startIndex, endIndex);
      waveHeightMax = Math.max(...dayWaves.filter((v: number | null) => v !== null));
    }

    dailyForecast.push({
      date,
      dayName,
      waveHeightMax,
      tempMax: weatherJson.daily?.temperature_2m_max?.[i] || 0,
      tempMin: weatherJson.daily?.temperature_2m_min?.[i] || 0,
      sunrise: weatherJson.daily?.sunrise?.[i] || '',
      sunset: weatherJson.daily?.sunset?.[i] || '',
      uvIndexMax: weatherJson.daily?.uv_index_max?.[i] || 0,
      rainProbMax: weatherJson.daily?.precipitation_probability_max?.[i] || 0,
      windSpeedMax: Math.max(...dayHours.map(h => h.windSpeed)),
      windGustsMax: Math.max(...dayHours.map(h => h.windGusts)),
      capeMax: Math.max(...dayHours.map(h => h.cape)),
      biteTimes,
      hours: dayHours
    });
  }

  return {
    waveHeight: currentM.wave_height,
    windSpeed: currentW.wind_speed_10m,
    windDirection: currentW.wind_direction_10m,
    windGusts: currentW.wind_gusts_10m,
    cape: currentW.cape,
    oceanCurrentVelocity: currentM.ocean_current_velocity,
    oceanCurrentDirection: currentM.ocean_current_direction,
    temperature: currentW.temperature_2m,
    surfacePressure: currentW.surface_pressure,
    wavePeriod: currentM.wave_period,
    cloudCover: currentW.cloud_cover,
    pressureTrend,
    isTurbid,
    waveDirection: currentM.wave_direction,
    locationName: finalLocationName,
    fishingScore: score,
    hourlyForecast,
    dailyForecast
  };
};

const getPosition = (): Promise<{ lat: number; lon: number; locationName: string }> => {
  return new Promise((resolve) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude, locationName: 'המיקום שלך' }),
        () => resolve({ lat: DEFAULT_LAT, lon: DEFAULT_LON, locationName: 'תל אביב (ברירת מחדל)' }),
        { timeout: 5000, maximumAge: 1000 * 60 * 30 }
      );
    } else {
      resolve({ lat: DEFAULT_LAT, lon: DEFAULT_LON, locationName: 'תל אביב (ברירת מחדל)' });
    }
  });
};

export function useMarineWeather() {
  const query = useQuery({
    queryKey: ['marineWeather'],
    queryFn: async () => {
      const pos = await getPosition();
      return fetchWeatherData(pos.lat, pos.lon, pos.locationName);
    },
  });

  return {
    data: query.data || {
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
      locationName: 'טוען נתוני ים...',
      fishingScore: 100,
      hourlyForecast: [],
      dailyForecast: []
    },
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refreshData: query.refetch,
    lastUpdated: new Date()
  };
}

// Helper to convert degrees to compass direction in Hebrew
export function getWindDirectionHebrew(degrees: number | null): string {
  if (degrees === null) return 'לא ידוע';
  const val = Math.floor((degrees / 22.5) + 0.5);
  const arr = [
    "צפונית", "צפון-מזרחית", "מזרחית", "דרום-מזרחית", 
    "דרומית", "דרום-מערבית", "מערבית", "צפון-מערבית"
  ];
  return arr[(val % 16) % 8];
}
