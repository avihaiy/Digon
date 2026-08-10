const fs = require('fs');

let code = fs.readFileSync('src/pages/fishing/Wiki.tsx', 'utf8');

const newFish = `,
  // תוספות דגי ים
  {
    id: "televizia",
    name: "טלוויזיה (Whiting)",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Sillago_sihama_by_Hamid_Badar_Osmany.jpg/640px-Sillago_sihama_by_Hamid_Badar_Osmany.jpg",
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
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Scomberomorus_commerson_%28Narrow-barred_Spanish_mackerel%29.jpg/640px-Scomberomorus_commerson_%28Narrow-barred_Spanish_mackerel%29.jpg",
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
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Euthynnus_alletteratus_1.jpg/640px-Euthynnus_alletteratus_1.jpg",
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
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Octopus_vulgaris_Croatia.jpg/640px-Octopus_vulgaris_Croatia.jpg",
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
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Sarpa_salpa.jpg/640px-Sarpa_salpa.jpg",
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
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Acanthobrama_terraesanctae.jpg/640px-Acanthobrama_terraesanctae.jpg",
    season: "כל השנה",
    methods: ["בוס", "רשת (מסחרי)"],
    baits: ["בצק", "תולעים"],
    kosher: true,
    danger: null,
    desc: "דג היסטורי וסמל של הכנרת (הנקרא גם סרדין הכנרת). דג קטן החי בלהקות ענק. מעולה כפיתיון חי לדגים גדולים יותר או לטיגון עמוק.",
    habitat: "freshwater"
  }
];`;

// Find the last item closing bracket and insert there
code = code.replace(
  /  \}\s*\];\s*export default function Wiki\(\) \{/,
  '  }' + newFish.replace('];', '') + '\n];\n\nexport default function Wiki() {'
);

fs.writeFileSync('src/pages/fishing/Wiki.tsx', code);
