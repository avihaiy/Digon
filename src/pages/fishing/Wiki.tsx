import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Fish, AlertTriangle, CheckCircle, Search, Waves, Droplet, Skull } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type Habitat = "sea" | "freshwater";

export interface FishData {
  id: string;
  name: string;
  image?: string;
  season: string;
  methods: string[];
  baits: string[];
  kosher: boolean;
  danger: string | null;
  desc: string;
  habitat: Habitat;
}

const FISH_DB: FishData[] = [
  // Sea Fish
  {
    id: "locus",
    name: "לוקוס לבן (דקר)",
    season: "אביב - קיץ",
    methods: ["ז'רז'ור", "פיתיון", "סירה"],
    baits: ["קלמארי", "סבידה", "דגים חיים"],
    kosher: true,
    danger: null,
    desc: "דג טורף הנחשב לאחד ממשובחי הים התיכון. נמצא לרוב בקרבת סלעים ושוברי גלים.",
    habitat: "sea"
  },
  {
    id: "denis",
    name: "דניס (צ'יפורה)",
    season: "סתיו - חורף",
    methods: ["פיתיון חוף", "בוס"],
    baits: ["תולעים", "גמברי", "בצק מסריח"],
    kosher: true,
    danger: null,
    desc: "דג פופולרי מאוד, פעיל בעיקר בקרקע חולית או מעורבת. נלחם יפה בחכה.",
    habitat: "sea"
  },
  {
    id: "sargus",
    name: "סרגוס (ספרוס)",
    season: "כל השנה (במיוחד חורף)",
    methods: ["בוס", "פיתיון חוף"],
    baits: ["בצק", "גמברי", "תולעים"],
    kosher: true,
    danger: null,
    desc: "דג חוף טיפוסי שאוהב ים גלי. מסתובב בלהקות ונמצא כמעט בכל נקודה סלעית.",
    habitat: "sea"
  },
  {
    id: "aras",
    name: "ארס (סיכן)",
    season: "קיץ - סתיו",
    methods: ["בוס"],
    baits: ["בצק", "אצות"],
    kosher: true,
    danger: "קוצים ארסיים סנפיר גב - עקיצה כואבת מאוד!",
    desc: "פולש מים סוף. דג צמחוני וטעים מאוד, אך דורש זהירות רבה בניקוי בשל הקוצים הארסיים שלו.",
    habitat: "sea"
  },
  {
    id: "avo-nafha",
    name: "אבו נפחא (לגינון)",
    season: "כל השנה",
    methods: ["נתפס בטעות בכל השיטות"],
    baits: ["הכל"],
    kosher: false,
    danger: "רעיל ביותר! סכנת מוות באכילה. חותך קרסים בקלות.",
    desc: "מין פולש ומסוכן ביותר. מכיל רעל קטלני (טטרודוטוקסין). אסור למגע ואסור למאכל בשום צורה.",
    habitat: "sea"
  },
  {
    id: "intias",
    name: "אנטיאס (שולה)",
    season: "סתיו - חורף",
    methods: ["ז'רז'ור כבד", "פיתיון חי", "סירה"],
    baits: ["סבידה חיה", "בורי חי", "דמויים גדולים"],
    kosher: true,
    danger: null,
    desc: "מלך הים התיכון. דג חזק מאוד המגיע למשקלים של עשרות קילוגרמים. נותן פייט בלתי נשכח.",
    habitat: "sea"
  },
  {
    id: "palamida",
    name: "פלמידה (טונית אטלנטית)",
    season: "אביב - קיץ",
    methods: ["ז'רז'ור", "טרולינג (סירה)"],
    baits: ["ג'יגים", "דמויים", "ניקלים"],
    kosher: true,
    danger: null,
    desc: "דג מהיר מאוד שזז בלהקות. בשרו כהה ומתאים מאוד לסשימי או בישול. נלחם בעוצמה רבה.",
    habitat: "sea"
  },
  {
    id: "marmir",
    name: "מרמיר (שישן)",
    season: "קיץ - סתיו",
    methods: ["פיתיון חוף"],
    baits: ["תולעים", "שניצל", "גמברי"],
    kosher: true,
    danger: null,
    desc: "דג חוף קלאסי שאוהב קרקע חולית. מאופיין בפסים לאורך גופו, נתפס הרבה בדיג פיתיונות קל.",
    habitat: "sea"
  },
  {
    id: "gombar",
    name: "גומבר (Bluefish)",
    season: "קיץ - סתיו",
    methods: ["ז'רז'ור", "פיתיון חי"],
    baits: ["טופ-ווטר", "פופרים", "בורי חי"],
    kosher: true,
    danger: "שיניים חדות כתער! יכול לכרות אצבע. חובה להשתמש בפלאייר.",
    desc: "מכונת רצח אכזרית! טורף תוקפני במיוחד שלרוב קורע חוטים רגילים. אוהב לרדוף אחרי פיתיונות קופצים על פני המים.",
    habitat: "sea"
  },
  {
    id: "barracuda",
    name: "מליטה (ברקודה)",
    season: "סתיו - חורף",
    methods: ["ז'רז'ור", "פיתיון חי"],
    baits: ["דמויי מינו (Minnow)", "דגים קטנים"],
    kosher: true,
    danger: "שיניים חדות.",
    desc: "טורף בעל מבנה גוף דמוי טורפדו שמסתובב בלהקות, לרוב בשעות הלילה ומוקדם בבוקר ליד שוברי גלים.",
    habitat: "sea"
  },
  {
    id: "tarchon",
    name: "טרכון (Trevally)",
    season: "אביב - סתיו",
    methods: ["ז'רז'ור", "סירה"],
    baits: ["ג'יגים קטנים", "סיליקונים"],
    kosher: true,
    danger: null,
    desc: "לוחם מדהים ביחס לגודלו. שייך למשפחת הטרוליים וחי באזורי זרמים ושוברי גלים. מעולה לז'רז'ור קל.",
    habitat: "sea"
  },
  {
    id: "labrak",
    name: "לברק (Sea Bass)",
    season: "חורף",
    methods: ["ז'רז'ור", "פיתיון חי"],
    baits: ["סיליקונים", "דמויים קטנים", "בורי קטן"],
    kosher: true,
    danger: null,
    desc: "טורף כסוף ואלגנטי שאוהב מים גליים ומוקצפים. נחשב לדג איכותי מאוד למאכל.",
    habitat: "sea"
  },
  {
    id: "musar",
    name: "מוסר (Meagre)",
    season: "כל השנה",
    methods: ["ז'רז'ור כבד", "סירה"],
    baits: ["ג'יגים", "דמויים גדולים", "פיתיון חי"],
    kosher: true,
    danger: null,
    desc: "דג ענק וכסוף ממשפחת המסריים. יכול להגיע למשקלים של מעל 20 קילו. חי באזורים עמוקים.",
    habitat: "sea"
  },
  {
    id: "farida",
    name: "פרידה (Pagrus)",
    season: "כל השנה",
    methods: ["סירה", "ג'יגינג"],
    baits: ["קלמארי", "ג'יגים איטיים"],
    kosher: true,
    danger: null,
    desc: "דג אדמדם וחזק שחי בעומק. פייט מצוין ובשר משובח מאוד.",
    habitat: "sea"
  },
  {
    id: "safmit",
    name: "שפמית ארסית (דג נחש)",
    season: "קיץ",
    methods: ["נתפס בטעות בפיתיונות"],
    baits: ["בשר", "תולעים"],
    kosher: false,
    danger: "סכנת חיים! עקיצה רעילה ביותר שגורמת לכאב משתק, נפיחות ומחייבת מיון. אין לגעת בשום אופן!",
    desc: "דג פולש קטן דמוי נחש עם פסים לאורך גופו. הטורף הארסי ביותר בים התיכון. חותכים את החוט וזורקים.",
    habitat: "sea"
  },
  {
    id: "calamari",
    name: "קלמארי / סבידה",
    season: "חורף - אביב",
    methods: ["ז'רז'ור מיוחד (Eging)"],
    baits: ["בובות קלמארי (Egi)"],
    kosher: false,
    danger: "דיו שחור שמלכלך בגדים לנצח.",
    desc: "רכיכות חכמות שמגיעות לחוף בחורף. משמשות גם למאכל וגם כפיתיון הכי טוב לטורפים אחרים.",
    habitat: "sea"
  },
  {
    id: "zaharon",
    name: "זהרון (Lionfish)",
    season: "כל השנה",
    methods: ["צלילה", "פיתיון"],
    baits: ["דגים קטנים"],
    kosher: true,
    danger: "קוצים ארסיים ביותר בכל הסנפירים - עקיצה כואבת ברמות קיצוניות.",
    desc: "דג יפהפה אך פולש מסוכן מאוד. משמיד אוכלוסיות שלמות של דגים קטנים בשונית.",
    habitat: "sea"
  },

  // Freshwater Fish
  {
    id: "buri",
    name: "בורי (קיפון)",
    season: "כל השנה",
    methods: ["בוס", "רשת"],
    baits: ["בצק מסריח", "פיתה"],
    kosher: true,
    danger: null,
    desc: "דג צמחוני הנמצא גם בים וגם בנחלים גדולים (כמו נחל אלכסנדר והירקון).",
    habitat: "freshwater"
  },
  {
    id: "musht",
    name: "מושט / אמנון (Tilapia)",
    season: "אביב - קיץ",
    methods: ["בוס", "ז'רז'ור קל"],
    baits: ["תירס", "בצק", "תולעים", "ספינרים קטנים"],
    kosher: true,
    danger: "סנפיר גב קוצני - יש לאחוז בזהירות.",
    desc: "הדג המוכר ביותר בכנרת! חי בלהקות באזורי חוף וצמחיה. דג תוקפני שמספק פייט מהנה.",
    habitat: "freshwater"
  },
  {
    id: "karpion",
    name: "קרפיון (Carp)",
    season: "אביב - סתיו",
    methods: ["פיתיון (Carp Fishing)"],
    baits: ["בויליס", "בצק", "תירס"],
    kosher: true,
    danger: null,
    desc: "מלך המים המתוקים ולרוב הגדול מכולם. דורש סבלנות רבה וציוד ייעודי. נמצא בכנרת ובאגמים.",
    habitat: "freshwater"
  },
  {
    id: "barbus",
    name: "בינית / שרבוט (Barbus)",
    season: "אביב - קיץ",
    methods: ["בוס", "ז'רז'ור"],
    baits: ["תירס", "כפיות (Spoons)"],
    kosher: true,
    danger: null,
    desc: "דג חזק ומהיר החי בנחלים זורמים ובכנרת. תוקף פיתיונות מלאכותיים.",
    habitat: "freshwater"
  },
  {
    id: "catfish",
    name: "שפמנון (Catfish)",
    season: "קיץ (במיוחד בלילה)",
    methods: ["פיתיון בשרי"],
    baits: ["חלקי עוף", "נקניקייה", "דגים קטנים"],
    kosher: false,
    danger: "ריר חלקלק מאוד, ללא קשקשים.",
    desc: "טורף קרקעית המגיע לגדלים מפלצתיים במים העכורים של הכנרת ונחלים. אינו כשר למאכל.",
    habitat: "freshwater"
  },
  {
    id: "silver-carp",
    name: "כסיף (Silver Carp)",
    season: "קיץ",
    methods: ["פיתיון צף"],
    baits: ["לחם צף", "בצק מיוחד"],
    kosher: true,
    danger: null,
    desc: "דג עצום המסנן פלנקטון מהמים. לעתים קופץ מעל המים כשהוא נבהל מסירות.",
    habitat: "freshwater"
  },
  {
    id: "tzelofach",
    name: "צלופח אירופי (Eel)",
    season: "כל השנה",
    methods: ["פיתיון קרקעית"],
    baits: ["תולעים", "בשר"],
    kosher: false,
    danger: "חלקלק מאוד וקשה לתפיסה בידיים.",
    desc: "דג נדיר יחסית שחי בנחלי חוף (כמו הירקון והקישון). נודד לים כדי להתרבות.",
    habitat: "freshwater"
  },
  {
    id: "trout",
    name: "פורל / טרוטה (Trout)",
    season: "חורף - אביב",
    methods: ["ז'רז'ור קל", "Fly Fishing"],
    baits: ["ספינרים קטנים", "זבובי דיג"],
    kosher: true,
    danger: null,
    desc: "חי רק במים קרים וזורמים במיוחד, נפוץ בישראל באזור נחל הדן ובריכות גידול מיוחדות.",
    habitat: "freshwater"
  },
  // תוספות דגי ים
  {
    id: "televizia",
    name: "טלוויזיה (Whiting)",
    season: "קיץ - סתיו",
    methods: ["פיתיון חוף חלבי/קליל"],
    baits: ["תולעים", "שניצל", "גמברי קטן"],
    kosher: true,
    danger: null,
    desc: "דג חוף קטן וכסוף-שקוף שאוהב קרקע חולית ומים רדודים. נתפס בהמוניו בקיץ ונחשב למעדן אמיתי כשהוא מטוגן.",
    habitat: "sea"
  },
  {
    id: "plamida-lavana",
    name: "פלמידה לבנה (Spanish Mackerel)",
    season: "סתיו - חורף",
    methods: ["ז'רז'ור", "טרולינג", "פיתיון חי"],
    baits: ["ג'יגים מהירים", "דמויי מינו", "בורי חי"],
    kosher: true,
    danger: "שיניים חדות כתער! יש להשתמש בפלאייר להוצאת הקרס.",
    desc: "טורף ארוך, כסוף ומהיר להחריד. חותך חוטים אם לא משתמשים בכבל תיל. פייטן אדיר וטעים מאוד למאכל או סשימי.",
    habitat: "sea"
  },
  {
    id: "tona-shchora",
    name: "טונה שחורה (Little Tunny)",
    season: "אביב - קיץ",
    methods: ["ז'רז'ור כבד", "סירה", "קיאק"],
    baits: ["ג'יגים", "דמויי משקולת (Casting Jigs)"],
    kosher: true,
    danger: null,
    desc: "מכונת שרירים פלגית! שוחה בלהקות גדולות ונותנת פייט שמוציא עשן מהרולר. דורש ציוד חזק וכושר גופני.",
    habitat: "sea"
  },
  {
    id: "tamnun",
    name: "תמנון (Octopus)",
    season: "חורף",
    methods: ["ז'רז'ור אגינג (Eging)", "פיתיון מקרקעית"],
    baits: ["בובות קלמארי גדולות", "סרטנים"],
    kosher: false,
    danger: "מקור חזק מאוד במרכז הזרועות, נצמד בחוזקה ולעתים מתיז דיו.",
    desc: "יצור חכם מאוד שחי בין סלעים בקרקעית הים. יכול להיצמד לסלע ולגרום לקרע של החוט. לא כשר למאכל.",
    habitat: "sea"
  },
  {
    id: "salpa",
    name: "סולבי / סלפה (Salema)",
    season: "אביב - קיץ",
    methods: ["בוס", "פיתיון חוף"],
    baits: ["בצק מסריח", "אצות"],
    kosher: true,
    danger: null,
    desc: "דג צמחוני עם פסים צהובים לאורך גופו שניזון מאצות. נתפס הרבה כשמנסים לדוג בורי, אך בשרו פחות פופולרי בגלל תזונתו.",
    habitat: "sea"
  },
  {
    id: "lavnun",
    name: "לבנון הכנרת (Sardine)",
    season: "כל השנה",
    methods: ["בוס", "רשת (מסחרי)"],
    baits: ["בצק", "תולעים"],
    kosher: true,
    danger: null,
    desc: "דג היסטורי וסמל של הכנרת (הנקרא גם סרדין הכנרת). דג קטן החי בלהקות ענק. מעולה כפיתיון חי לדגים גדולים יותר או לטיגון עמוק.",
    habitat: "freshwater"
  },
  // 3 האחרונים למדריך השלם
  {
    id: "kachlon",
    name: "כחלון קוצני (Lichia)",
    season: "קיץ - סתיו",
    methods: ["ז'רז'ור אולטרה-לייט", "פיתיון חוף"],
    baits: ["ג'יגים קטנטנים", "תולעים"],
    kosher: true,
    danger: null,
    desc: "דג כסוף, יפהפה ושטוח שחי ממש על קו שבירת הגלים בחוף החולי. פייטן מעולה לציוד קל וטעים מאוד.",
    habitat: "sea"
  },
  {
    id: "dorado",
    name: "דוראדו / רעמתן (Mahi-Mahi)",
    season: "קיץ - סתיו",
    methods: ["ז'רז'ור סירה / קיאק", "טרולינג"],
    baits: ["דמויים טרופיים", "פיתיון חי (בורי/סבידה)"],
    kosher: true,
    danger: null,
    desc: "דג פלאגי עוצר נשימה בצבעי ירוק-צהוב זוהרים. שוחה בעומק הים קרוב לפני המים ולרוב קופץ באוויר כשנתפס.",
    habitat: "sea"
  },
  {
    id: "halilon",
    name: "חלילון (Cornetfish)",
    season: "קיץ - סתיו",
    methods: ["ז'רז'ור"],
    baits: ["דמויי מינו", "סיליקונים"],
    kosher: false,
    danger: null,
    desc: "דג פולש מים סוף שנראה כמו מקל ארוך עם חוט בזנב. תוקפני מאוד ונתפס המון בז'רז'ור למרות שאין בו הרבה בשר.",
    habitat: "sea"
  },
  // תוספות אחרונות בהחלט - דגי לוואי וסכנות נפוצות בים התיכון
  {
    id: "stingray",
    name: "חתול ים (טריגון / Stingray)",
    season: "קיץ - סתיו",
    methods: ["פיתיון חוף", "סירה"],
    baits: ["קלמארי", "דגים שלמים", "תולעים"],
    kosher: false,
    danger: "סכנת חיים! קוץ ארסי ומשונן בבסיס הזנב. חובה לחתוך חוט או להשתמש בציוד מגן.",
    desc: "דג סחוס שטוח החי על קרקעית חולית לאורך חופי ישראל. נתפס המון בטעות בזרזור או פיתיונות מהחוף.",
    habitat: "sea"
  },
  {
    id: "moray",
    name: "מורנה (Moray Eel)",
    season: "כל השנה",
    methods: ["פיתיון מהסלעים"],
    baits: ["בשר דגים", "קלמארי", "סרטנים"],
    kosher: false,
    danger: "נשיכה חזקה מאוד מזוג מלתעות כפולות! הדג אגרסיבי גם מחוץ למים ונוטה להסתבך בחוט.",
    desc: "צלופח אימתני בצבע חום-מנומר החי בנקיקי סלעים בים התיכון ובאילת. לרוב נחתך החוט בגלל שיניו החדות.",
    habitat: "sea"
  },
  {
    id: "bogue",
    name: "בננה (Boops boops)",
    season: "חורף - אביב",
    methods: ["בוס", "פיתיון קל"],
    baits: ["בצק", "תולעים", "חלבי"],
    kosher: true,
    danger: null,
    desc: "דג ים כסוף וקטן עם עיניים גדולות (ים תיכון). נתפס בהמוניו ומשמש בעיקר כפיתיון חי מצוין לאינטיאס וטורפים אחרים.",
    habitat: "sea"
  },
  {
    id: "squirrelfish",
    name: "ברקן אדום (קומוניסט)",
    season: "קיץ - סתיו",
    methods: ["פיתיון מהסלעים (בלילה)"],
    baits: ["גמברי", "תולעים", "בצק"],
    kosher: true,
    danger: "קוצים דוקרים מאוד בסנפירי הגב והזימים שיכולים לגרום לכאב וצריבה.",
    desc: "דג אדום קטן בעל עיניים גדולות החי בין הסלעים בים התיכון. פעיל בעיקר בלילה ונוטה 'לגנוב' פיתיונות.",
    habitat: "sea"
  }

];

