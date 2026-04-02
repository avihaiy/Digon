// Hebrew date and parasha utilities
import { HDate, Sedra, Location, Zmanim, HebrewCalendar, flags } from '@hebcal/core';

// Common Israeli city locations
export const ISRAEL_LOCATIONS: Record<string, { name: string; lat: number; lng: number; tzid: string }> = {
  akko: { name: 'עכו', lat: 32.9278, lng: 35.0826, tzid: 'Asia/Jerusalem' },
  jerusalem: { name: 'ירושלים', lat: 31.7683, lng: 35.2137, tzid: 'Asia/Jerusalem' },
  tel_aviv: { name: 'תל אביב', lat: 32.0853, lng: 34.7818, tzid: 'Asia/Jerusalem' },
  haifa: { name: 'חיפה', lat: 32.7940, lng: 34.9896, tzid: 'Asia/Jerusalem' },
  beer_sheva: { name: 'באר שבע', lat: 31.2530, lng: 34.7915, tzid: 'Asia/Jerusalem' },
  eilat: { name: 'אילת', lat: 29.5577, lng: 34.9519, tzid: 'Asia/Jerusalem' },
  netanya: { name: 'נתניה', lat: 32.3215, lng: 34.8532, tzid: 'Asia/Jerusalem' },
  ashdod: { name: 'אשדוד', lat: 31.8044, lng: 34.6553, tzid: 'Asia/Jerusalem' },
  bnei_brak: { name: 'בני ברק', lat: 32.0873, lng: 34.8338, tzid: 'Asia/Jerusalem' },
  petah_tikva: { name: 'פתח תקווה', lat: 32.0841, lng: 34.8878, tzid: 'Asia/Jerusalem' },
  rishon: { name: 'ראשון לציון', lat: 31.9730, lng: 34.7925, tzid: 'Asia/Jerusalem' },
};

// Daily halachic times interface
export interface DailyZmanim {
  alotHashachar: Date | null;  // Dawn
  sunrise: Date | null;        // Netz HaChama
  misheyakir: Date | null;     // Earliest time for tallit/tefillin
  sofZmanShmaMGA: Date | null; // Latest Shema (Magen Avraham)
  sofZmanShmaGRA: Date | null; // Latest Shema (Gra)
  sofZmanTfillaMGA: Date | null; // Latest Prayer (MA)
  sofZmanTfillaGRA: Date | null; // Latest Prayer (GRA)
  chatzot: Date | null;        // Midday
  minchaGedola: Date | null;   // Earliest Mincha
  minchaKetana: Date | null;   // Small Mincha
  plagHaMincha: Date | null;   // Plag HaMincha
  sunset: Date | null;         // Shkia
  tzeit: Date | null;          // Three stars
}

export function getDailyZmanim(locationKey: string = 'akko', date: Date = new Date()): DailyZmanim {
  const loc = ISRAEL_LOCATIONS[locationKey] || ISRAEL_LOCATIONS.akko;
  const location = new Location(loc.lat, loc.lng, false, loc.tzid, undefined, loc.name);
  const zmanim = new Zmanim(location, date, false);
  
  return {
    alotHashachar: zmanim.alotHaShachar(),
    sunrise: zmanim.sunrise(),
    misheyakir: zmanim.misheyakir(),
    sofZmanShmaMGA: zmanim.sofZmanShmaMGA(),
    sofZmanShmaGRA: zmanim.sofZmanShma(),
    sofZmanTfillaMGA: zmanim.sofZmanTfillaMGA(),
    sofZmanTfillaGRA: zmanim.sofZmanTfilla(),
    chatzot: zmanim.chatzot(),
    minchaGedola: zmanim.minchaGedola(),
    minchaKetana: zmanim.minchaKetana(),
    plagHaMincha: zmanim.plagHaMincha(),
    sunset: zmanim.sunset(),
    tzeit: zmanim.tzeit(),
  };
}

// Get Shabbat times for a location
export interface ShabbatTimes {
  candleLighting: Date | null;
  shabbatStart: Date | null;
  shabbatEnd: Date | null;
  havdalah: Date | null;
  havdalahRT: Date | null; // Rabbeinu Tam
}

