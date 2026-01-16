// Hebrew date and parasha utilities
import { HDate, Sedra, ParshaEvent } from '@hebcal/core';

// Parasha list for reference and display
export const PARASHA_LIST = [
  'בראשית', 'נח', 'לך לך', 'וירא', 'חיי שרה', 'תולדות', 'ויצא', 'וישלח', 'וישב', 'מקץ',
  'ויגש', 'ויחי', 'שמות', 'וארא', 'בא', 'בשלח', 'יתרו', 'משפטים', 'תרומה', 'תצוה',
  'כי תשא', 'ויקהל', 'פקודי', 'ויקרא', 'צו', 'שמיני', 'תזריע', 'מצורע', 'אחרי מות', 'קדושים',
  'אמור', 'בהר', 'בחוקותי', 'במדבר', 'נשא', 'בהעלותך', 'שלח', 'קרח', 'חקת', 'בלק',
  'פינחס', 'מטות', 'מסעי', 'דברים', 'ואתחנן', 'עקב', 'ראה', 'שופטים', 'כי תצא', 'כי תבוא',
  'ניצבים', 'וילך', 'האזינו', 'וזאת הברכה'
];

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
