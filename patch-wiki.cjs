const fs = require('fs');

const code = fs.readFileSync('src/pages/fishing/Wiki.tsx', 'utf8');

const newFish = `,
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
];`;

const replaced = code.replace(/\s*\];\s*export default function Wiki\(\) {/, newFish + '\n\nexport default function Wiki() {');
fs.writeFileSync('src/pages/fishing/Wiki.tsx', replaced);