export function getShabbatTimes(locationKey: string = 'akko', date: Date = new Date()): ShabbatTimes {
  const loc = ISRAEL_LOCATIONS[locationKey] || ISRAEL_LOCATIONS.akko;
  const location = new Location(loc.lat, loc.lng, false, loc.tzid, undefined, loc.name);
  
  // Find the upcoming Friday
  const friday = new Date(date);
  const dayOfWeek = friday.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  if (daysUntilFriday > 0) {
    friday.setDate(friday.getDate() + daysUntilFriday);
  }
  
  // Find Saturday
  const saturday = new Date(friday);
  saturday.setDate(saturday.getDate() + 1);
  
  // Calculate zmanim for Friday (candle lighting)
  const fridayZmanim = new Zmanim(location, friday, false);
  const sunset = fridayZmanim.sunset();
  
  // Candle lighting is typically 18-40 minutes before sunset (18 for most, 40 for Jerusalem)
  const candleLightingMinutes = locationKey === 'jerusalem' ? 40 : 18;
  let candleLighting: Date | null = null;
  if (sunset) {
    candleLighting = new Date(sunset.getTime() - candleLightingMinutes * 60 * 1000);
  }
  
  // Calculate zmanim for Saturday (havdalah)
  const saturdayZmanim = new Zmanim(location, saturday, false);
  const saturdaySunset = saturdayZmanim.sunset();
  const tzeit = saturdayZmanim.tzeit(); // Three stars
  
  let havdalah: Date | null = null;
  let havdalahRT: Date | null = null;
  if (tzeit) {
    havdalah = tzeit;
  } else if (saturdaySunset) {
    // Fallback: ~42 minutes after sunset
    havdalah = new Date(saturdaySunset.getTime() + 42 * 60 * 1000);
  }
  
  // Rabbeinu Tam - 72 minutes after sunset
  if (saturdaySunset) {
    havdalahRT = new Date(saturdaySunset.getTime() + 72 * 60 * 1000);
  }
  
  return {
    candleLighting,
    shabbatStart: sunset,
    shabbatEnd: saturdaySunset,
    havdalah,
    havdalahRT,
  };
}

