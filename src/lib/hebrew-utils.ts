// Hebrew date and parasha utilities
import { HDate, Sedra, Location, Zmanim } from '@hebcal/core';

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
  'ראש השנה',
  'צום גדליה',
  'יום כיפור',
  'סוכות',
  'שמיני עצרת',
  'שמחת תורה',
  'חנוכה',
  'צום עשרה בטבת',
  'ט"ו בשבט',
  'תענית אסתר',
  'פורים',
  'פסח',
  'שביעי של פסח',
  'יום השואה',
  'יום הזיכרון',
  'יום העצמאות',
  'ל"ג בעומר',
  'יום ירושלים',
  'שבועות',
  'צום י"ז בתמוז',
  'תשעה באב',
  'ט"ו באב',
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
} as const;

export const ALIYA_STATUS = {
  pending: 'ממתין לתשלום',
  paid: 'שולם',
  waived: 'וויתור',
} as const;

export const PAYMENT_METHOD = {
  bit: 'ביט',
  cash: 'מזומן',
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

// Birkat Hashanim calculation
// In Israel: "Tal Umatar" is said from 7 Cheshvan
// "Vetein Bracha" is said the rest of the year
export function getBirkatHashanim(date: Date = new Date()): { text: string; isTalUmatar: boolean } {
  const hdate = new HDate(date);
  const hebrewMonth = hdate.getMonth(); // 1 = Tishrei, 2 = Cheshvan, etc.
  const hebrewDay = hdate.getDate();
  
  // In Israel: Tal Umatar starts on 7 Cheshvan (month 2, day 7)
  // and continues until Pesach (15 Nisan, month 8)
  const isAfter7Cheshvan = hebrewMonth > 2 || (hebrewMonth === 2 && hebrewDay >= 7);
  const isBeforePesach = hebrewMonth < 8 || (hebrewMonth === 8 && hebrewDay < 15);
  
  // Tal Umatar period: from 7 Cheshvan to 14 Nisan
  // This covers months 2-7 (Cheshvan to Adar II) plus beginning of Nisan
  const isTalUmatar = (hebrewMonth >= 2 && hebrewMonth <= 7) 
    ? (hebrewMonth === 2 ? hebrewDay >= 7 : true)
    : (hebrewMonth === 8 && hebrewDay < 15);
  
  // Simpler logic: 7 Cheshvan to 14 Nisan
  const isTalUmatarPeriod = (() => {
    if (hebrewMonth === 2) return hebrewDay >= 7; // From 7 Cheshvan
    if (hebrewMonth > 2 && hebrewMonth < 8) return true; // Kislev through Adar
    if (hebrewMonth === 8) return hebrewDay < 15; // Until 14 Nisan
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
  // Get the Shabbat for this week
  const shabbat = getNextShabbat(date);
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
