import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Fish, AlertTriangle, CheckCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { motion } from "framer-motion";

const FISH_DB = [
  {
    id: "locus",
    name: "לוקוס לבן (דקר)",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Epinephelus_aeneus_%28white_grouper%29.jpg/640px-Epinephelus_aeneus_%28white_grouper%29.jpg",
    season: "אביב - קיץ",
    methods: ["ז'רז'ור", "פיתיון", "סירה"],
    baits: ["קלמארי", "סבידה", "דגים חיים"],
    kosher: true,
    danger: null,
    desc: "דג טורף הנחשב לאחד ממשובחי הים התיכון. נמצא לרוב בקרבת סלעים ושוברי גלים."
  },
  {
    id: "denis",
    name: "דניס (צ'יפורה)",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Sparus_aurata.jpg/640px-Sparus_aurata.jpg",
    season: "סתיו - חורף",
    methods: ["פיתיון חוף", "בוס"],
    baits: ["תולעים", "גמברי", "בצק מסריח"],
    kosher: true,
    danger: null,
    desc: "דג פופולרי מאוד, פעיל בעיקר בקרקע חולית או מעורבת. נלחם יפה בחכה."
  },
  {
    id: "sargus",
    name: "סרגוס (ספרוס)",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Diplodus_sargus_sargus.jpg/640px-Diplodus_sargus_sargus.jpg",
    season: "כל השנה (במיוחד חורף)",
    methods: ["בוס", "פיתיון חוף"],
    baits: ["בצק", "גמברי", "תולעים"],
    kosher: true,
    danger: null,
    desc: "דג חוף טיפוסי שאוהב ים גלי. מסתובב בלהקות ונמצא כמעט בכל נקודה סלעית."
  },
  {
    id: "aras",
    name: "ארס (סיכן)",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Siganus_rivulatus.jpg/640px-Siganus_rivulatus.jpg",
    season: "קיץ - סתיו",
    methods: ["בוס"],
    baits: ["בצק", "אצות"],
    kosher: true,
    danger: "קוצים ארסיים סנפיר גב - עקיצה כואבת מאוד!",
    desc: "פולש מים סוף. דג צמחוני וטעים מאוד, אך דורש זהירות רבה בניקוי בשל הקוצים הארסיים שלו."
  },
  {
    id: "avo-nafha",
    name: "אבו נפחא (לגינון)",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Lagocephalus_sceleratus_%28Silver-cheeked_toadfish%29.jpg/640px-Lagocephalus_sceleratus_%28Silver-cheeked_toadfish%29.jpg",
    season: "כל השנה",
    methods: ["נתפס בטעות בכל השיטות"],
    baits: ["הכל"],
    kosher: false,
    danger: "רעיל ביותר! סכנת מוות באכילה. חותך קרסים בקלות.",
    desc: "מין פולש ומסוכן ביותר. מכיל רעל קטלני (טטרודוטוקסין). אסור למגע ואסור למאכל בשום צורה."
  },
  {
    id: "intias",
    name: "אנטיאס (שולה)",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Seriola_dumerili.jpg/640px-Seriola_dumerili.jpg",
    season: "סתיו - חורף",
    methods: ["ז'רז'ור כבד", "פיתיון חי", "סירה"],
    baits: ["סבידה חיה", "בורי חי", "דמויים גדולים"],
    kosher: true,
    danger: null,
    desc: "מלך הים התיכון. דג חזק מאוד המגיע למשקלים של עשרות קילוגרמים. נותן פייט בלתי נשכח."
  },
  {
    id: "palamida",
    name: "פלמידה (טונית אטלנטית)",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Euthynnus_alletteratus_2.jpg/640px-Euthynnus_alletteratus_2.jpg",
    season: "אביב - קיץ",
    methods: ["ז'רז'ור", "טרולינג (סירה)"],
    baits: ["ג'יגים", "דמויים", "ניקלים"],
    kosher: true,
    danger: null,
    desc: "דג מהיר מאוד שזז בלהקות. בשרו כהה ומתאים מאוד לסשימי או בישול. נלחם בעוצמה רבה."
  },
  {
    id: "buri",
    name: "בורי (קיפון)",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Mugil_cephalus.jpg/640px-Mugil_cephalus.jpg",
    season: "כל השנה",
    methods: ["בוס", "רשת (מסחרי)"],
    baits: ["בצק מסריח", "פיתה"],
    kosher: true,
    danger: null,
    desc: "דג צמחוני הנמצא לרוב קרוב לפני המים בנמלים ושוברי גלים. קשה מאוד ללכוד אותו בשל פיו העדין."
  },
  {
    id: "marmir",
    name: "מרמיר (שישן)",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Lithognathus_mormyrus.jpg/640px-Lithognathus_mormyrus.jpg",
    season: "קיץ - סתיו",
    methods: ["פיתיון חוף"],
    baits: ["תולעים", "שניצל", "גמברי"],
    kosher: true,
    danger: null,
    desc: "דג חוף קלאסי שאוהב קרקע חולית. מאופיין בפסים לאורך גופו, נתפס הרבה בדיג פיתיונות קל."
  },
  // מים מתוקים (כנרת, נחלים ואגמים)
  {
    id: "musht",
    name: "מושט / אמנון (Tilapia)",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Oreochromis_niloticus.jpg/640px-Oreochromis_niloticus.jpg",
    season: "אביב - קיץ",
    methods: ["בוס", "ז'רז'ור אולטרה-לייט"],
    baits: ["תירס", "בצק", "תולעים", "ספינרים קטנים"],
    kosher: true,
    danger: "סנפיר גב קוצני - יש לאחוז בזהירות.",
    desc: "הדג המוכר ביותר בכנרת! חי בלהקות באזורי חוף וצמחיה. דג תוקפני יחסית לגודלו שמספק פייט מהנה מאוד בחכות קלות."
  },
  {
    id: "karpion",
    name: "קרפיון (Carp)",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Common_carp.jpg/640px-Common_carp.jpg",
    season: "אביב - סתיו",
    methods: ["פיתיון (Carp Fishing)", "קפיץ / בויליס"],
    baits: ["בויליס", "בצק", "תירס חמוץ"],
    kosher: true,
    danger: null,
    desc: "מלך המים המתוקים ולרוב הגדול מכולם. דורש סבלנות רבה וציוד ייעודי. נמצא בכנרת ובאגמים מלאכותיים."
  },
  {
    id: "barbus",
    name: "בינית (Barbus)",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Luciobarbus_capito.jpg/640px-Luciobarbus_capito.jpg",
    season: "אביב - קיץ",
    methods: ["בוס", "פיתיון", "ז'רז'ור"],
    baits: ["תירס", "בצק", "כפיות (Spoons)"],
    kosher: true,
    danger: null,
    desc: "דג חזק ומהיר החי בנחלים זורמים ובכנרת. תוקף פיתיונות מלאכותיים ומהווה מטרה מצוינת לדייגי הזרזור במים מתוקים."
  },
  {
    id: "catfish",
    name: "שפמנון (Catfish)",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Clarias_gariepinus.jpg/640px-Clarias_gariepinus.jpg",
    season: "קיץ (פעיל בעיקר בלילה)",
    methods: ["פיתיון חי / בשרי"],
    baits: ["חלקי עוף", "נקניקייה", "דגים קטנים"],
    kosher: false,
    danger: "ריר חלקלק מאוד, ללא קשקשים.",
    desc: "טורף קרקעית המגיע לגדלים מפלצתיים במים העכורים של הכנרת ונחלים. בעל 'שפם' חישה מפותח. אינו כשר למאכל."
  },
  {
    id: "silver-carp",
    name: "כסיף (Silver Carp)",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Hypophthalmichthys_molitrix.jpg/640px-Hypophthalmichthys_molitrix.jpg",
    season: "קיץ",
    methods: ["פיתיון צף"],
    baits: ["לחם צף", "בצק"],
    kosher: true,
    danger: null,
    desc: "דג עצום המסנן פלנקטון ומיקרו-אורגניזמים מהמים. לעתים קופץ מעל המים כשהוא נבהל מסירות."
  },
  // השלמות לים התיכון
  {
    id: "gombar",
    name: "גומבר (Bluefish)",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Bluefish_%28Pomatomus_saltatrix%29.jpg/640px-Bluefish_%28Pomatomus_saltatrix%29.jpg",
    season: "קיץ - סתיו",
    methods: ["ז'רז'ור", "פיתיון חי / כבל מתכת"],
    baits: ["טופ-ווטר", "פופרים", "בורי חי"],
    kosher: true,
    danger: "שיניים חדות כתער! יכול לכרות אצבע. חובה להשתמש בפלאייר.",
    desc: "מכונת רצח אכזרית! טורף תוקפני במיוחד שלרוב קורע חוטים רגילים. אוהב לרדוף אחרי פיתיונות קופצים על פני המים."
  },
  {
    id: "barracuda",
    name: "מליטה / ברקודה",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Sphyraena_barracuda.jpg/640px-Sphyraena_barracuda.jpg",
    season: "סתיו - חורף",
    methods: ["ז'רז'ור", "פיתיון חי"],
    baits: ["דמויי מינו (Minnow)", "דגים קטנים"],
    kosher: true,
    danger: "שיניים חדות.",
    desc: "טורף בעל מבנה גוף דמוי טורפדו שמסתובב בלהקות, לרוב בשעות הלילה ומוקדם בבוקר ליד שוברי גלים."
  },
  {
    id: "tarchon",
    name: "טרכון (Trevally)",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Pseudocaranx_dentex_%28Gueldenstaedt%2C_1789%29.jpg/640px-Pseudocaranx_dentex_%28Gueldenstaedt%2C_1789%29.jpg",
    season: "אביב - סתיו",
    methods: ["ז'רז'ור", "סירה"],
    baits: ["ג'יגים קטנים", "סיליקונים"],
    kosher: true,
    danger: null,
    desc: "לוחם מדהים ביחס לגודלו. שייך למשפחת הטרוליים וחי באזורי זרמים ושוברי גלים. מעולה לז'רז'ור קל."
  }
];

