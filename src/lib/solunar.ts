import * as SunCalcModule from 'suncalc';
const SunCalc = typeof (SunCalcModule as any) === 'function' ? SunCalcModule : (SunCalcModule as any).default ? (SunCalcModule as any).default : SunCalcModule;

// Tel Aviv coordinates
const LAT = 32.0853;
const LON = 34.7818;

/**
 * Get Moon phase and fishing score for a given date
 * @returns { score: number, rating: string, message: string, phaseName: string }
 */
export function getSolunarData(
  date: Date = new Date(),
  waveHeight: number | null = null,
  windSpeed: number | null = null,
  waterTemp: number | null = null,
  wavePeriod: number | null = null,
  surfacePressure: number | null = null,
  windDirection: number | null = null,
  cloudCover: number | null = null
) {
  const moonIllumination = SunCalc.getMoonIllumination(date);
  const phase = moonIllumination.phase; // 0 to 1
  
  let phaseName = "";
  if (phase < 0.05 || phase > 0.95) phaseName = "מולד הירח";
  else if (phase < 0.25) phaseName = "ירח מתמלא (סהר)";
  else if (phase < 0.30) phaseName = "רבע ראשון";
  else if (phase < 0.45) phaseName = "ירח מתמלא";
  else if (phase < 0.55) phaseName = "ירח מלא";
  else if (phase < 0.70) phaseName = "ירח מתמעט";
  else if (phase < 0.80) phaseName = "רבע אחרון";
  else phaseName = "ירח מתמעט (סהר)";

  // Base Moon Score
  const distFromNew = Math.min(phase, 1 - phase);
  const distFromFull = Math.abs(phase - 0.5);
  const bestDist = Math.min(distFromNew, distFromFull); 
  let phaseScore = 100 - (bestDist * 400); 
  if (phaseScore < 20) phaseScore = 20;

  // Time Score (Dynamic check if within Major/Minor period)
  const windows = getDynamicGoldWindows(date);
  let timeScore = 0;
  const currentHour = date.getHours();
  
  const inMajor = windows.some(w => w.type === 'major' && currentHour >= w.startHour && currentHour <= w.endHour);
  const inMinor = windows.some(w => w.type === 'minor' && currentHour >= w.startHour && currentHour <= w.endHour);
  
  if (inMajor) timeScore = 40;
  else if (inMinor) timeScore = 20;

  // Sea Conditions Score Adjustments
  let seaPenalty = 0;
  let seaBonus = 0;
  let explanations: string[] = [];

  // Wind (km/h) & Direction
  if (windSpeed !== null) {
    const isEastWind = windDirection !== null && (windDirection > 45 && windDirection < 135);
    
    if (windSpeed > 30) {
      if (isEastWind) {
        seaPenalty += 10;
        explanations.push("רוח מזרחית ערה (הים יהיה יחסית שטוח אבל יעופו חולות)");
      } else {
        seaPenalty += 40;
        explanations.push("רוח חזקה מאוד מקשה על הדייג");
      }
    } else if (windSpeed > 20) {
      if (isEastWind) {
        seaBonus += 10;
        explanations.push("רוח מזרחית מתונה - אידיאלי למים שקטים סמוך לחוף!");
      } else {
        seaPenalty += 15;
        explanations.push("רוח מתונה עד ערה");
      }
    } else if (windSpeed < 10) {
      seaBonus += 10;
    }
  }

  // Waves (m) & Period (s)
  if (waveHeight !== null) {
    if (waveHeight > 1.5) {
      seaPenalty += 50; // Stormy
      explanations.push("ים גבה גלים ומסוכן");
    } else if (waveHeight >= 0.4 && waveHeight <= 0.8) {
      seaBonus += 15; // Perfect working water
      explanations.push("גובה גלים אידיאלי ('מים עובדים')");
    } else if (waveHeight < 0.2) {
      seaPenalty += 5; // Flat
      explanations.push("ים פלטה (פחות מומלץ לפיתיונות)");
    }
  }

  // Wave Period Adjustments
  if (wavePeriod !== null && waveHeight !== null && waveHeight > 0.3) {
    if (wavePeriod < 4) {
      seaPenalty += 15;
      explanations.push("זמן גל קצר (צ'ופי/מכונת כביסה)");
    } else if (wavePeriod >= 5 && wavePeriod <= 8) {
      seaBonus += 20;
      explanations.push("זמן בין גלים מעולה! סוול מסודר");
    } else if (wavePeriod > 10) {
      seaPenalty += 20;
      explanations.push("סוול ארוך וחזק (סכנת גלים שואבים)");
    }
  }

  // Barometric Pressure (hPa)
  if (surfacePressure !== null) {
    if (surfacePressure > 1020) {
      seaBonus += 15;
      explanations.push("לחץ ברומטרי גבוה ויציב (מעולה לאכילות)");
    } else if (surfacePressure < 1005) {
      seaPenalty += 20;
      explanations.push("שקע ברומטרי (דגים נוטים לרדת לעומק)");
    } else {
      // Normal pressure, slight bonus
      seaBonus += 5;
    }
  }

  // Cloud Cover (%)
  if (cloudCover !== null) {
    if (cloudCover > 60) {
      seaBonus += 15;
      explanations.push("עננות כבדה (דגים עולים לפני המים בגלל מחסור באור)");
    } else if (cloudCover > 30) {
      seaBonus += 5;
      explanations.push("עננות חלקית (תנאים טובים לז'רז'ור)");
    }
  }

  // Temp (C)
  if (waterTemp !== null) {
    if (waterTemp < 16) {
      seaPenalty += 10;
      explanations.push("מים קרים מאוד, פעילות נמוכה");
    } else if (waterTemp > 29) {
      seaPenalty += 10;
      explanations.push("מים חמים מאוד, הדגים בעומק");
    }
  }

  // Combine scores
  let baseScore = (phaseScore * 0.6) + timeScore;
  let finalScore = Math.round(baseScore + seaBonus - seaPenalty);
  if (finalScore > 100) finalScore = 100;
  if (finalScore < 10) finalScore = 10;

  let rating = "";
  let message = "";
  let color = "";
  let bg = "";

  if (finalScore >= 80) {
    rating = "מצוין";
    color = "text-emerald-500";
    bg = "bg-emerald-500/10";
    message = `תנאים מעולים לדייג! (${phaseName})`;
  } else if (finalScore >= 50) {
    rating = "טוב";
    color = "text-yellow-500";
    bg = "bg-yellow-500/10";
    message = `תנאים בינוניים לדייג (${phaseName})`;
  } else {
    rating = "חלש";
    color = "text-rose-500";
    bg = "bg-rose-500/10";
    message = `תנאים חלשים לדייג (${phaseName})`;
  }

  return { 
    score: finalScore, 
    rating, 
    message, 
    phaseName, 
    color, 
    bg,
    explanations 
  };
}

