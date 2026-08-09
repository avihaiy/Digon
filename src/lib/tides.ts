import * as SunCalcModule from 'suncalc';
const SunCalc = typeof (SunCalcModule as any) === 'function' ? SunCalcModule : (SunCalcModule as any).default ? (SunCalcModule as any).default : SunCalcModule;

const LAT = 32.0853;
const LON = 34.7818;

export interface TideDataPoint {
  time: string;
  date: Date;
  level: number;
  isHigh: boolean;
  isLow: boolean;
}

/**
 * Generates an approximated harmonic tide curve for the Eastern Mediterranean (Israel).
 * Uses lunar transit (zenith/nadir) from SunCalc.
 * High tide in Israel typically lags lunar transit by ~3.5 hours.
 * Amplitude varies with moon phase (spring vs neap tides).
 */
export function getMediterraneanTides(date: Date = new Date(), hoursToGenerate: number = 24): TideDataPoint[] {
  const data: TideDataPoint[] = [];
  
  // Base parameters for Israel tides
  const LUNI_TIDAL_LAG_HOURS = 3.5;
  const MEAN_SEA_LEVEL = 0; // relative to local datum
  
  // Calculate Moon Phase for amplitude multiplier (Spring/Neap)
  // Phase 0 (new) and 0.5 (full) give max amplitude (spring). Phase 0.25 and 0.75 give min (neap).
  const moonIllumination = SunCalc.getMoonIllumination(date);
  const phase = moonIllumination.phase; 
  const distFromSyzygy = Math.min(Math.abs(phase - 0), Math.abs(phase - 0.5), Math.abs(phase - 1));
  // distFromSyzygy goes from 0 (Spring) to 0.25 (Neap)
  // Amplitude range: Neap ~0.15m, Spring ~0.4m
  const amplitude = 0.4 - (distFromSyzygy / 0.25) * 0.25; 

  const startHour = new Date(date);
  startHour.setMinutes(0, 0, 0);

  for (let i = 0; i <= hoursToGenerate; i++) {
    const current = new Date(startHour.getTime() + i * 60 * 60 * 1000);
    
    // Get moon position at this hour
    const moonPos = SunCalc.getMoonPosition(current, LAT, LON);
    
    // Moon altitude determines the tidal force. 
    // Max altitude (zenith) or Min altitude (nadir) produce high tides (with lag).
    // We look back by LUNI_TIDAL_LAG_HOURS to find what the moon was doing.
    const laggedTime = new Date(current.getTime() - LUNI_TIDAL_LAG_HOURS * 60 * 60 * 1000);
    const laggedMoonPos = SunCalc.getMoonPosition(laggedTime, LAT, LON);
    
    // Altitude is roughly a sine wave over ~24h50m.
    // By taking the sine of the altitude, we get a curve.
    // However, both zenith (high positive alt) and nadir (high negative alt) cause HIGH tide.
    // So we use cosine of the hour angle, but a simpler approximation is taking the absolute value or squaring.
    // Let's use a standard M2 constituent approximation (semi-diurnal, period ~12.42 hours).
    
    // We calculate a phase angle based on the lagged moon position.
    // Moon's azimuth (in radians) roughly completes a circle every 24h50m.
    // For semi-diurnal, we double the angle (2 * azimuth).
    const m2Phase = laggedMoonPos.azimuth * 2;
    
    // Sine of the m2Phase gives us the tide level
    const level = MEAN_SEA_LEVEL + Math.sin(m2Phase) * amplitude;
    
    data.push({
      time: current.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      date: current,
      level: Number(level.toFixed(2)),
      isHigh: false, // Calculated after generating all points
      isLow: false
    });
  }

  // Find local maxima and minima to label high/low tides
  for (let i = 1; i < data.length - 1; i++) {
    const prev = data[i-1].level;
    const curr = data[i].level;
    const next = data[i+1].level;
    
    if (curr > prev && curr > next && curr > 0.1) {
      data[i].isHigh = true;
    } else if (curr < prev && curr < next && curr < -0.1) {
      data[i].isLow = true;
    }
  }

  return data;
}
