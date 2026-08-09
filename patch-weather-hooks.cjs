const fs = require('fs');
let code = fs.readFileSync('src/hooks/useMarineWeather.ts', 'utf8');

// 1. Update MarineWeatherData interface
const interfaceRegex = /interface MarineWeatherData \{[\s\S]*?hourlyForecast\?:/;
const newInterface = `interface MarineWeatherData {
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
  hourlyForecast?:`;

code = code.replace(interfaceRegex, newInterface);

// Update daily hours interface
code = code.replace(
  "hours: { time: string; date: Date; waveHeight: number; temperature: number; windSpeed: number; windDirection: number; wavePeriod: number; surfacePressure: number; cloudCover: number; waveDirection: number }[];",
  "hours: { time: string; date: Date; waveHeight: number; temperature: number; windSpeed: number; windDirection: number; wavePeriod: number; surfacePressure: number; cloudCover: number; waveDirection: number; windGusts: number; cape: number; oceanCurrentVelocity: number; oceanCurrentDirection: number }[];"
);

// Add missing max variables to daily forecast
code = code.replace(
  "windSpeedMax: number;",
  "windSpeedMax: number;\n    windGustsMax: number;\n    capeMax: number;"
);

// 2. Update initial state
const initialStateRegex = /const \[data, setData\] = useState<MarineWeatherData>\(\{[\s\S]*?waveHeight: null,[\s\S]*?windSpeed: null,/;
const newInitialState = `const [data, setData] = useState<MarineWeatherData>({
    waveHeight: null,
    windSpeed: null,
    windDirection: null,
    windGusts: null,
    cape: null,
    oceanCurrentVelocity: null,
    oceanCurrentDirection: null,`;
code = code.replace(initialStateRegex, newInitialState);

// 3. Update Fetch URLs
code = code.replace(
  "current=temperature_2m,wind_speed_10m,wind_direction_10m,surface_pressure,cloud_cover&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,surface_pressure,cloud_cover",
  "current=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,cloud_cover,cape&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,cloud_cover,cape"
);

code = code.replace(
  "current=wave_height,wave_direction,wave_period&hourly=wave_height,wave_direction,wave_period",
  "current=wave_height,wave_direction,wave_period,ocean_current_velocity,ocean_current_direction&hourly=wave_height,wave_direction,wave_period,ocean_current_velocity,ocean_current_direction"
);

// 4. Extract data in loops
// We need to inject the new variables in the daily compute loop
const dailyLoopExtractRegex = /const clouds = weatherJson\.hourly\.cloud_cover \? weatherJson\.hourly\.cloud_cover\[wIdx\] \|\| 0 : 0;/;
const dailyLoopExtractNew = `const clouds = weatherJson.hourly.cloud_cover ? weatherJson.hourly.cloud_cover[wIdx] || 0 : 0;
          const gusts = weatherJson.hourly.wind_gusts_10m ? weatherJson.hourly.wind_gusts_10m[wIdx] || 0 : 0;
          const cape = weatherJson.hourly.cape ? weatherJson.hourly.cape[wIdx] || 0 : 0;
          const curVel = marineJson.hourly.ocean_current_velocity ? marineJson.hourly.ocean_current_velocity[mIdx] || 0 : 0;
          const curDir = marineJson.hourly.ocean_current_direction ? marineJson.hourly.ocean_current_direction[mIdx] || 0 : 0;`;
code = code.replace(dailyLoopExtractRegex, dailyLoopExtractNew);

const dailyHourDataRegex = /cloudCover: clouds,[\s\S]*?waveDirection: wDir[\s\S]*?\};/;
const dailyHourDataNew = `cloudCover: clouds,
            waveDirection: wDir,
            windGusts: gusts,
            cape: cape,
            oceanCurrentVelocity: curVel,
            oceanCurrentDirection: curDir
          };`;
code = code.replace(dailyHourDataRegex, dailyHourDataNew);

const dailyForecastMapInitRegex = /windSpeedMax: wind,[\s\S]*?hours: \[hourData\]/;
const dailyForecastMapInitNew = `windSpeedMax: wind,
              windGustsMax: gusts,
              capeMax: cape,
              hours: [hourData]`;
code = code.replace(dailyForecastMapInitRegex, dailyForecastMapInitNew);

const dailyForecastMapUpdateRegex = /current\.windSpeedMax = Math\.max\(current\.windSpeedMax, wind\);/;
const dailyForecastMapUpdateNew = `current.windSpeedMax = Math.max(current.windSpeedMax, wind);
            current.windGustsMax = Math.max(current.windGustsMax, gusts);
            current.capeMax = Math.max(current.capeMax, cape);`;
code = code.replace(dailyForecastMapUpdateRegex, dailyForecastMapUpdateNew);

// 5. Update setData
const setDataRegex = /windDirection: weatherJson\.current\?\.wind_direction_10m \?\? null,/;
const setDataNew = `windDirection: weatherJson.current?.wind_direction_10m ?? null,
        windGusts: weatherJson.current?.wind_gusts_10m ?? null,
        cape: weatherJson.current?.cape ?? null,
        oceanCurrentVelocity: marineJson.current?.ocean_current_velocity ?? null,
        oceanCurrentDirection: marineJson.current?.ocean_current_direction ?? null,`;
code = code.replace(setDataRegex, setDataNew);

fs.writeFileSync('src/hooks/useMarineWeather.ts', code);