// Format time for display (HH:MM)
export function formatTimeOnly(date: Date | null): string {
  if (!date) return '--:--';
  return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

// Parasha list for reference and display
export const PARASHA_LIST = [
  'בראשית', 'נח', 'לך לך', 'וירא', 'חיי שרה', 'תולדות', 'ויצא', 'וישלח', 'וישב', 'מקץ',
  'ויגש', 'ויחי', 'שמות', 'וארא', 'בא', 'בשלח', 'יתרו', 'משפטים', 'תרומה', 'תצוה',
  'כי תשא', 'ויקהל', 'פקודי', 'ויקרא', 'צו', 'שמיני', 'תזריע', 'מצורע', 'אחרי מות', 'קדושים',
  'אמור', 'בהר', 'בחוקותי', 'במדבר', 'נשא', 'בהעלותך', 'שלח', 'קרח', 'חקת', 'בלק',
  'פינחס', 'מטות', 'מסעי', 'דברים', 'ואתחנן', 'עקב', 'ראה', 'שופטים', 'כי תצא', 'כי תבוא',
  'ניצבים', 'וילך', 'האזינו', 'וזאת הברכה'
];

// Holiday list for payments
export const HOLIDAY_LIST = [
  // ימים נוראים
  'ראש השנה - יום א׳',
  'ראש השנה - יום ב׳',
  'צום גדליה',
  'יום כיפור',
  // סוכות
  'סוכות - יום א׳',
  'סוכות - חול המועד',
  'הושענא רבה',
  'שמיני עצרת',
  'שמחת תורה',
  // חנוכה
  'חנוכה - נר א׳',
  'חנוכה - נר ב׳',
  'חנוכה - נר ג׳',
  'חנוכה - נר ד׳',
  'חנוכה - נר ה׳',
  'חנוכה - נר ו׳',
  'חנוכה - נר ז׳',
  'חנוכה - נר ח׳ (זאת חנוכה)',
  // צומות וימי זיכרון
  'צום עשרה בטבת',
  'תענית אסתר',
  'צום י"ז בתמוז',
  'תשעה באב',
  // ארבע פרשיות
  'פרשת שקלים',
  'פרשת זכור',
  'פרשת פרה',
  'פרשת החודש',
  // פורים
  'פורים',
  'שושן פורים',
  'פורים קטן',
  // פסח
  'פסח - ליל הסדר',
  'פסח - יום א׳',
  'פסח - חול המועד',
  'שביעי של פסח',
  // ספירת העומר וימים מיוחדים
  'יום השואה',
  'יום הזיכרון',
  'יום העצמאות',
  'ל"ג בעומר',
  'יום ירושלים',
  // שבועות
  'שבועות - יום א׳',
  'שבועות - יום ב׳',
  // קריאות מיוחדות
  'ראש חודש',
  'שבת מברכין',
  'שבת חזון',
  'שבת נחמו',
  'שבת שובה',
  'שבת הגדול',
  'שבת שירה',
  'שבת זכור',
  // ימים מיוחדים נוספים
  'ט"ו בשבט',
  'ט"ו באב',
  // אירועים מיוחדים
  'סיום מסכת',
  'בר מצווה',
  'בריתות',
  'חתונה',
  'פדיון הבן',
  'הכנסת ספר תורה',
  'יארצייט',
  'אחר',
];

// Combined occasion types (Parasha or Holiday)
export type OccasionType = 'parasha' | 'holiday';

export const OCCASION_TYPES = {
  parasha: 'פרשה',
  holiday: 'חג/אירוע',
} as const;

// Mapping from hebcal English parasha names to Hebrew
const PARASHA_MAPPING: Record<string, string> = {
  'Bereshit': 'בראשית',
  'Noach': 'נח',
  'Lech-Lecha': 'לך לך',
  'Vayera': 'וירא',
  'Chayei Sara': 'חיי שרה',
  'Toldot': 'תולדות',
  'Vayetzei': 'ויצא',
  'Vayishlach': 'וישלח',
  'Vayeshev': 'וישב',
  'Miketz': 'מקץ',
  'Vayigash': 'ויגש',
  'Vayechi': 'ויחי',
  'Shemot': 'שמות',
  'Vaera': 'וארא',
  'Bo': 'בא',
  'Beshalach': 'בשלח',
  'Yitro': 'יתרו',
  'Mishpatim': 'משפטים',
  'Terumah': 'תרומה',
  'Tetzaveh': 'תצוה',
  'Ki Tisa': 'כי תשא',
  'Vayakhel': 'ויקהל',
  'Pekudei': 'פקודי',
  'Vayikra': 'ויקרא',
  'Tzav': 'צו',
  'Shmini': 'שמיני',
  'Tazria': 'תזריע',
  'Metzora': 'מצורע',
  'Achrei Mot': 'אחרי מות',
  'Kedoshim': 'קדושים',
  'Emor': 'אמור',
  'Behar': 'בהר',
  'Bechukotai': 'בחוקותי',
  'Bamidbar': 'במדבר',
  'Nasso': 'נשא',
  "Beha'alotcha": 'בהעלותך',
  'Sh\'lach': 'שלח',
  'Korach': 'קרח',
  'Chukat': 'חקת',
  'Balak': 'בלק',
  'Pinchas': 'פינחס',
  'Matot': 'מטות',
  'Masei': 'מסעי',
  'Devarim': 'דברים',
  'Vaetchanan': 'ואתחנן',
  'Eikev': 'עקב',
  'Re\'eh': 'ראה',
  'Shoftim': 'שופטים',
  'Ki Teitzei': 'כי תצא',
  'Ki Tavo': 'כי תבוא',
  'Nitzavim': 'ניצבים',
  'Vayeilech': 'וילך',
  'Ha\'azinu': 'האזינו',
  'Vezot Haberakhah': 'וזאת הברכה',
  // Combined parshiyot
  'Vayakhel-Pekudei': 'ויקהל-פקודי',
  'Tazria-Metzora': 'תזריע-מצורע',
  'Achrei Mot-Kedoshim': 'אחרי מות-קדושים',
  'Behar-Bechukotai': 'בהר-בחוקותי',
  'Chukat-Balak': 'חקת-בלק',
  'Matot-Masei': 'מטות-מסעי',
  'Nitzavim-Vayeilech': 'ניצבים-וילך',
};

export const ALIYA_TYPES = {
  kohen: 'כהן',
  levi: 'לוי',
  shlishi: 'שלישי',
  revii: 'רביעי',
  chamishi: 'חמישי',
  shishi: 'שישי',
  shvii: 'שביעי',
  maftir: 'מפטיר',
  hagbaha: 'הגבהה',
  glila: 'גלילה',
  general: 'כללי',
} as const;

export const ALIYA_STATUS = {
  pending: 'ממתין לתשלום',
  paid: 'שולם',
  waived: 'וויתור',
} as const;

export const PAYMENT_METHOD = {
  bit: 'ביט',
  cash: 'מזומן',
  check: 'צ׳ק',
  bank_transfer: 'העברה בנקאית',
} as const;

export const PAYMENT_STATUS = {
  pending: 'ממתין',
  confirmed: 'אושר',
} as const;

export const USER_ROLES = {
  admin: 'מנהל',
  gabai: 'גבאי',
  viewer: 'צופה',
} as const;

// Hebrew months
export const HEBREW_MONTHS = [
  { value: 1, label: 'תשרי' },
  { value: 2, label: 'חשון' },
  { value: 3, label: 'כסלו' },
  { value: 4, label: 'טבת' },
  { value: 5, label: 'שבט' },
  { value: 6, label: 'אדר' },
  { value: 7, label: 'אדר ב׳' },
  { value: 8, label: 'ניסן' },
  { value: 9, label: 'אייר' },
  { value: 10, label: 'סיון' },
  { value: 11, label: 'תמוז' },
  { value: 12, label: 'אב' },
  { value: 13, label: 'אלול' },
];

const hebrewMonths = [
  'תשרי', 'חשון', 'כסלו', 'טבת', 'שבט', 'אדר',
  'ניסן', 'אייר', 'סיון', 'תמוז', 'אב', 'אלול'
];

// Mashiv Haruach / Morid Hatal calculation
// Mashiv haruach umorid hageshem: from Musaf of Shemini Atzeret (22 Tishrei) until Musaf of 1st day of Pesach (15 Nisan)
// Morid hatal: rest of the year
export function getMashivHaruach(date: Date = new Date()): { text: string; isGeshem: boolean } {
  const hdate = new HDate(date);
  const month = hdate.getMonth(); // hebcal: 7=Tishrei, 8=Cheshvan... 1=Nisan
  const day = hdate.getDate();
  
  // Geshem period: 22 Tishrei (Shemini Atzeret) to 14 Nisan
  // Month 7 = Tishrei, 1 = Nisan in hebcal
  const isGeshem = (() => {
    if (month === 7) return day >= 22; // From 22 Tishrei
    if (month >= 8 && month <= 13) return true; // Cheshvan through Adar
    if (month === 1) return day < 15; // Until 14 Nisan
    return false;
  })();
  
  return {
    text: isGeshem ? 'משיב הרוח ומוריד הגשם' : 'מוריד הטל',
    isGeshem,
  };
}

// Check if today is Rosh Chodesh
export function getRoshChodesh(date: Date = new Date()): string | null {
  const hdate = new HDate(date);
  const day = hdate.getDate();
  
  const monthNames: Record<number, string> = {
    1: 'ניסן', 2: 'אייר', 3: 'סיוון', 4: 'תמוז', 5: 'אב', 6: 'אלול',
    7: 'תשרי', 8: 'חשוון', 9: 'כסלו', 10: 'טבת', 11: 'שבט', 12: 'אדר', 13: 'אדר ב׳',
  };
  
  if (day === 1) {
    return `ראש חודש ${monthNames[hdate.getMonth()] || ''}`;
  }
  if (day === 30) {
    const nextMonth = new HDate(hdate.abs() + 1);
    return `ראש חודש ${monthNames[nextMonth.getMonth()] || ''}`;
  }
  return null;
}

// Check if tomorrow is Rosh Chodesh (Erev Rosh Chodesh / Yom Kippur Katan)
// Yom Kippur Katan is observed on Erev Rosh Chodesh (day before RC)
// Not observed before Tishrei (month 7) or Cheshvan (month 8)
export function getErevRoshChodesh(date: Date = new Date()): string | null {
  const hdate = new HDate(date);
  const day = hdate.getDate();
  const month = hdate.getMonth();
  
  const monthNames: Record<number, string> = {
    1: 'ניסן', 2: 'אייר', 3: 'סיוון', 4: 'תמוז', 5: 'אב', 6: 'אלול',
    7: 'תשרי', 8: 'חשוון', 9: 'כסלו', 10: 'טבת', 11: 'שבט', 12: 'אדר', 13: 'אדר ב׳',
  };
  
  // Check if tomorrow is 1st of month (meaning today is erev RC)
  const tomorrow = new HDate(hdate.abs() + 1);
  if (tomorrow.getDate() === 1) {
    const nextMonth = tomorrow.getMonth();
    // Skip before Tishrei and Cheshvan for Yom Kippur Katan
    if (nextMonth === 7 || nextMonth === 8) return null;
    return `ערב ר״ח ${monthNames[nextMonth] || ''} (יום כיפור קטן)`;
  }
  
  // Day 29 of a 30-day month: tomorrow is day 30 which is already RC day 1
  // So day 29 is Erev RC only in a 29-day month. The above check handles it.
  return null;
}

// Sefirat HaOmer calculation
// Counted from the night of 16 Nisan (after sunset on 15 Nisan) for 49 days
// The Omer is always counted at night (Ma'ariv), so after sunset we use the next Hebrew day
export function getSefiratHaOmer(date: Date = new Date()): string | null {
  // After sunset (~18:30 in Israel), the Hebrew day advances
  // Use a simple heuristic: after 18:00 local time, use tomorrow's Hebrew date
  const hour = date.getHours();
  let hdate = new HDate(date);
  if (hour >= 18) {
    // Advance to next Hebrew day (sunset has passed)
    hdate = new HDate(hdate.abs() + 1);
  }
  
  const month = hdate.getMonth(); // 1=Nisan
  const day = hdate.getDate();
  
  // Omer is counted from 16 Nisan to 5 Sivan (49 days)
  let omerDay = 0;
  
  if (month === 1) { // Nisan
    if (day >= 16) omerDay = day - 15;
  } else if (month === 2) { // Iyyar
    omerDay = 15 + day; // 15 days of Nisan (16-30) + Iyyar days
  } else if (month === 3) { // Sivan
    if (day <= 5) omerDay = 44 + day; // 15 + 29 + day
  }
  
  if (omerDay < 1 || omerDay > 49) return null;
  
  const weeks = Math.floor(omerDay / 7);
  const days = omerDay % 7;
  
  let label = `ספירת העומר: יום ${omerDay}`;
  if (weeks > 0 && days === 0) {
    label += ` (${weeks} שבועות)`;
  } else if (weeks > 0) {
    label += ` (${weeks} שבועות ו-${days} ימים)`;
  }
  
  return label;
}

// Birkat HaLevana calculation
// Can be said from 3 days after the Molad until the 15th of the Hebrew month
export function getBirkatHalevana(date: Date = new Date()): string | null {
  const hdate = new HDate(date);
  const day = hdate.getDate();
  
  // Birkat HaLevana is said from ~3rd to ~15th of each Hebrew month
  if (day >= 3 && day <= 14) {
    return `ברכת הלבנה (עד ט״ו בחודש)`;
  }
  return null;
}

// Birkat Hashanim calculation
// In Israel: "Tal Umatar" is said from 7 Cheshvan until Pesach (15 Nisan)
// hebcal months: NISAN=1, IYYAR=2, SIVAN=3, TAMUZ=4, AV=5, ELUL=6, TISHREI=7, CHESHVAN=8, KISLEV=9, TEVET=10, SHVAT=11, ADAR=12, ADAR_II=13
export function getBirkatHashanim(date: Date = new Date()): { text: string; isTalUmatar: boolean } {
  const hdate = new HDate(date);
  const month = hdate.getMonth();
  const day = hdate.getDate();
  
  // Tal Umatar: 7 Cheshvan (month 8) to 14 Nisan (month 1)
  const isTalUmatarPeriod = (() => {
    if (month === 8) return day >= 7; // From 7 Cheshvan
    if (month >= 9 && month <= 13) return true; // Kislev through Adar II
    if (month === 1) return day < 15; // Until 14 Nisan
    return false; // Nisan 15+ through Tishrei 
  })();
  
  return {
    text: isTalUmatarPeriod ? 'ותן טל ומטר לברכה' : 'ותן ברכה',
    isTalUmatar: isTalUmatarPeriod,
  };
}

// Check if today is Shabbat
export function isShabbat(date: Date = new Date()): boolean {
  return date.getDay() === 6;
}

// Check if today is Friday
export function isFriday(date: Date = new Date()): boolean {
  return date.getDay() === 5;
}

// Hebrew days of week
const hebrewDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

// Convert Gregorian date to Hebrew date using hebcal
export function getHebrewDate(date: Date): string {
  const hdate = new HDate(date);
  return hdate.renderGematriya();
}

export function getHebrewDayOfWeek(date: Date): string {
  return hebrewDays[date.getDay()];
}

// Get next Shabbat date
export function getNextShabbat(from: Date = new Date()): Date {
  const result = new Date(from);
  const dayOfWeek = result.getDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
  result.setDate(result.getDate() + daysUntilSaturday);
  return result;
}

// Get parasha for a specific date (returns the parasha for that week's Shabbat)
export function getParashaForDate(date: Date): string {
  // Use this Shabbat if today is Saturday, otherwise the upcoming Shabbat
  const shabbat = new Date(date);
  const daysUntilSaturday = (6 - shabbat.getDay() + 7) % 7;
  shabbat.setDate(shabbat.getDate() + daysUntilSaturday);
  const hdate = new HDate(shabbat);
  
  // Create Sedra object for Israel (false = diaspora, true = Israel)
  const sedra = new Sedra(hdate.getFullYear(), true);
  const parsha = sedra.lookup(hdate);
  
  if (parsha.chag) {
    // It's a holiday, return the holiday name or fallback
    return 'חג';
  }
  
  // Get the parasha name(s) and convert to Hebrew
  const parshaNames = parsha.parsha;
  if (parshaNames.length === 0) {
    return 'חג';
  }
  
  // Handle combined parshiyot
  const englishName = parshaNames.join('-');
  return PARASHA_MAPPING[englishName] || englishName;
}

// Get current week's parasha (for current Shabbat)
export function getCurrentParasha(): string {
  return getParashaForDate(new Date());
}

// Detect occasion for a given date - returns parasha name for Shabbat, holiday name for holidays
export interface DateOccasion {
  type: 'shabbat' | 'holiday' | 'shabbat_holiday' | 'none';
  name: string;
  label: string; // display label like "פרשת X" or "חג X"
}

export function getOccasionForDate(date: Date): DateOccasion {
  const isSat = date.getDay() === 6;
  
  // Check for holidays using hebcal
  const hdate = new HDate(date);
  const events = HebrewCalendar.getHolidaysOnDate(hdate, true); // true = Israel
  
  // Filter to significant holidays
  const significantHoliday = events?.find((ev: any) => {
    const f = ev.getFlags();
    return (f & flags.CHAG) || (f & flags.MAJOR_FAST) || (f & flags.MINOR_FAST) ||
           (f & flags.MODERN_HOLIDAY) || (f & flags.SPECIAL_SHABBAT) ||
           (f & flags.ROSH_CHODESH) || (f & flags.MINOR_HOLIDAY);
  });
  
  // Comprehensive Hebrew holiday name mapping
  const HOLIDAY_HEBREW: Record<string, string> = {
    // ימים נוראים
    'Rosh Hashana': 'ראש השנה',
    'Rosh Hashana I': 'ראש השנה א׳',
    'Rosh Hashana II': 'ראש השנה ב׳',
    'Yom Kippur': 'יום כיפור',
    'Erev Yom Kippur': 'ערב יום כיפור',
    'Erev Rosh Hashana': 'ערב ראש השנה',
    // סוכות
    'Erev Sukkot': 'ערב סוכות',
    'Sukkot I': 'סוכות א׳',
    'Sukkot II': 'סוכות ב׳',
    'Sukkot III (CH\'\'M)': 'חול המועד סוכות',
    'Sukkot IV (CH\'\'M)': 'חול המועד סוכות',
    'Sukkot V (CH\'\'M)': 'חול המועד סוכות',
    'Sukkot VI (CH\'\'M)': 'חול המועד סוכות',
    'Sukkot VII (Hoshana Raba)': 'הושענא רבה',
    'Shmini Atzeret': 'שמיני עצרת',
    'Simchat Torah': 'שמחת תורה',
    // פסח
    'Erev Pesach': 'ערב פסח',
    'Pesach': 'פסח',
    'Pesach I': 'פסח א׳',
    'Pesach II': 'פסח ב׳',
    'Pesach II (CH\'\'M)': 'חול המועד פסח',
    'Pesach III (CH\'\'M)': 'חול המועד פסח',
    'Pesach IV (CH\'\'M)': 'חול המועד פסח',
    'Pesach V (CH\'\'M)': 'חול המועד פסח',
    'Pesach VI (CH\'\'M)': 'חול המועד פסח',
    'Pesach VII': 'שביעי של פסח',
    'Pesach Sheni': 'פסח שני',
    // שבועות
    'Erev Shavuot': 'ערב שבועות',
    'Shavuot': 'שבועות',
    'Shavuot I': 'שבועות',
    'Shavuot II': 'שבועות ב׳',
    // חנוכה
    'Chanukah: 1 Candle': 'חנוכה - נר א׳',
    'Chanukah: 2 Candles': 'חנוכה - נר ב׳',
    'Chanukah: 3 Candles': 'חנוכה - נר ג׳',
    'Chanukah: 4 Candles': 'חנוכה - נר ד׳',
    'Chanukah: 5 Candles': 'חנוכה - נר ה׳',
    'Chanukah: 6 Candles': 'חנוכה - נר ו׳',
    'Chanukah: 7 Candles': 'חנוכה - נר ז׳',
    'Chanukah: 8 Candles': 'חנוכה - נר ח׳',
    'Chanukah: 8th Day': 'זאת חנוכה',
    // פורים
    'Purim': 'פורים',
    'Shushan Purim': 'שושן פורים',
    'Purim Katan': 'פורים קטן',
    // צומות
    'Tzom Gedaliah': 'צום גדליה',
    'Asara B\'Tevet': 'צום י׳ בטבת',
    'Ta\'anit Esther': 'תענית אסתר',
    'Ta\'anit Bechorot': 'תענית בכורות',
    'Tzom Tammuz': 'צום י״ז בתמוז',
    'Tish\'a B\'Av': 'תשעה באב',
    // ימים מיוחדים
    'Yom HaShoah': 'יום השואה',
    'Yom HaZikaron': 'יום הזיכרון',
    'Yom HaAtzma\'ut': 'יום העצמאות',
    'Yom Yerushalayim': 'יום ירושלים',
    'Lag BaOmer': 'ל״ג בעומר',
    'Tu BiShvat': 'ט״ו בשבט',
    'Tu B\'Av': 'ט״ו באב',
    'Leil Selichot': 'ליל סליחות',
    // ראש חודש
    'Rosh Chodesh Nisan': 'ראש חודש ניסן',
    'Rosh Chodesh Iyyar': 'ראש חודש אייר',
    'Rosh Chodesh Sivan': 'ראש חודש סיוון',
    'Rosh Chodesh Tamuz': 'ראש חודש תמוז',
    'Rosh Chodesh Av': 'ראש חודש אב',
    'Rosh Chodesh Elul': 'ראש חודש אלול',
    'Rosh Chodesh Cheshvan': 'ראש חודש חשוון',
    'Rosh Chodesh Kislev': 'ראש חודש כסלו',
    'Rosh Chodesh Tevet': 'ראש חודש טבת',
    'Rosh Chodesh Sh\'vat': 'ראש חודש שבט',
    'Rosh Chodesh Adar': 'ראש חודש אדר',
    'Rosh Chodesh Adar I': 'ראש חודש אדר א׳',
    'Rosh Chodesh Adar II': 'ראש חודש אדר ב׳',
    // שבתות מיוחדות
    'Shabbat Shekalim': 'שבת שקלים',
    'Shabbat Zachor': 'שבת זכור',
    'Shabbat Parah': 'שבת פרה',
    'Shabbat HaChodesh': 'שבת החודש',
    'Shabbat HaGadol': 'שבת הגדול',
    'Shabbat Chazon': 'שבת חזון',
    'Shabbat Nachamu': 'שבת נחמו',
    'Shabbat Shuva': 'שבת שובה',
    'Shabbat Shirah': 'שבת שירה',
    // יום כיפור קטן
    'Yom Kippur Katan Nisan': 'יום כיפור קטן ניסן',
    'Yom Kippur Katan Iyyar': 'יום כיפור קטן אייר',
    'Yom Kippur Katan Sivan': 'יום כיפור קטן סיוון',
    'Yom Kippur Katan Tamuz': 'יום כיפור קטן תמוז',
    'Yom Kippur Katan Av': 'יום כיפור קטן אב',
    'Yom Kippur Katan Elul': 'יום כיפור קטן אלול',
    'Yom Kippur Katan Cheshvan': 'יום כיפור קטן חשוון',
    'Yom Kippur Katan Kislev': 'יום כיפור קטן כסלו',
    'Yom Kippur Katan Tevet': 'יום כיפור קטן טבת',
    'Yom Kippur Katan Sh\'vat': 'יום כיפור קטן שבט',
    'Yom Kippur Katan Adar': 'יום כיפור קטן אדר',
    'Yom Kippur Katan Adar I': 'יום כיפור קטן אדר א׳',
    'Yom Kippur Katan Adar II': 'יום כיפור קטן אדר ב׳',
    // נוסף
    'Sigd': 'סיגד',
    'Herzl Day': 'יום הרצל',
    'Jabotinsky Day': 'יום ז׳בוטינסקי',
    'Ben-Gurion Day': 'יום בן-גוריון',
    'Rabin Day': 'יום רבין',
    'Family Day': 'יום המשפחה',
    'Yitzhak Rabin Memorial Day': 'יום הזיכרון ליצחק רבין',
    'Aliyah Day': 'יום העלייה',
  };
  
  // Generic fallback: translate common English patterns to Hebrew
  const translateToHebrew = (desc: string): string => {
    const MONTH_HEBREW: Record<string, string> = {
      'Nisan': 'ניסן', 'Iyyar': 'אייר', 'Sivan': 'סיוון', 'Tamuz': 'תמוז',
      'Av': 'אב', 'Elul': 'אלול', 'Tishrei': 'תשרי', 'Cheshvan': 'חשוון',
      'Kislev': 'כסלו', 'Tevet': 'טבת', 'Sh\'vat': 'שבט', 'Shvat': 'שבט',
      'Adar': 'אדר', 'Adar I': 'אדר א׳', 'Adar II': 'אדר ב׳',
    };
    const WORD_HEBREW: Record<string, string> = {
      'Erev': 'ערב', 'Rosh Chodesh': 'ראש חודש', 'Yom Kippur Katan': 'יום כיפור קטן',
      'Chanukah': 'חנוכה', 'Candle': 'נר', 'Candles': 'נרות', 'Day': 'יום',
    };
    let result = desc;
    // Try replacing known phrases first
    for (const [en, heb] of Object.entries(WORD_HEBREW)) {
      result = result.replace(en, heb);
    }
    for (const [en, heb] of Object.entries(MONTH_HEBREW)) {
      result = result.replace(new RegExp(`\\b${en.replace("'", "\\'")}\\b`), heb);
    }
    return result;
  };
  
  if (significantHoliday) {
    const desc = significantHoliday.getDesc();
    const hebrewName = HOLIDAY_HEBREW[desc] || translateToHebrew(desc);
    
    if (isSat) {
      // For Shabbat + holiday, try to also get parasha
      const parasha = getParashaForDate(date);
      const label = parasha !== 'חג' ? `${hebrewName} • פרשת ${parasha}` : hebrewName;
      return { type: 'shabbat_holiday', name: hebrewName, label };
    }
    return { type: 'holiday', name: hebrewName, label: hebrewName };
  }
  
  if (isSat) {
    const parasha = getParashaForDate(date);
    return { type: 'shabbat', name: parasha, label: `פרשת ${parasha}` };
  }
  
  return { type: 'none', name: '', label: '' };
}

// Get upcoming dates with aliyot (Shabbatot and holidays) for the next N days
export function getUpcomingOccasions(fromDate: Date = new Date(), days: number = 90): Array<{ date: Date; occasion: DateOccasion }> {
  const results: Array<{ date: Date; occasion: DateOccasion }> = [];
  
  for (let i = 0; i < days; i++) {
    const d = new Date(fromDate);
    d.setDate(d.getDate() + i);
    const occasion = getOccasionForDate(d);
    if (occasion.type !== 'none') {
      results.push({ date: d, occasion });
    }
  }
  
  return results;
}

// Format currency in Shekels
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format date for display
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('he-IL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

// Format short date
export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

// Generate Bit payment link (placeholder - would use actual Bit deep link)
export function generateBitPaymentLink(amount: number, description: string): string {
  return `https://www.bitpay.co.il/app?amount=${amount}&description=${encodeURIComponent(description)}`;
}
