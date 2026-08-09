const fs = require('fs');
let code = fs.readFileSync('src/lib/solunar.ts', 'utf8');

// 1. Add getSunlightTimes
const getSunlightTimesFn = `
export interface SunlightTimes {
  dawn: Date; // First light
  sunrise: Date;
  sunset: Date;
  dusk: Date; // Last light
}

export function getSunlightTimes(date: Date = new Date()): SunlightTimes {
  const times = SunCalc.getTimes(date, LAT, LON);
  return {
    dawn: times.dawn,
    sunrise: times.sunrise,
    sunset: times.sunset,
    dusk: times.dusk
  };
}
`;

if (!code.includes('export function getSunlightTimes')) {
  code = code.replace("export function getSolunarData(", getSunlightTimesFn + "\nexport function getSolunarData(");
}

// 2. Update getSolunarData signature
const sigRegex = /export function getSolunarData\([\s\S]*?waveDirection: number \| null = null\n\) \{/;
const newSig = `export function getSolunarData(
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
) {`;
code = code.replace(sigRegex, newSig);

// 3. Add CAPE, Gusts and Currents to "Sea Conditions Score Adjustments"
const conditionsRegex = /\/\/ Wind vs Swell conflict \(migahetz\)[\s\S]*?\/\/ Wind \(km\/h\) & Direction/;
const newConditions = `// CAPE (Thunderstorm Risk)
  let hasStormRisk = false;
  if (cape !== null && cape > 1000) {
    hasStormRisk = true;
    seaPenalty += 100;
    explanations.push("סכנת ברקים (CAPE גבוה) - סכנת התחשמלות לחכות קרבון!");
  }

  // Currents
  if (oceanCurrentVelocity !== null && oceanCurrentVelocity > 1) { // roughly 0.5 knots
    if (fishingStyle === 'bait') {
      seaBonus += 15;
      explanations.push("זרם היקפי חזק במים - דגים טורפים עומדים מול הזרם ומחכים לאוכל.");
    } else if (fishingStyle === 'lure') {
      seaBonus += 10;
      explanations.push("זרם טוב מפעיל את פיתיונות הדמוי טוב יותר.");
    }
  }

  // Wind vs Swell conflict (migahetz)
  let isFlattenedByWind = false;
  if (windDirection !== null && waveDirection !== null && windSpeed !== null && windSpeed > 15) {
    const angleDiff = Math.abs((windDirection - waveDirection + 360) % 360);
    if (angleDiff > 120 && angleDiff < 240) {
      isFlattenedByWind = true;
      explanations.push("רוח נגדית מגהצת את הגלים (הים נראה נמוך יותר ממה שהוא)");
    }
  }

  // Wind (km/h) & Direction`;
code = code.replace(conditionsRegex, newConditions);

// Update wind logic for Gusts
const windRegex = /if \(windSpeed > 30\) \{[\s\S]*?explanations\.push\("רוח חזקה מאוד - מקשה על הדייג ופסול לקיאק!"\);\n    \} else if \(windSpeed > 20\) \{/;
const newWind = `if (windSpeed > 30 || (windGusts !== null && windGusts > 45)) {
      seaPenalty += (fishingStyle === 'kayak' || fishingStyle === 'ultralight') ? 60 : 30;
      explanations.push(windGusts && windGusts > 45 ? "משבי רוח עזים (מעל 45 קמ\\"ש) מסוכנים!" : "רוח חזקה מאוד - מקשה על הדייג ופסול לקיאק!");
    } else if (windSpeed > 20 || (windGusts !== null && windGusts > 35)) {`;
code = code.replace(windRegex, newWind);

fs.writeFileSync('src/lib/solunar.ts', code);