export default function Wiki() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "sea" | "freshwater" | "danger" | "kosher">("all");

  const filteredFish = useMemo(() => {
    return FISH_DB.filter(f => {
      const matchesSearch = f.name.includes(searchQuery) || f.desc.includes(searchQuery);
      let matchesFilter = true;
      if (filter === "sea") matchesFilter = f.habitat === "sea";
      if (filter === "freshwater") matchesFilter = f.habitat === "freshwater";
      if (filter === "danger") matchesFilter = f.danger !== null;
      if (filter === "kosher") matchesFilter = f.kosher === true;
      
      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, filter]);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col px-4 mt-6">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          ויקי-דג <BookOpen className="w-8 h-8 text-cyan-500" />
        </h1>
        <p className="text-base text-slate-500 dark:text-slate-400 mt-1 font-medium">
          המדריך השלם לכל הדגים בישראל - ים, כנרת ונחלים.
        </p>
      </div>

      {/* Search and Tabs */}
      <div className="px-4 space-y-4">
        <div className="relative">
          <Search className="absolute right-4 top-3.5 h-6 w-6 text-slate-400" />
          <Input 
            placeholder="איזה דג תפסת?" 
            className="pr-12 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm h-14 text-lg font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button onClick={() => setFilter("all")} className={`whitespace-nowrap px-4 py-2.5 rounded-2xl text-sm font-bold transition-all \${filter === "all" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md" : "bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
            הכל
          </button>
          <button onClick={() => setFilter("sea")} className={`whitespace-nowrap flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all \${filter === "sea" ? "bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]" : "bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
            <Waves className="w-4 h-4" /> ים תיכון
          </button>
          <button onClick={() => setFilter("freshwater")} className={`whitespace-nowrap flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all \${filter === "freshwater" ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
            <Droplet className="w-4 h-4" /> מים מתוקים
          </button>
          <button onClick={() => setFilter("danger")} className={`whitespace-nowrap flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all \${filter === "danger" ? "bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]" : "bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
            <Skull className="w-4 h-4" /> מסוכנים
          </button>
          <button onClick={() => setFilter("kosher")} className={`whitespace-nowrap flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all \${filter === "kosher" ? "bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]" : "bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
            <CheckCircle className="w-4 h-4" /> כשרים
          </button>
        </div>
      </div>

      <div className="px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <AnimatePresence>
            {filteredFish.map((fish, i) => (
              <motion.div 
                key={fish.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="h-full overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 relative bg-white dark:bg-slate-900 rounded-3xl group flex flex-col p-6">
                  <div className="flex justify-between items-start mb-5">
                    <div className="pr-2">
                      <h3 className="font-black text-2xl text-slate-800 dark:text-slate-100 mb-1 leading-tight">
                        {fish.name}
                      </h3>
                      <p className="text-sm text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 inline-block px-3 py-1 rounded-full">
                        ⏱️ {fish.season}
                      </p>
                    </div>
                    <div className="bg-cyan-50 dark:bg-cyan-900/30 p-3.5 rounded-2xl shrink-0">
                       <Fish className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-5">
                    {fish.habitat === 'freshwater' && !fish.danger && (
                      <Badge className="font-bold flex gap-1 items-center bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-400 border-0 px-2.5 py-1">
                        <Droplet className="w-3.5 h-3.5" /> כנרת ונחלים
                      </Badge>
                    )}
                    {fish.habitat === 'sea' && !fish.danger && (
                      <Badge className="font-bold flex gap-1 items-center bg-cyan-100 text-cyan-800 hover:bg-cyan-100 dark:bg-cyan-500/20 dark:text-cyan-400 border-0 px-2.5 py-1">
                        <Waves className="w-3.5 h-3.5" /> ים תיכון
                      </Badge>
                    )}
                    {fish.danger && (
                      <Badge className="font-bold flex gap-1 items-center bg-rose-100 text-rose-800 hover:bg-rose-100 dark:bg-rose-500/20 dark:text-rose-400 border-0 px-2.5 py-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> סכנה
                      </Badge>
                    )}
                    {fish.kosher ? (
                      <Badge className="font-bold flex gap-1 items-center bg-slate-100 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 border-0 px-2.5 py-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> כשר
                      </Badge>
                    ) : (
                      <Badge className="font-bold flex gap-1 items-center bg-slate-100 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 border-0 px-2.5 py-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> לא כשר
                      </Badge>
                    )}
                  </div>

                  <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed mb-6 text-base">
                    {fish.desc}
                  </p>

                  {fish.danger && (
                    <div className="mb-6 bg-rose-500/10 border border-rose-500/30 p-4 rounded-2xl">
                      <p className="text-sm font-black text-rose-700 dark:text-rose-400 leading-snug flex items-start gap-2.5">
                        <Skull className="w-5 h-5 shrink-0" />
                        <span>{fish.danger}</span>
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-5 mt-auto">
                    <div>
                      <div className="text-xs font-black text-cyan-600 dark:text-cyan-500 mb-2 uppercase tracking-wide">שיטות דיג</div>
                      <ul className="text-sm space-y-1.5 font-bold text-slate-700 dark:text-slate-300">
                        {fish.methods.map((m, idx) => <li key={idx} className="flex items-start gap-1.5"><span className="text-cyan-500 mt-0.5">•</span> {m}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-black text-amber-600 dark:text-amber-500 mb-2 uppercase tracking-wide">פיתיון מועדף</div>
                      <ul className="text-sm space-y-1.5 font-bold text-slate-700 dark:text-slate-300">
                        {fish.baits.map((b, idx) => <li key={idx} className="flex items-start gap-1.5"><span className="text-amber-500 mt-0.5">•</span> {b}</li>)}
                      </ul>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredFish.length === 0 && (
            <div className="col-span-1 md:col-span-2 text-center p-12 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 mt-4">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">לא נמצא דג מתאים</h3>
              <p className="text-slate-500">נסה לחפש בשם אחר או לשנות את הסינון למעלה.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
