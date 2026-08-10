const fs = require('fs');

let code = fs.readFileSync('src/pages/fishing/Wiki.tsx', 'utf8');

const newFish = `,
  // 3 האחרונים למדריך השלם
  {
    id: "kachlon",
    name: "כחלון קוצני (Lichia)",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Trachinotus_ovatus_Italy.jpg/640px-Trachinotus_ovatus_Italy.jpg",
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
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Mahi-mahi_%28Coryphaena_hippurus%29.jpg/640px-Mahi-mahi_%28Coryphaena_hippurus%29.jpg",
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
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Fistularia_commersonii_%28Bluespotted_cornetfish%29.jpg/640px-Fistularia_commersonii_%28Bluespotted_cornetfish%29.jpg",
    season: "קיץ - סתיו",
    methods: ["ז'רז'ור"],
    baits: ["דמויי מינו", "סיליקונים"],
    kosher: false,
    danger: null,
    desc: "דג פולש מים סוף שנראה כמו מקל ארוך עם חוט בזנב. תוקפני מאוד ונתפס המון בז'רז'ור למרות שאין בו הרבה בשר.",
    habitat: "sea"
  }
];`;

code = code.replace(
  /  \}\s*\];\s*export default function Wiki\(\) \{/,
  '  }' + newFish.replace('];', '') + '\n];\n\nexport default function Wiki() {'
);

fs.writeFileSync('src/pages/fishing/Wiki.tsx', code);
