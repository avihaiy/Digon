import * as SunCalc from 'suncalc';

// Tel Aviv coordinates
const LAT = 32.0853;
const LON = 34.7818;

/**
 * Get Moon phase and fishing score for a given date
 * @returns { score: number, rating: string, message: string, phaseName: string }
 */
export function getSolunarData(date: Date = new Date()) {
  const moonIllumination = SunCalc.getMoonIllumination(date);
  const moonTimes = SunCalc.getMoonTimes(date, LAT, LON);
  const sunTimes = SunCalc.getTimes(date, LAT, LON);

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

  // Solunar Theory dictates best times are around moon transit (overhead) and moonset/rise.
  // We'll calculate a base score from the moon phase (Full and New are best)
  // Distance from New (0) or Full (0.5)
  const distFromNew = Math.min(phase, 1 - phase);
  const distFromFull = Math.abs(phase - 0.5);
  const bestDist = Math.min(distFromNew, distFromFull); // 0 is best, 0.25 is worst
  
  let phaseScore = 100 - (bestDist * 400); // 0 -> 100, 0.25 -> 0
  if (phaseScore < 20) phaseScore = 20;

  // Add time-of-day modifiers (Dawn/Dusk are always good)
  const hour = date.getHours();
  let timeScore = 0;
  if ((hour >= 5 && hour <= 8) || (hour >= 17 && hour <= 20)) {
    timeScore = 40;
  } else if ((hour >= 9 && hour <= 11) || (hour >= 15 && hour <= 16)) {
    timeScore = 20;
  }

  // Combine scores
  let finalScore = Math.round((phaseScore * 0.6) + (timeScore));
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
    message = `זמן מעולה לדייג! הדגים בשיא הפעילות (${phaseName})`;
  } else if (finalScore >= 50) {
    rating = "טוב";
    color = "text-yellow-500";
    bg = "bg-yellow-500/10";
    message = `פעילות דגים בינונית (${phaseName})`;
  } else {
    rating = "חלש";
    color = "text-rose-500";
    bg = "bg-rose-500/10";
    message = `פעילות חלשה. הירח לא אידיאלי עכשיו (${phaseName})`;
  }

  return { score: finalScore, rating, message, phaseName, color, bg };
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
