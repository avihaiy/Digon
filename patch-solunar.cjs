const fs = require('fs');
let code = fs.readFileSync('src/lib/solunar.ts', 'utf8');

// Replace function signature
code = code.replace(
  /export function getSolunarData\([\s\S]*?\)\s*\{/,
`export type FishingStyle = 'lure' | 'bait' | 'kayak' | 'ultralight';

export function getSolunarData(
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
  waveDirection: number | null = null
) {`
);

// We need to completely replace the "Sea Conditions Score Adjustments" block.
const seaConditionsRegex = /\/\/ Sea Conditions Score Adjustments[\s\S]*?\/\/ Temp \(C\)/;

const newSeaConditions = `// Sea Conditions Score Adjustments
  let seaPenalty = 0;
  let seaBonus = 0;
  let explanations: string[] = [];

  // Wind vs Swell conflict (migahetz)
  let isFlattenedByWind = false;
  if (windDirection !== null && waveDirection !== null && windSpeed !== null && windSpeed > 15) {
    const angleDiff = Math.abs((windDirection - waveDirection + 360) % 360);
    if (angleDiff > 120 && angleDiff < 240) {
      isFlattenedByWind = true;
      explanations.push("רוח נגדית מגהצת את הגלים (הים נראה נמוך יותר ממה שהוא)");
    }
  }

  // Wind (km/h) & Direction
  if (windSpeed !== null) {
    const isEastWind = windDirection !== null && (windDirection > 45 && windDirection < 135);
    
    if (windSpeed > 30) {
      seaPenalty += (fishingStyle === 'kayak' || fishingStyle === 'ultralight') ? 60 : 30;
      explanations.push("רוח חזקה מאוד - מקשה על הדייג ופסול לקיאק!");
    } else if (windSpeed > 20) {
      if (isEastWind || isFlattenedByWind) {
        if (fishingStyle === 'ultralight') {
           seaBonus += 20;
           explanations.push("רוח מזרחית/נגדית - אידיאלי לאולטרה לייט קרוב לחוף");
        } else {
           seaBonus += 5;
           explanations.push("רוח מזרחית/נגדית - ים פלטה יחסית");
        }
      } else {
        seaPenalty += (fishingStyle === 'kayak') ? 40 : 15;
        explanations.push("רוח ערה - הקפד על משקלים מתאימים");
      }
    } else if (windSpeed < 10) {
      if (fishingStyle === 'kayak' || fishingStyle === 'ultralight') {
        seaBonus += 20;
        explanations.push("רוח חלשה - אידיאלי לקיאק ולאולטרה לייט!");
      }
    }
  }

  // Waves (m)
  if (waveHeight !== null) {
    if (waveHeight > 1.5) {
      if (fishingStyle === 'kayak') {
        seaPenalty += 100;
        explanations.push("גלים מעל 1.5 - סכנת נפשות לקיאק!");
      } else if (fishingStyle === 'lure') {
        seaPenalty += 20;
        explanations.push("ים גועש - ייתכן קושי לז'רז'ר אם הים סוגר");
      } else {
        seaPenalty += 30;
        explanations.push("ים גבה גלים ומסוכן");
      }
    } else if (waveHeight >= 0.6 && waveHeight <= 1.2) {
      if (fishingStyle === 'lure') {
        seaBonus += 30;
        explanations.push("גובה גלים זהב ללברקים ('מים עובדים')!");
      } else if (fishingStyle === 'kayak') {
        seaPenalty += 20;
        explanations.push("גלים גבוהים יחסית ליציאה בקיאק");
      } else {
        seaBonus += 15;
        explanations.push("מים עובדים - טוב לפיתיונות");
      }
    } else if (waveHeight < 0.3) {
      if (fishingStyle === 'lure') {
        seaPenalty += 10;
        explanations.push("ים פלטה - הטורפים קצת ביישנים");
      } else if (fishingStyle === 'ultralight' || fishingStyle === 'kayak') {
        seaBonus += 25;
        explanations.push("ים פלטה - אידיאלי לסגנון שלך!");
      }
    }
  }

  // Wave Period Adjustments
  if (wavePeriod !== null && waveHeight !== null && waveHeight > 0.4) {
    if (wavePeriod < 4) {
      seaPenalty += 15;
      explanations.push("זמן גל קצר (צ'ופי/מכונת כביסה)");
    } else if (wavePeriod >= 6 && wavePeriod <= 9) {
      seaBonus += 20;
      explanations.push("זמן בין גלים מעולה! סוול מסודר");
    }
  }

  // Barometric Pressure (hPa) & Trend
  if (surfacePressure !== null) {
    if (pressureTrend !== null) {
       if (pressureTrend < -2) {
         seaBonus += 35;
         explanations.push("צניחת לחץ ברומטרי מהירה! הטורפים נכנסים לאטרף אכילות לפני החזית.");
       } else if (pressureTrend > 2) {
         seaPenalty += 20;
         explanations.push("עליית לחץ ברומטרי פתאומית - ייתכן 'נעילת פיות' (Lockjaw).");
       } else {
         if (surfacePressure > 1020) seaBonus += 10;
       }
    } else {
       if (surfacePressure > 1020) {
         seaBonus += 15;
         explanations.push("לחץ ברומטרי גבוה ויציב");
       } else if (surfacePressure < 1005) {
         seaPenalty += 10;
       }
    }
  }

  // Cloud Cover (%)
  if (cloudCover !== null) {
    if (cloudCover > 60 && fishingStyle === 'lure') {
      seaBonus += 20;
      explanations.push("עננות כבדה (דגים עולים לתקוף בפני המים)");
    } else if (cloudCover > 30) {
      seaBonus += 5;
    }
  }

  // Turbidity
  if (isTurbid) {
    if (fishingStyle === 'lure' || fishingStyle === 'ultralight') {
      seaPenalty += 30;
      explanations.push("המים עכורים! (מומלץ דמויים רועשים/צבעים בוהקים או לעבור לפיתיונות)");
    } else if (fishingStyle === 'bait') {
      seaBonus += 15;
      explanations.push("מים עכורים - מעולה לפיתיונות ריחניים (סרגוסים ולוקוסים מחפשים אוכל).");
    }
  }

  // Temp (C)`;

code = code.replace(seaConditionsRegex, newSeaConditions);
fs.writeFileSync('src/lib/solunar.ts', code);
