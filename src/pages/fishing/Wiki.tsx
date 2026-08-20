import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Fish, AlertTriangle, CheckCircle, Search, Waves, Droplet, Skull, Star, Camera, ArrowUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect } from "react";
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
  legalSize?: string;
  recommendedGear?: {
    hookSize?: string;
    lineTest?: string;
  };
  activeHours?: string;
}

const FISH_DB: FishData[] = [
  // Sea Fish
  {
    id: "locus",
    name: "לוקוס לבן (דקר)",
    season: "אביב - קיץ",
    activeHours: "יום וזריחה",
    methods: ["ז'רז'ור", "פיתיון", "סירה"],
    baits: ["קלמארי", "סבידה", "דגים חיים"],
    kosher: true,
    danger: null,
    legalSize: "40 ס\"מ מינימום",
    recommendedGear: { hookSize: "#1/0 - #4/0", lineTest: "30lb - 50lb" },
    desc: "דג טורף הנחשב לאחד ממשובחי הים התיכון. נמצא לרוב בקרבת סלעים ושוברי גלים.",
    habitat: "sea"
  },
  {
    id: "denis",
    name: "דניס (צ'יפורה)",
    season: "סתיו - חורף",
    activeHours: "כל היום, עדיפות לבוקר",
    methods: ["פיתיון חוף", "בוס"],
    baits: ["תולעים", "גמברי", "בצק מסריח"],
    kosher: true,
    danger: null,
    legalSize: "20 ס\"מ מינימום",
    recommendedGear: { hookSize: "#4 - #8", lineTest: "12lb - 20lb" },
    desc: "דג פופולרי מאוד, פעיל בעיקר בקרקע חולית או מעורבת. נלחם יפה בחכה.",
    habitat: "sea"
  },
  {
    id: "sargus",
    name: "סרגוס (ספרוס)",
    season: "כל השנה (במיוחד חורף)",
    activeHours: "לילה וזריחה",
    methods: ["בוס", "פיתיון חוף"],
    baits: ["בצק", "גמברי", "תולעים"],
    kosher: true,
    danger: null,
    recommendedGear: { hookSize: "#6 - #10", lineTest: "10lb - 15lb" },
    desc: "דג חוף טיפוסי שאוהב ים גלי. מסתובב בלהקות ונמצא כמעט בכל נקודה סלעית.",
    habitat: "sea"
  },
  {
    id: "aras",
    name: "ארס (סיכן)",
    season: "קיץ - סתיו",
    activeHours: "יום",
    methods: ["בוס"],
    baits: ["בצק", "אצות"],
    kosher: true,
    danger: "קוצים ארסיים סנפיר גב - עקיצה כואבת מאוד!",
    recommendedGear: { hookSize: "#10 - #12", lineTest: "8lb - 12lb" },
    desc: "פולש מים סוף. דג צמחוני וטעים מאוד, אך דורש זהירות רבה בניקוי בשל הקוצים הארסיים שלו.",
    habitat: "sea"
  },
  {
    id: "avo-nafha",
    name: "אבו נפחא (לגינון)",
    season: "כל השנה",
    activeHours: "כל היום",
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
    activeHours: "זריחה, שקיעה ולילה",
    methods: ["ז'רז'ור כבד", "פיתיון חי", "סירה"],
    baits: ["סבידה חיה", "בורי חי", "דמויים גדולים"],
    kosher: true,
    danger: null,
    legalSize: "אין, מומלץ לשחרר מתחת ל-2 ק\"ג",
    recommendedGear: { hookSize: "#3/0 - #8/0", lineTest: "50lb - 80lb" },
    desc: "מלך הים התיכון. דג חזק מאוד המגיע למשקלים של עשרות קילוגרמים. נותן פייט בלתי נשכח.",
    habitat: "sea"
  },
  {
    id: "palamida",
    name: "פלמידה (טונית אטלנטית)",
    season: "אביב - קיץ",
    activeHours: "שעות היום המוקדמות",
    methods: ["ז'רז'ור", "טרולינג (סירה)"],
    baits: ["ג'יגים", "דמויים", "ניקלים"],
    kosher: true,
    danger: null,
    recommendedGear: { hookSize: "#1 - #3/0", lineTest: "20lb - 40lb" },
    desc: "דג מהיר מאוד שזז בלהקות. בשרו כהה ומתאים מאוד לסשימי או בישול. נלחם בעוצמה רבה.",
    habitat: "sea"
  },
  {
    id: "marmir",
    name: "מרמיר (שישן)",
    season: "קיץ - סתיו",
    activeHours: "לילה",
    methods: ["פיתיון חוף"],
    baits: ["תולעים", "שניצל", "גמברי"],
    kosher: true,
    danger: null,
    recommendedGear: { hookSize: "#6 - #10", lineTest: "10lb - 15lb" },
    desc: "דג חוף קלאסי שאוהב קרקע חולית. מאופיין בפסים לאורך גופו, נתפס הרבה בדיג פיתיונות קל.",
    habitat: "sea"
  },
  {
    id: "gombar",
    name: "גומבר (Bluefish)",
    season: "קיץ - סתיו",
    activeHours: "זריחה ושקיעה",
    methods: ["ז'רז'ור", "פיתיון חי"],
    baits: ["טופ-ווטר", "פופרים", "בורי חי"],
    kosher: true,
    danger: "שיניים חדות כתער! יכול לכרות אצבע. חובה להשתמש בפלאייר.",
    recommendedGear: { hookSize: "#1/0 - #4/0 (חובה תיל מתכת)", lineTest: "20lb - 40lb" },
    desc: "מכונת רצח אכזרית! טורף תוקפני במיוחד שלרוב קורע חוטים רגילים. אוהב לרדוף אחרי פיתיונות קופצים על פני המים.",
    habitat: "sea"
  },
  {
    id: "barracuda",
    name: "מליטה (ברקודה)",
    season: "סתיו - חורף",
    activeHours: "לילה וזריחה",
    methods: ["ז'רז'ור", "פיתיון חי"],
    baits: ["דמויי מינו (Minnow)", "דגים קטנים"],
    kosher: true,
    danger: "שיניים חדות.",
    recommendedGear: { hookSize: "#1 - #2/0", lineTest: "15lb - 30lb" },
    desc: "טורף בעל מבנה גוף דמוי טורפדו שמסתובב בלהקות, לרוב בשעות הלילה ומוקדם בבוקר ליד שוברי גלים.",
    habitat: "sea"
  },
  {
    id: "tarchon",
    name: "טרכון (Trevally)",
    season: "אביב - סתיו",
    activeHours: "זריחה ובוקר",
    methods: ["ז'רז'ור", "סירה"],
    baits: ["ג'יגים קטנים", "סיליקונים"],
    kosher: true,
    danger: null,
    recommendedGear: { hookSize: "#2 - #1/0", lineTest: "12lb - 25lb" },
    desc: "לוחם מדהים ביחס לגודלו. שייך למשפחת הטרוליים וחי באזורי זרמים ושוברי גלים. מעולה לז'רז'ור קל.",
    habitat: "sea"
  },
  {
    id: "labrak",
    name: "לברק (Sea Bass)",
    season: "חורף",
    activeHours: "זריחה וים גלי",
    methods: ["ז'רז'ור", "פיתיון חי"],
    baits: ["סיליקונים", "דמויים קטנים", "בורי קטן"],
    kosher: true,
    danger: null,
    recommendedGear: { hookSize: "#1 - #2/0", lineTest: "15lb - 20lb" },
    desc: "טורף כסוף ואלגנטי שאוהב מים גליים ומוקצפים. נחשב לדג איכותי מאוד למאכל.",
    habitat: "sea"
  },
  {
    id: "musar",
    name: "מוסר (Meagre)",
    season: "כל השנה",
    activeHours: "זריחה וערב",
    methods: ["ז'רז'ור כבד", "סירה"],
    baits: ["ג'יגים", "דמויים גדולים", "פיתיון חי"],
    kosher: true,
    danger: null,
    legalSize: "30 ס\"מ מינימום",
    recommendedGear: { hookSize: "#2/0 - #5/0", lineTest: "30lb - 50lb" },
    desc: "דג ענק וכסוף ממשפחת המסריים. יכול להגיע למשקלים של מעל 20 קילו. חי באזורים עמוקים.",
    habitat: "sea"
  },
  {
    id: "farida",
    name: "פרידה (Pagrus)",
    season: "כל השנה",
    activeHours: "כל היום",
    methods: ["סירה", "ג'יגינג"],
    baits: ["קלמארי", "ג'יגים איטיים"],
    kosher: true,
    danger: null,
    legalSize: "25 ס\"מ מינימום",
    recommendedGear: { hookSize: "#1/0 - #3/0", lineTest: "20lb - 40lb" },
    desc: "דג אדמדם וחזק שחי בעומק. פייט מצוין ובשר משובח מאוד.",
    habitat: "sea"
  },
  {
    id: "safmit",
    name: "שפמית ארסית (דג נחש)",
    season: "קיץ",
    activeHours: "כל היום והלילה",
    methods: ["נתפס בטעות בפיתיונות"],
    baits: ["בשר", "תולעים"],
    kosher: false,
    danger: "סכנת חיים! עקיצה רעילה ביותר שגורמת לכאב משתק, נפיחות ומחייבת מיון.",
    desc: "דג פולש קטן דמוי נחש עם פסים לאורך גופו. הטורף הארסי ביותר בים התיכון. חותכים את החוט וזורקים.",
    habitat: "sea"
  },
  {
    id: "calamari",
    name: "קלמארי / סבידה",
    season: "חורף - אביב",
    activeHours: "לילה (או יום עם בובות)",
    methods: ["ז'רז'ור מיוחד (Eging)"],
    baits: ["בובות קלמארי (Egi)"],
    kosher: false,
    danger: "דיו שחור שמלכלך בגדים לנצח.",
    recommendedGear: { hookSize: "בובת EGI", lineTest: "PE 0.6 - 1.0" },
    desc: "רכיכות חכמות שמגיעות לחוף בחורף. משמשות גם למאכל וגם כפיתיון הכי טוב לטורפים אחרים.",
    habitat: "sea"
  },
  // New Sea Fish
  {
    id: "tuna-blackfin",
    name: "טונה שחורת סנפיר (אלבקור)",
    season: "אביב - קיץ",
    activeHours: "בוקר וצהריים",
    methods: ["טרולינג", "ז'רז'ור כבד"],
    baits: ["דמויים גדולים", "פיתיונות חיים", "נוצות"],
    kosher: true,
    danger: null,
    legalSize: "אלבקור מותר, מוגן כחולת סנפיר",
    recommendedGear: { hookSize: "#5/0 - #9/0", lineTest: "60lb - 100lb" },
    desc: "מהירה כמו טורפדו! דורשת ציוד פלאגי סופר-כבד. לרוב נתפסת מדיג בסירה רחוק מהחוף.",
    habitat: "sea"
  },
  {
    id: "dorado",
    name: "דוראדו (מהי-מהי)",
    season: "קיץ - סתיו",
    activeHours: "שעות היום",
    methods: ["טרולינג", "ז'רז'ור"],
    baits: ["קלמארי", "דמויים צפים"],
    kosher: true,
    danger: null,
    recommendedGear: { hookSize: "#2/0 - #5/0", lineTest: "30lb - 50lb" },
    desc: "אחד הדגים היפים בים! מחליף צבעים כשנתפס, קופץ באוויר ונותן מלחמה אקרובטית מטורפת.",
    habitat: "sea"
  },
  {
    id: "shark",
    name: "כרישים",
    season: "סתיו - חורף",
    activeHours: "כל היום",
    methods: ["תפיסה ושחרור בלבד!"],
    baits: ["פיתיון בשר", "דג שלם"],
    kosher: false,
    danger: "מסוכן. כל הכרישים מוגנים לפי חוק!",
    legalSize: "מוגן לחלוטין (חובה לשחרר)",
    recommendedGear: { hookSize: "#10/0 Circle", lineTest: "100lb+" },
    desc: "מין מוגן בישראל! מגיעים בחורף למים החמים. חובה לשחרר מיד ללא פגיעה.",
    habitat: "sea"
  },
  // Freshwater Fish
  {
    id: "karp",
    name: "קרפיון",
    season: "אביב - קיץ",
    activeHours: "לילה ובוקר מוקדם",
    methods: ["דיג פיתיונות", "Hair Rig"],
    baits: ["בוילים (Boilies)", "תירס", "בצק מתוק"],
    kosher: true,
    danger: null,
    legalSize: "30 ס\"מ מינימום",
    recommendedGear: { hookSize: "#4 - #8", lineTest: "15lb - 30lb" },
    desc: "דג חזק וזהיר מאוד. ענף ספורטיבי שלם (Carp Fishing) הדורש סבלנות וציוד ייעודי.",
    habitat: "freshwater"
  },
  {
    id: "amnon",
    name: "מושט (אמנון)",
    season: "כל השנה",
    activeHours: "שעות היום",
    methods: ["בוס", "ז'רז'ור אולטרה לייט"],
    baits: ["תירס", "בצק", "ספינרים קטנים"],
    kosher: true,
    danger: "קוצים חדים בסנפיר הגב.",
    legalSize: "15 ס\"מ מינימום",
    recommendedGear: { hookSize: "#8 - #12", lineTest: "4lb - 8lb" },
    desc: "הדג הנפוץ ביותר בכנרת ובנחלים. נלחם יפה על ציוד קל, ומהווה מטרה מעולה למתחילים.",
    habitat: "freshwater"
  },
  {
    id: "catfish",
    name: "שפמנון",
    season: "קיץ",
    activeHours: "לילה וזריחה",
    methods: ["פיתיון חי/בשרי", "בוס כבד"],
    baits: ["כבד עוף", "נקניקיה", "דג"],
    kosher: false,
    danger: "קוצים עוקצניים בשולי הסנפירים.",
    recommendedGear: { hookSize: "#1 - #4/0", lineTest: "20lb - 50lb" },
    desc: "טורף גדול ללא קשקשים (לא כשר). נמשך לריחות בשריים, ויכול להגיע לממדי ענק.",
    habitat: "freshwater"
  },
  {
    id: "trout",
    name: "פורל (שמך)",
    season: "חורף",
    activeHours: "יום",
    methods: ["ז'רז'ור אולטרה לייט", "דיג זבובים (Fly)"],
    baits: ["כפיות זעירות", "סיליקונים", "זבובים"],
    kosher: true,
    danger: null,
    recommendedGear: { hookSize: "#10 - #14", lineTest: "2lb - 6lb" },
    desc: "דג מים קרים, נדיר מאוד בישראל מחוץ לחוות גידול ובנחל הדן. אקרובט מדהים וחזק.",
    habitat: "freshwater"
  },
  {
    id: "buri",
    name: "בורי (קיפון)",
    season: "כל השנה",
    activeHours: "שעות היום המוארות",
    methods: ["בוס", "פיתיון (קפיץ/פיתה)"],
    baits: ["בצק נוזלי/מסטיק", "פיתה"],
    kosher: true,
    danger: null,
    legalSize: "20 ס\"מ (בכנרת)",
    recommendedGear: { hookSize: "#10 - #14", lineTest: "8lb - 12lb" },
    desc: "נמצא בים ובמים מתוקים. ניזון מרפש, דורש פיתיון רך מאוד וראייה חדה לזיהוי האכילות העדינות.",
    habitat: "freshwater"
  }
];