export interface FishRecommendation {
  species: string[];
  bestMethod: string;
  reasoning: string;
  iconType: 'lure' | 'bait' | 'squid';
}

/**
 * AI Algorithm to recommend target species and methods based on live Mediterranean conditions
 */
export function getSmartTargetSpecies(
  waveHeight: number | null, 
  temp: number | null, 
  cloudCover: number | null
): FishRecommendation {
  
  // Fallbacks
  const w = waveHeight ?? 0.5;
  const t = temp ?? 22;
  const c = cloudCover ?? 10;
  
  const isWinter = t < 20;
  
  // SCENARIO 1: Flat Sea (ים פלטה)
  if (w < 0.3) {
    if (isWinter) {
      return {
        species: ["קלמרי", "סבידה", "ברקודה"],
        bestMethod: "ז'רז'ור קלמרים או דמויים קטנים",
        reasoning: "הים שטוח לגמרי והמים קרים. תנאים מושלמים לדינונים (קלמרי/סבידה) ולטורפים עדינים.",
        iconType: 'squid'
      };
    } else {
      return {
        species: ["דוראדו (Mahi)", "טונה שחורה", "טרחון"],
        bestMethod: "ז'רז'ור טופ-ווטר או ג'יג קל",
        reasoning: "ים שטוח ומים חמים. דגי ים פתוח יחפשו טרף על פני המים. חפש רתיחות!",
        iconType: 'lure'
      };
    }
  }
  
  // SCENARIO 2: Working Sea (ים עובד)
  if (w >= 0.3 && w <= 0.9) {
    if (c > 50) {
      return {
        species: ["גומבר", "לוקוס", "פלמידה", "אינטיאס"],
        bestMethod: "ז'רז'ור כבד / בינוני",
        reasoning: "הים עובד ויש עננות שמסתירה את השמש! הטורפים הגדולים עולים קרוב לחוף לתקוף.",
        iconType: 'lure'
      };
    } else {
      return {
        species: ["סרגוס", "לוקוס", "דניס"],
        bestMethod: "דייג פיתיונות או בוס",
        reasoning: "ים אידיאלי ('מים עובדים') אך שמשי. מומלץ לחפש את הדגים סביב סלעים ובורות עם פיתיונות.",
        iconType: 'bait'
      };
    }
  }
  
  // SCENARIO 3: Stormy/High Sea (ים גבוה/סוער)
  if (w > 0.9) {
    return {
      species: ["סרגוס גדול", "לבט (שישן)", "לוקוס מפלצת"],
      bestMethod: "דייג פיתיונות כבד מהחוף/סלעים",
      reasoning: "הים גועש והמים עכורים. טורפי ז'רז'ור יתרחקו, אבל דגי הקרקעית (סרגוסים) חוגגים על מה שעף מהסלעים.",
      iconType: 'bait'
    };
  }

  // Generic fallback
  return {
    species: ["סרגוס", "טרחון"],
    bestMethod: "פיתיונות או ז'רז'ור קל",
    reasoning: "תנאים רגילים, הכל אפשרי.",
    iconType: 'lure'
  };
}

