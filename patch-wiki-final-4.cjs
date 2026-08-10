const fs = require('fs');

let code = fs.readFileSync('src/pages/fishing/Wiki.tsx', 'utf8');

const newFish = `,
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
];`;

code = code.replace(
  /  \}\s*\];\s*export default function Wiki\(\) \{/,
  '  }' + newFish.replace('];', '') + '\n];\n\nexport default function Wiki() {'
);

fs.writeFileSync('src/pages/fishing/Wiki.tsx', code);