export default function Wiki() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "favorites" | "sea" | "freshwater" | "danger" | "kosher">("all");
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  const [favorites, setFavorites] = useState<string[]>(() => {
    return JSON.parse(localStorage.getItem('wiki_favorites') || '[]');
  });

  const toggleFavorite = (id: string) => {
    const newFavs = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    setFavorites(newFavs);
    localStorage.setItem('wiki_favorites', JSON.stringify(newFavs));
  };

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredFish = useMemo(() => {
    return FISH_DB.filter(f => {
      const matchesSearch = f.name.includes(searchQuery) || f.desc.includes(searchQuery);
      let matchesFilter = true;
      if (filter === "favorites") matchesFilter = favorites.includes(f.id);
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
          <button onClick={() => setFilter("favorites")} className={`whitespace-nowrap flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${filter === "favorites" ? "bg-yellow-500 text-white shadow-[0_0_15px_rgba(234,179,8,0.4)]" : "bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
            <Star className="w-4 h-4" /> מועדפים
          </button>
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

      
      <div className="px-4 mb-2">
        <Link to="/fishing/identify" className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-3xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all w-full group border border-indigo-400/30">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2.5 rounded-2xl"><Camera className="w-6 h-6" /></div>
            <div className="text-right">
              <div className="font-black text-lg">לא מצאת את הדג?</div>
              <div className="text-sm font-medium text-white/90">סרוק תמונה בעזרת ה-AI שלנו</div>
            </div>
          </div>
          <div className="bg-white/10 p-2.5 rounded-full group-hover:bg-white/20 transition-colors">
            <Search className="w-5 h-5" />
          </div>
        </Link>
      </div>

      <div className="px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-start">
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
                <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 relative bg-white dark:bg-slate-900 rounded-3xl group flex flex-col p-6">
                  <div className="flex justify-between items-start mb-5">
                    <div className="pl-2">
                      <h3 className="font-black text-2xl text-slate-800 dark:text-slate-100 mb-1 leading-tight">
                        {fish.name}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 inline-block px-3 py-1 rounded-full">
                          📅 {fish.season}
                        </p>
                        {fish.activeHours && (
                          <p className="text-sm text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-900/30 inline-block px-3 py-1 rounded-full">
                            ⏰ {fish.activeHours}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <div className="bg-cyan-50 dark:bg-cyan-900/30 p-3.5 rounded-2xl shrink-0 flex items-center justify-center">
                         <Fish className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <button onClick={() => toggleFavorite(fish.id)} className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center">
                        <Star className={`w-5 h-5 ${favorites.includes(fish.id) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'}`} />
                      </button>
                    </div>
                  </div>
                  
                  {fish.legalSize && (
                    <div className="mb-4 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 p-3 rounded-xl flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
                      <span className="text-sm font-bold text-orange-700 dark:text-orange-400">
                        גודל חוקי: {fish.legalSize}
                      </span>
                    </div>
                  )}
                  
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
                        {fish.methods.map((m, idx) => <li key={idx} className="flex items-start gap-1.5"><span className="text-cyan-500 mt-0.5">•</span> <button onClick={() => setSearchQuery(m)} className="hover:text-cyan-600 dark:hover:text-cyan-400 text-right transition-colors underline-offset-4 hover:underline outline-none">{m}</button></li>)}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-black text-amber-600 dark:text-amber-500 mb-2 uppercase tracking-wide">פיתיון מועדף</div>
                      <ul className="text-sm space-y-1.5 font-bold text-slate-700 dark:text-slate-300">
                        {fish.baits.map((b, idx) => <li key={idx} className="flex items-start gap-1.5"><span className="text-amber-500 mt-0.5">•</span> <button onClick={() => setSearchQuery(b)} className="hover:text-amber-600 dark:hover:text-amber-400 text-right transition-colors underline-offset-4 hover:underline outline-none">{b}</button></li>)}
                      </ul>
                    </div>
                  </div>

                  {fish.recommendedGear && (
                    <div className="mt-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="text-xs font-black text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                        ציוד מומלץ 🎣
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                        {fish.recommendedGear.hookSize && (
                          <div>
                            <span className="text-slate-400 dark:text-slate-500 text-xs block mb-0.5">מידת קרס</span>
                            {fish.recommendedGear.hookSize}
                          </div>
                        )}
                        {fish.recommendedGear.lineTest && (
                          <div>
                            <span className="text-slate-400 dark:text-slate-500 text-xs block mb-0.5">טסט חוט (LB)</span>
                            {fish.recommendedGear.lineTest}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredFish.length === 0 && (
            <div className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4 text-center p-12 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 mt-4">
              <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">לא נמצא דג מתאים</h3>
              <p className="text-slate-500">נסה לחפש בשם אחר או לשנות את הסינון למעלה.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Scroll to Top FAB */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-24 right-6 p-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all z-50 flex items-center justify-center"
          >
            <ArrowUp className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
