export interface DailyQuote {
  text: string;
  source: string;
}

export const DAILY_QUOTES: DailyQuote[] = [
  { text: "טוב להודות לה' ולזמר לשמך עליון", source: "תהילים צ\"ב" },
  { text: "שיויתי ה' לנגדי תמיד כי מימיני בל אמוט", source: "תהילים ט\"ז" },
  { text: "אם אשכחך ירושלים תשכח ימיני", source: "תהילים קל\"ז" },
  { text: "יהי כבוד ה' לעולם ישמח ה' במעשיו", source: "תהילים ק\"ד" },
  { text: "כל העולם כולו גשר צר מאוד, והעיקר לא לפחד כלל", source: "רבי נחמן מברסלב" },
  { text: "מצוה גדולה להיות בשמחה תמיד", source: "רבי נחמן מברסלב" },
  { text: "אין עוד מלבדו", source: "דברים ד', ל\"ה" },
  { text: "ואהבת לרעך כמוך", source: "ויקרא י\"ט, י\"ח" },
  { text: "איזהו חכם? הלומד מכל אדם", source: "מסכת אבות ד', א'" },
  { text: "איזהו גיבור? הכובש את יצרו", source: "מסכת אבות ד', א'" },
  { text: "איזהו עשיר? השמח בחלקו", source: "מסכת אבות ד', א'" },
  { text: "הדן את כל האדם לכף זכות, דנין אותו מן השמיים לכף זכות", source: "מסכת שבת קכ\"ז" },
  { text: "לא עליך המלאכה לגמור, ולא אתה בן חורין ליבטל ממנה", source: "מסכת אבות ב', ט\"ז" },
  { text: "במקום שאין אנשים, השתדל להיות איש", source: "מסכת אבות ב', ה'" },
  { text: "סור מרע ועשה טוב, בקש שלום ורודפהו", source: "תהילים ל\"ד, ט\"ו" },
  { text: "לב טהור ברא לי אלוהים ורוח נכון חדש בקרבי", source: "תהילים נ\"א" },
  { text: "אשרי אדם עוז לו בך מסילות בלבבם", source: "תהילים פ\"ד" },
  { text: "קרוב ה' לכל קוראיו לכל אשר יקראוהו באמת", source: "תהילים קמ\"ה" },
  { text: "דע מה למעלה ממך, עין רואה ואוזן שומעת וכל מעשיך בספר נכתבים", source: "מסכת אבות ב', א'" },
  { text: "עשה לך רב וקנה לך חבר והוי דן את כל האדם לכף זכות", source: "מסכת אבות א', ו'" }
];

export function getDailyQuote(): DailyQuote {
  // Use the current date to select a deterministic quote for the day
  // Days since epoch
  const epochDays = Math.floor(new Date().getTime() / (1000 * 60 * 60 * 24));
  const index = epochDays % DAILY_QUOTES.length;
  return DAILY_QUOTES[index];
}
