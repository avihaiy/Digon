import { HDate, HebrewCalendar, Location, Zmanim, flags } from '@hebcal/core';
import { ISRAEL_LOCATIONS } from './hebrew-utils';

export interface HolidayInfo {
  name: string;
  hebrewName: string;
  type: 'major' | 'minor' | 'fast' | 'chanukah' | 'rosh_chodesh';
  candleLighting?: Date | null;
  havdalah?: Date | null;
  fastStart?: Date | null;
  fastEnd?: Date | null;
  chanukahCandles?: number;
}

export interface FastTimes {
  fastStart: Date | null;
  fastEnd: Date | null;
  fastName: string;
}

// Hebrew holiday names mapping
const HOLIDAY_NAMES: Record<string, string> = {
  'Rosh Hashana': 'ראש השנה',
  'Yom Kippur': 'יום כיפור',
  'Sukkot': 'סוכות',
  'Shmini Atzeret': 'שמיני עצרת',
  'Simchat Torah': 'שמחת תורה',
  'Chanukah': 'חנוכה',
  'Tu BiShvat': 'ט״ו בשבט',
  'Purim': 'פורים',
  'Pesach': 'פסח',
  'Yom HaShoah': 'יום השואה',
  'Yom HaZikaron': 'יום הזיכרון',
  'Yom HaAtzma\'ut': 'יום העצמאות',
  'Lag BaOmer': 'ל״ג בעומר',
  'Yom Yerushalayim': 'יום ירושלים',
  'Shavuot': 'שבועות',
  'Tish\'a B\'Av': 'תשעה באב',
  'Tu B\'Av': 'ט״ו באב',
  // Fasts
  'Tzom Gedaliah': 'צום גדליה',
  'Asara B\'Tevet': 'עשרה בטבת',
  'Ta\'anit Esther': 'תענית אסתר',
  'Ta\'anit Bechorot': 'תענית בכורות',
  'Tzom Tammuz': 'צום י״ז בתמוז',
  // Rosh Chodesh
  'Rosh Chodesh': 'ראש חודש',
};

// Get today's holidays
export function getTodayHolidays(date: Date = new Date()): HolidayInfo[] {
  const hdate = new HDate(date);
  const events = HebrewCalendar.getHolidaysOnDate(hdate, true); // true = Israel
  
  if (!events || events.length === 0) return [];
  
  return events.map(event => {
    const desc = event.getDesc();
    const eventFlags = event.getFlags();
    
    let type: HolidayInfo['type'] = 'minor';
    if (eventFlags & flags.MAJOR_FAST) type = 'fast';
    else if (eventFlags & flags.MINOR_FAST) type = 'fast';
    else if (desc.includes('Chanukah')) type = 'chanukah';
    else if (eventFlags & flags.ROSH_CHODESH) type = 'rosh_chodesh';
    else if (eventFlags & flags.CHAG) type = 'major';
    
    // Chanukah candle count
    let chanukahCandles: number | undefined;
    if (type === 'chanukah') {
      const match = desc.match(/Chanukah: (\d+) Candle/);
      if (match) chanukahCandles = parseInt(match[1]);
    }
    
    return {
      name: desc,
      hebrewName: HOLIDAY_NAMES[desc.split(':')[0].trim()] || desc,
      type,
      chanukahCandles,
    };
  });
}

// Get fast times for today
export function getFastTimes(locationKey: string = 'akko', date: Date = new Date()): FastTimes | null {
  const holidays = getTodayHolidays(date);
  const fastHoliday = holidays.find(h => h.type === 'fast');
  
  if (!fastHoliday) return null;
  
  const loc = ISRAEL_LOCATIONS[locationKey] || ISRAEL_LOCATIONS.akko;
  const location = new Location(loc.lat, loc.lng, false, loc.tzid, undefined, loc.name);
  const zmanim = new Zmanim(location, date, false);
  
  const isYomKippur = fastHoliday.name.includes('Yom Kippur');
  const isTishaBAv = fastHoliday.name.includes('Tish\'a B\'Av');
  
  let fastStart: Date | null = null;
  let fastEnd: Date | null = null;
  
  if (isYomKippur || isTishaBAv) {
    // Night fast - starts at sunset the day before
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayZmanim = new Zmanim(location, yesterday, false);
    fastStart = yesterdayZmanim.sunset();
    fastEnd = zmanim.tzeit();
  } else {
    // Day fast - starts at dawn, ends at nightfall
    fastStart = zmanim.alotHaShachar();
    fastEnd = zmanim.tzeit();
  }
  
  return {
    fastStart,
    fastEnd,
    fastName: fastHoliday.hebrewName,
  };
}

// Get Chanukah candle lighting time
export function getChanukahCandleLighting(locationKey: string = 'akko', date: Date = new Date()): { time: Date | null; candles: number } | null {
  const holidays = getTodayHolidays(date);
  const chanukah = holidays.find(h => h.type === 'chanukah');
  
  if (!chanukah || !chanukah.chanukahCandles) return null;
  
  const loc = ISRAEL_LOCATIONS[locationKey] || ISRAEL_LOCATIONS.akko;
  const location = new Location(loc.lat, loc.lng, false, loc.tzid, undefined, loc.name);
  const zmanim = new Zmanim(location, date, false);
  
  const dayOfWeek = date.getDay();
  let candleLightingTime: Date | null = null;
  
  if (dayOfWeek === 5) {
    // Friday - light before Shabbat candles
    const sunset = zmanim.sunset();
    if (sunset) {
      candleLightingTime = new Date(sunset.getTime() - 20 * 60 * 1000); // 20 min before sunset
    }
  } else if (dayOfWeek === 6) {
    // Motzei Shabbat - light after Shabbat ends
    candleLightingTime = zmanim.tzeit();
  } else {
    // Regular day - light at sunset
    candleLightingTime = zmanim.sunset();
  }
  
  return {
    time: candleLightingTime,
    candles: chanukah.chanukahCandles,
  };
}

// Check if today is a special day (holiday/fast)
export function isSpecialDay(date: Date = new Date()): boolean {
  const holidays = getTodayHolidays(date);
  return holidays.some(h => h.type === 'major' || h.type === 'fast' || h.type === 'chanukah');
}

// Get special times panel data
export interface SpecialTimesData {
  holidays: HolidayInfo[];
  fastTimes: FastTimes | null;
  chanukah: { time: Date | null; candles: number } | null;
}

export function getSpecialTimesData(locationKey: string = 'akko', date: Date = new Date()): SpecialTimesData {
  return {
    holidays: getTodayHolidays(date),
    fastTimes: getFastTimes(locationKey, date),
    chanukah: getChanukahCandleLighting(locationKey, date),
  };
}
