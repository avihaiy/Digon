const fs = require('fs');

let code = fs.readFileSync('src/hooks/useMarineWeather.ts', 'utf8');

if (!code.includes('useWaterType')) {
  code = code.replace(
    "import { useQuery } from '@tanstack/react-query';",
    "import { useQuery } from '@tanstack/react-query';\nimport { useWaterType } from './useWaterType';"
  );
}

if (!code.includes('riverDischarge?: number')) {
  code = code.replace(
    'isTurbid: boolean; // if max wave in past 48h > 1.5m',
    'isTurbid: boolean; // if max wave in past 48h > 1.5m\n  riverDischarge?: number | null; // m3/s'
  );
}

if (!code.includes('waterType: string = \'saltwater\'')) {
  code = code.replace(
    'const fetchWeatherData = async (lat: number, lon: number, locationName: string): Promise<MarineWeatherData> => {',
    'const fetchWeatherData = async (lat: number, lon: number, locationName: string, waterType: string = \'saltwater\'): Promise<MarineWeatherData> => {'
  );
}

const apiOld = `  const weatherRes = await fetch(
    \`https://api.open-meteo.com/v1/forecast?latitude=\${lat}&longitude=\${lon}&current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,cloud_cover,cape&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,cloud_cover,cape&daily=sunrise,sunset,uv_index_max,precipitation_probability_max,temperature_2m_max,temperature_2m_min&past_hours=12&timezone=auto&models=best_match\`
  );
  const weatherJson = await weatherRes.json();
  
  const marineRes = await fetch(
    \`https://marine-api.open-meteo.com/v1/marine?latitude=\${lat}&longitude=\${lon}&current=wave_height,wave_direction,wave_period,ocean_current_velocity,ocean_current_direction&hourly=wave_height,wave_direction,wave_period,ocean_current_velocity,ocean_current_direction&past_hours=48&timezone=auto&models=best_match\`
  );
  const marineJson = await marineRes.json();

  let isTurbid = false;
  if (marineJson.hourly?.wave_height) {
    const past48hWaves = marineJson.hourly.wave_height.slice(0, 48);
    const maxPastWave = Math.max(...past48hWaves.filter((v: number | null) => v !== null));
    if (maxPastWave > 1.2) {
      isTurbid = true;
    }
  }`;

const apiNew = `  const weatherRes = await fetch(
    \`https://api.open-meteo.com/v1/forecast?latitude=\${lat}&longitude=\${lon}&current=\${waterType === 'freshwater' ? 'soil_temperature_6cm,' : ''}temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,cloud_cover,cape&hourly=\${waterType === 'freshwater' ? 'soil_temperature_6cm,' : ''}temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,cloud_cover,cape\${waterType === 'freshwater' ? ',precipitation' : ''}&daily=sunrise,sunset,uv_index_max,precipitation_probability_max,temperature_2m_max,temperature_2m_min&past_hours=48&timezone=auto&models=best_match\`
  );
  const weatherJson = await weatherRes.json();
  
  let marineJson: any = { current: {}, hourly: {} };
  let floodJson: any = { daily: {} };

  if (waterType === 'saltwater') {
    const marineRes = await fetch(
      \`https://marine-api.open-meteo.com/v1/marine?latitude=\${lat}&longitude=\${lon}&current=wave_height,wave_direction,wave_period,ocean_current_velocity,ocean_current_direction&hourly=wave_height,wave_direction,wave_period,ocean_current_velocity,ocean_current_direction&past_hours=48&timezone=auto&models=best_match\`
    );
    marineJson = await marineRes.json();
  } else {
    try {
      const floodRes = await fetch(
        \`https://flood-api.open-meteo.com/v1/flood?latitude=\${lat}&longitude=\${lon}&daily=river_discharge&timezone=auto\`
      );
      floodJson = await floodRes.json();
    } catch (e) {
      console.warn('Flood API failed', e);
    }
  }

  let isTurbid = false;
  if (waterType === 'saltwater') {
    if (marineJson.hourly?.wave_height) {
      const past48hWaves = marineJson.hourly.wave_height.slice(0, 48);
      const maxPastWave = Math.max(...past48hWaves.filter((v: number | null) => v !== null));
      if (maxPastWave > 1.2) {
        isTurbid = true;
      }
    }
  } else {
    if (weatherJson.hourly?.precipitation) {
      const past48hRain = weatherJson.hourly.precipitation.slice(0, 48);
      const totalRain = past48hRain.reduce((a, b) => a + (b || 0), 0);
      if (totalRain > 5) {
        isTurbid = true;
      }
    }
  }`;

if (code.includes(apiOld)) {
  code = code.replace(apiOld, apiNew);
} else {
  console.log('could not find apiOld!');
}

const returnOld = `    waveHeight: currentM.wave_height,
    windSpeed: currentW.wind_speed_10m,
    windDirection: currentW.wind_direction_10m,
    windGusts: currentW.wind_gusts_10m,
    cape: currentW.cape,
    oceanCurrentVelocity: currentM.ocean_current_velocity,
    oceanCurrentDirection: currentM.ocean_current_direction,
    temperature: currentW.temperature_2m,`;

const returnNew = `    waveHeight: currentM.wave_height ?? null,
    riverDischarge: floodJson.daily?.river_discharge?.[0] ?? null,
    windSpeed: currentW.wind_speed_10m,
    windDirection: currentW.wind_direction_10m,
    windGusts: currentW.wind_gusts_10m,
    cape: currentW.cape,
    oceanCurrentVelocity: currentM.ocean_current_velocity ?? null,
    oceanCurrentDirection: currentM.ocean_current_direction ?? null,
    temperature: waterType === 'freshwater' && currentW.soil_temperature_6cm !== undefined ? currentW.soil_temperature_6cm : currentW.temperature_2m,`;

if (code.includes(returnOld)) {
  code = code.replace(returnOld, returnNew);
} else {
  console.log('could not find returnOld!');
}

const hookOld = `export function useMarineWeather() {
  const query = useQuery({
    queryKey: ['marineWeather'],
    queryFn: async () => {
      const pos = await getPosition();
      return fetchWeatherData(pos.lat, pos.lon, pos.locationName);
    },
  });`;

const hookNew = `export function useMarineWeather() {
  const { waterType } = useWaterType();
  const query = useQuery({
    queryKey: ['marineWeather', waterType],
    queryFn: async () => {
      const pos = await getPosition();
      return fetchWeatherData(pos.lat, pos.lon, pos.locationName, waterType);
    },
  });`;

if (code.includes(hookOld)) {
  code = code.replace(hookOld, hookNew);
} else {
  console.log('could not find hookOld!');
}

const returnDataOld = `      data: query.data || {
        waveHeight: null,
        windSpeed: null,
        windDirection: null,
        windGusts: null,`;

const returnDataNew = `      data: query.data || {
        waveHeight: null,
        riverDischarge: null,
        windSpeed: null,
        windDirection: null,
        windGusts: null,`;

if (code.includes(returnDataOld)) {
  code = code.replace(returnDataOld, returnDataNew);
} else {
  console.log('could not find returnDataOld!');
}

fs.writeFileSync('src/hooks/useMarineWeather.ts', code);
console.log('Done.');
