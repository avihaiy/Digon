import { useState, useEffect } from 'react';

export interface SolunarData {
  rating: number; // 0 to 100
  status: 'מצוין' | 'טוב' | 'בינוני' | 'חלש';
  moonPhase: number; // 0 to 1 (0 = new, 0.5 = full)
  nextMajorTime: string; // e.g., "17:30 - 19:30"
}

// A mock function that generates plausible Solunar data based on current date/time
// In a real app, this would call an API like solunar.org or calculate based on lat/lng.
function calculateSolunarMock(): SolunarData {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDate();
  
  // Fake moon phase based on the day of the month (approximate 29.5 day cycle)
  const moonPhase = (day % 30) / 30;
  
  // Base rating based on moon phase (better during new/full moon)
  let baseRating = 50;
  if (moonPhase < 0.1 || moonPhase > 0.9) baseRating += 30; // New moon
  else if (moonPhase > 0.4 && moonPhase < 0.6) baseRating += 20; // Full moon

  // Adjust rating based on time of day (dawn/dusk are best)
  let timeMultiplier = 1.0;
  if (hour >= 5 && hour <= 8) timeMultiplier = 1.4; // Dawn
  else if (hour >= 17 && hour <= 20) timeMultiplier = 1.5; // Dusk
  else if (hour >= 11 && hour <= 14) timeMultiplier = 0.6; // Midday slump

  let rating = Math.min(100, Math.round(baseRating * timeMultiplier));
  
  // Status string
  let status: SolunarData['status'] = 'חלש';
  if (rating >= 80) status = 'מצוין';
  else if (rating >= 60) status = 'טוב';
  else if (rating >= 40) status = 'בינוני';

  // Next major time: simply return the next dusk or dawn
  let nextMajorTime = "17:00 - 19:30";
  if (hour >= 20 || hour < 5) {
    nextMajorTime = "05:30 - 08:00"; // Tomorrow morning
  }

  return {
    rating,
    status,
    moonPhase,
    nextMajorTime
  };
}

export function useSolunar() {
  const [data, setData] = useState<SolunarData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API delay
    const timer = setTimeout(() => {
      setData(calculateSolunarMock());
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  return { data, loading };
}
