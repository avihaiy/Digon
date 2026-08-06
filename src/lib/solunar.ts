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
  waterTemp: number | null = null
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

  // Time Score
  const hour = date.getHours();
  let timeScore = 0;
  if ((hour >= 5 && hour <= 8) || (hour >= 17 && hour <= 20)) {
    timeScore = 40;
  } else if ((hour >= 9 && hour <= 11) || (hour >= 15 && hour <= 16)) {
    timeScore = 20;
  }

  // Sea Conditions Score Adjustments
  let seaPenalty = 0;
  let seaBonus = 0;
  let explanations: string[] = [];

  // Wind (km/h)
  if (windSpeed !== null) {
    if (windSpeed > 30) {
      seaPenalty += 40;
      explanations.push("רוח חזקה מאוד מקשה על הדייג");
    } else if (windSpeed > 20) {
      seaPenalty += 15;
      explanations.push("רוח מתונה עד ערה");
    } else if (windSpeed < 10) {
      seaBonus += 10;
    }
  }

  // Waves (m)
  if (waveHeight !== null) {
    if (waveHeight > 1.5) {
      seaPenalty += 50; // Stormy
      explanations.push("ים גבה גלים ומסוכן");
    } else if (waveHeight >= 0.4 && waveHeight <= 0.8) {
      seaBonus += 15; // Perfect working water
      explanations.push("גלים אידיאליים ('מים עובדים')");
    } else if (waveHeight < 0.2) {
      seaPenalty += 5; // Flat
      explanations.push("ים פלטה (פחות מומלץ לפיתיונות)");
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

/**
 * Recommend target species based on water temperature and month
 */
export function getTargetSpecies(temp: number | null): string[] {
  const month = new Date().getMonth() + 1; // 1-12
  
  if (!temp) return ["סרגוס", "דניס", "לוקוס"]; // fallback
  
  // Mediterranean simplified model
  if (temp < 19) {
    return ["קלאמרי", "סבידה", "אינטיאס", "סרגוס", "פלמידה"];
  } else if (temp >= 19 && temp < 24) {
    return ["פלמידה", "לוקוס", "גומבר", "טרחון", "ברקודה"];
  } else {
    // Summer / Hot water
    return ["דוראדו (Mahi Mahi)", "טונה שחורה", "גומבר", "אריען", "לוקוס"];
  }
}
