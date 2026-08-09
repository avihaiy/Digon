const fs = require('fs');
let code = fs.readFileSync('src/lib/solunar.ts', 'utf8');

const correctSignature = `export function getSolunarData(
  date: Date = new Date(),
  fishingStyle: FishingStyle = 'lure',
  waveHeight: number | null = null,
  windSpeed: number | null = null,
  waterTemp: number | null = null,
  wavePeriod: number | null = null,
  surfacePressure: number | null = null,
  windDirection: number | null = null,
  cloudCover: number | null = null,
  pressureTrend: number | null = null,
  isTurbid: boolean = false,
  waveDirection: number | null = null,
  windGusts: number | null = null,
  cape: number | null = null,
  oceanCurrentVelocity: number | null = null
) {
  const moonIllumination = SunCalc.getMoonIllumination(date);
  const phase = moonIllumination.phase; // 0 to 1
  
  let phaseName = "";
  if (phase < 0.05`;

// The buggy regex replacement left just `if (phase < 0.05` instead of the signature and phase variables.
code = code.replace(/export function getSolunarData\([\s\S]*?if \(phase < 0\.05/, correctSignature);

fs.writeFileSync('src/lib/solunar.ts', code);