export interface GoldWindow {
  type: 'major' | 'minor';
  startHour: number;
  endHour: number;
  label: string;
}

/**
 * Calculates accurate Solunar Major/Minor feeding windows based on Moon transit (Zenith/Nadir)
 * Major periods are 2 hours before and after Zenith/Nadir.
 * Minor periods are around sunrise/sunset (using moon rise/set or generic dawn/dusk).
 */
export function getDynamicGoldWindows(date: Date): GoldWindow[] {
  let maxAlt = -99;
  let minAlt = 99;
  let zenithHour = 12;
  let nadirHour = 0;

  // Scan 24 hours to find Moon highest and lowest points (transit)
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < 24; i++) {
    const t = new Date(d.getTime() + i * 3600 * 1000);
    const pos = SunCalc.getMoonPosition(t, LAT, LON);
    if (pos.altitude > maxAlt) {
      maxAlt = pos.altitude;
      zenithHour = i;
    }
    if (pos.altitude < minAlt) {
      minAlt = pos.altitude;
      nadirHour = i;
    }
  }

  const windows: GoldWindow[] = [];

  // Major Period 1 (Zenith)
  windows.push({
    type: 'major',
    startHour: Math.max(0, zenithHour - 1),
    endHour: Math.min(23, zenithHour + 2),
    label: 'זניט ירח (Major)'
  });

  // Major Period 2 (Nadir)
  windows.push({
    type: 'major',
    startHour: Math.max(0, nadirHour - 1),
    endHour: Math.min(23, nadirHour + 2),
    label: 'נדיר ירח (Major)'
  });

  // Add generic Minor periods for Dawn / Dusk (Sunrise/Sunset)
  // For better accuracy, we just use static optimal crepuscular times 
  // since SunCalc.getTimes provides exact sunrise/sunset, but static is okay for minor.
  const sunTimes = SunCalc.getTimes(d, LAT, LON);
  const sunriseHour = sunTimes.sunrise.getHours();
  const sunsetHour = sunTimes.sunset.getHours();

  windows.push({
    type: 'minor',
    startHour: Math.max(0, sunriseHour - 1),
    endHour: Math.min(23, sunriseHour + 1),
    label: 'זריחה (Minor)'
  });

  windows.push({
    type: 'minor',
    startHour: Math.max(0, sunsetHour - 1),
    endHour: Math.min(23, sunsetHour + 1),
    label: 'שקיעה (Minor)'
  });

  // Sort by start time and deduplicate overlapping (simple filter)
  return windows.sort((a, b) => a.startHour - b.startHour);
}
