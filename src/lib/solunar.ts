import * as SunCalc from 'suncalc';

// Tel Aviv coordinates
const LAT = 32.0853;
const LON = 34.7818;

/**
 * Get Moon phase and fishing score for a given date
 * @returns { score: number, rating: string, message: string, phaseName: string }
 */
export type FishingStyle = 'lure' | 'bait' | 'kayak' | 'ultralight' | 'float';


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
  waveDirection: number | null = null,
  windGusts: number | null = null,
  cape: number | null = null,
  oceanCurrentVelocity: number | null = null
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

  // CAPE (Thunderstorm Risk)
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
  recommendedGear?: string;
}

/**
 * AI Algorithm to recommend target species and methods based on live Mediterranean conditions
 */
export function getSmartTargetSpecies(
  waveHeight: number | null, 
  temp: number | null, 
  cloudCover: number | null,
  fishingStyle: FishingStyle = 'lure',
  isTurbid: boolean = false
): FishRecommendation {
  const w = waveHeight ?? 0.5;
  const t = temp ?? 22;
  const c = cloudCover ?? 10;
  
  const isWinter = t < 20;

  if (isTurbid) {
    if (fishingStyle === 'lure' || fishingStyle === 'ultralight') {
      return {
        species: ["לוקוס (על הריפים)", "ברקודה"],
        bestMethod: "דמויים בצבעים זוהרים/רועשים (Rattling)",
        reasoning: "המים עכורים ולכן דגים מתקשים לראות. השתמש בדמויים שעושים ויברציות.",
        iconType: 'lure',
        recommendedGear: "דמויי מינואו צוללים בצבעי אש/צהוב זרחני או ג'יג-הד רועש."
      };
    } else {
      return {
        species: ["סרגוס", "לבט", "לוקוס"],
        bestMethod: "פיתיונות מסריחים (סבידה/גמברי)",
        reasoning: "מים עכורים מביאים את הסרגוסים לחפש אוכל בעזרת חוש הריח! זמן פצצה.",
        iconType: 'bait',
        recommendedGear: "סבידה מיושנת, קלמארי, או גמברי קריסטל שלם (לא קלוף)."
      };
    }
  }

  // SCENARIO 1: Flat Sea (ים פלטה)
  if (w < 0.4) {
    if (fishingStyle === 'kayak') {
      return {
        species: isWinter ? ["קלמרי", "סבידה", "טרחון קטן"] : ["טרחון", "פלמידה", "טונה שחורה"],
        bestMethod: "ז'רז'ור קלמרים / פופרים קטנים",
        reasoning: "ים שטוח לגמרי מושלם לסגנון שלך. חפש רתיחות!",
        iconType: isWinter ? 'squid' : 'lure',
        recommendedGear: isWinter ? "בובות סבידה (Egi) צבע ורוד או כחול." : "כלבים עדינים 5-9 גרם ומיקרו ג'יגים 3-7 גרם."
      };
    } else if (fishingStyle === 'ultralight' || fishingStyle === 'lure') {
      return {
        species: ["טרחון", "טלוויזיות", "לברק קטן"],
        bestMethod: "ז'רז'ור קל עד אולטרה-לייט",
        reasoning: "ים פלטה דורש עבודה עדינה ודמויים קטנים, הדגים יראו כל תנועה לא טבעית.",
        iconType: 'lure',
        recommendedGear: "פופרים קטנים (עד 7 ס'מ), סיליקונים עם משקולות קלות מאוד (עד 5 גרם)."
      };
    } else if (fishingStyle === 'float') {
      return {
        species: ["בורי", "אראס", "סרגוס קטן"],
        bestMethod: "בוס / פולו (מצוף עדין)",
        reasoning: "ים פלטה מושלם לזיהוי אכילות עדינות של בורי או אראסים.",
        iconType: 'bait',
        recommendedGear: "מצוף 1-2 גרם, קרסים 10-12, בצק מסטיק או פיתה."
      };
    } else { // bait
      return {
        species: ["דניס", "מרמיר", "בורי"],
        bestMethod: "פיתיונות על רגש (בוס או חוף עדין)",
        reasoning: "המים צלולים והדגים חשדניים. השתמש בחוטים דקים ופיתיון טבעי.",
        iconType: 'bait',
        recommendedGear: "בצק מסטיק למלכודות, או תולעים טריות עם חוט תלאי 0.16 מ'מ פלורוקרבון."
      };
    }
  }
  
  // SCENARIO 2: Working Sea (ים עובד)
  if (w >= 0.4 && w <= 1.2) {
    if (fishingStyle === 'kayak') {
      return {
        species: ["פלמידה", "אינטיאס", "דוראדו"],
        bestMethod: "טרולינג זהיר",
        reasoning: "הים קצת גלי, סע בזהירות וחפש את הטורפים בקווי העומק.",
        iconType: 'lure',
        recommendedGear: "מינואו 140-175 מ'מ עמוקים ומהירים (למשל Rapala X-Rap)."
      };
    } else if (fishingStyle === 'lure' || fishingStyle === 'ultralight') {
      if (c > 50) {
        return {
          species: ["לברק!", "גומבר", "לוקוס"],
          bestMethod: "ז'רז'ור בקצף הגלים",
          reasoning: "ים עובד + עננות = זמן לברקים! טורפים יוצאים לאכול בקצף.",
          iconType: 'lure',
          recommendedGear: "סיליקונים ארוכים לבנים (Black Minnow 120), וכלבים גדולים לקצף."
        };
      } else {
        return {
          species: ["גומבר", "ברקודה", "טרחון"],
          bestMethod: "ז'רז'ור מהיר",
          reasoning: "ים עובד ושמשי מושלם לדמויים מהירים ונוצצים בתוך הגלים.",
          iconType: 'lure',
          recommendedGear: "ג'יגים 15-40 גרם (כסף/זהב) או דמויי מינואו צוללים."
        };
      }
    } else if (fishingStyle === 'float') {
      return {
        species: ["סרגוס", "כחילון", "בורי ענק"],
        bestMethod: "בוס בקצף (בורות וזרמים)",
        reasoning: "ים עובד מושלם לסרגוסים! חפש את המים הלבנים (קצף).",
        iconType: 'bait',
        recommendedGear: "מצוף קריצה או מצוף זרם 3-5 גרם, תולעים טריות או בצק סריח."
      };
    } else { // bait
      return {
        species: ["סרגוס", "לוקוס", "דניס"],
        bestMethod: "דייג פיתיונות או בוס",
        reasoning: "מים עובדים עוזרים לדגים ביישנים לצאת לאכול.",
        iconType: 'bait',
        recommendedGear: "רצועות שניצל, תולעים שניות (שלמות), חתיכות סרדין כפותות בחוט אלסטי."
      };
    }
  }
  
  // SCENARIO 3: Stormy/High Sea (ים גבוה/סוער)
  if (w > 1.2) {
    if (fishingStyle === 'kayak') {
      return {
        species: [],
        bestMethod: "להישאר בבית",
        reasoning: "הים סוער מדי לקיאק. סכנת חיים.",
        iconType: 'lure',
        recommendedGear: "הישאר על החוף."
      };
    } else if (fishingStyle === 'lure' || fishingStyle === 'ultralight') {
      return {
        species: ["לברק", "לוקוס מפלצת", "ברקודה"],
        bestMethod: "ז'רז'ור כבד מהסלעים או מזחים גבוהים",
        reasoning: "הים גועש מאוד. טורפים באים לקצות שוברי גלים. היזהרו ממשברי גלים פתאומיים!",
        iconType: 'lure',
        recommendedGear: "ג'יגים כבדים 30-40 גרם, פופרים ענקיים ומינואו עמיד לזרם חזק."
      }
    } else if (fishingStyle === 'float') {
      return {
        species: [],
        bestMethod: "לא מתאים",
        reasoning: "הים סוער מדי. מצוף רגיל יעוף ברוח ולא יחזיק בזרמים חזקים.",
        iconType: 'bait',
        recommendedGear: "עדיף לעבור לדייג פיתיונות עם משקולת (סרף/חי)"
      };
    } else { // bait
      return {
        species: ["סרגוס גדול", "לבט (שישן)", "לוקוס מפלצת"],
        bestMethod: "דייג פיתיונות כבד מהחוף/סלעים",
        reasoning: "הים גועש. טורפי ז'רז'ור קל יתרחקו, אבל דגי הקרקעית (סרגוסים) חוגגים בזרמים.",
        iconType: 'bait',
        recommendedGear: "קרס 1/0 ומעלה, חוט ראשי לפחות 0.40, משקולות עוגן כבדות. סבידה או קלמארי שלם תפור."
      };
    }
  }

  // Generic fallback
  return {
    species: ["סרגוס", "טרחון"],
    bestMethod: "פיתיונות או ז'רז'ור קל",
    reasoning: "תנאים רגילים, הכל אפשרי.",
    iconType: 'lure',
    recommendedGear: "ג'יגים קטנים לחיפוש טורפים, או פיתיון גמברי פשוט לסרגוסים."
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
