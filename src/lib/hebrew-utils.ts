// Hebrew date and parasha utilities

export const PARASHA_LIST = [
  'בראשית', 'נח', 'לך לך', 'וירא', 'חיי שרה', 'תולדות', 'ויצא', 'וישלח', 'וישב', 'מקץ',
  'ויגש', 'ויחי', 'שמות', 'וארא', 'בא', 'בשלח', 'יתרו', 'משפטים', 'תרומה', 'תצוה',
  'כי תשא', 'ויקהל', 'פקודי', 'ויקרא', 'צו', 'שמיני', 'תזריע', 'מצורע', 'אחרי מות', 'קדושים',
  'אמור', 'בהר', 'בחוקותי', 'במדבר', 'נשא', 'בהעלותך', 'שלח', 'קרח', 'חקת', 'בלק',
  'פינחס', 'מטות', 'מסעי', 'דברים', 'ואתחנן', 'עקב', 'ראה', 'שופטים', 'כי תצא', 'כי תבוא',
  'ניצבים', 'וילך', 'האזינו', 'וזאת הברכה'
];

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
const hebrewMonths = [
  'תשרי', 'חשון', 'כסלו', 'טבת', 'שבט', 'אדר',
  'ניסן', 'אייר', 'סיון', 'תמוז', 'אב', 'אלול'
];

// Hebrew days of week
const hebrewDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

// Simple Gregorian to Hebrew date converter (approximate)
export function getHebrewDate(date: Date): string {
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();
  
  // This is a simplified approximation
  const hebrewYear = year + 3760;
  const hebrewMonth = hebrewMonths[(month + 6) % 12];
  
  return `${day} ${hebrewMonth} ${hebrewYear}`;
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

// Get current parasha (simplified - in real app would use hebcal API)
export function getCurrentParasha(): string {
  const weekOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  return PARASHA_LIST[weekOfYear % PARASHA_LIST.length];
}

// Generate Bit payment link (placeholder - would use actual Bit deep link)
export function generateBitPaymentLink(amount: number, description: string): string {
  return `https://www.bitpay.co.il/app?amount=${amount}&description=${encodeURIComponent(description)}`;
}