export default function Wiki() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFish = FISH_DB.filter(f => 
    f.name.includes(searchQuery) || f.desc.includes(searchQuery)
  );

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto">
      
      {/* Header */}
      <div className="flex flex-col px-4 mt-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          ויקי-דג <BookOpen className="w-6 h-6 text-primary" />
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          המדריך המלא לדגי ישראל
        </p>
      </div>

      <div className="px-4">
        <div className="relative">
          <Search className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="חפש דג..." 
            className="pr-10 rounded-2xl bg-card border-border shadow-sm h-12 text-base"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="px-4 space-y-4">
        {filteredFish.map((fish, i) => (
          <motion.div 
            key={fish.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="overflow-hidden border-border/50 shadow-sm relative">
              {fish.danger && (
                <div className="absolute top-3 left-3 z-10">
                  <Badge variant="destructive" className="font-bold flex gap-1 items-center bg-red-600">
                    <AlertTriangle className="w-3.5 h-3.5" /> מסוכן
                  </Badge>
                </div>
              )}
              
              <div className="h-48 w-full bg-muted relative">
                {/* Fallback pattern if image fails */}
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/20">
                  <Fish className="w-20 h-20" />
                </div>
                <img 
                  src={fish.image} 
                  alt={fish.name} 
                  className="w-full h-full object-cover relative z-10"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>

              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-xl leading-tight text-slate-900 dark:text-white">
                      {fish.name}
                    </h3>
                    <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                      {fish.kosher ? (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle className="w-3.5 h-3.5" /> כשר
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-500 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5" /> לא כשר
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                  {fish.desc}
                </p>

                {fish.danger && (
                  <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl mb-4">
                    <p className="text-xs font-bold text-rose-600 dark:text-rose-400 leading-tight">
                      אזהרה: {fish.danger}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">עונה מומלצת</span>
                    <span className="text-sm font-semibold">{fish.season}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">שיטות דייג</span>
                    <div className="flex flex-wrap gap-1">
                      {fish.methods.map(m => (
                        <Badge key={m} variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0 font-bold">{m}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">פתיונות</span>
                    <div className="flex flex-wrap gap-1">
                      {fish.baits.map(b => (
                        <Badge key={b} variant="outline" className="text-[10px] font-medium">{b}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        {filteredFish.length === 0 && (
          <div className="text-center p-8 text-muted-foreground">
            <Fish className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>לא נמצאו דגים העונים לחיפוש.</p>
          </div>
        )}
      </div>
    </div>
  );
}
