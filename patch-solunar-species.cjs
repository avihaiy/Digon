const fs = require('fs');
let code = fs.readFileSync('src/lib/solunar.ts', 'utf8');

const regex = /export function getSmartTargetSpecies\([\s\S]*?\)\s*:\s*FishRecommendation\s*\{[\s\S]*?(?=\nexport interface GoldWindow)/;

const newCode = `export function getSmartTargetSpecies(
  waveHeight: number | null, 
  temp: number | null, 
  cloudCover: number | null,
  fishingStyle: FishingStyle = 'lure',
  isTurbid: boolean = false
): FishRecommendation {
  const w = waveHeight ?? 0.5;
  const t = temp ?? 22;
  const c = cloudCover ?? 10;
  
  const isWinter = t < 20;

  if (isTurbid) {
    if (fishingStyle === 'lure' || fishingStyle === 'ultralight') {
      return {
        species: ["לוקוס (על הריפים)", "ברקודה"],
        bestMethod: "דמויים בצבעים זוהרים/רועשים (Rattling)",
        reasoning: "המים עכורים ולכן דגים מתקשים לראות. השתמש בדמויים שעושים ויברציות.",
        iconType: 'lure'
      };
    } else {
      return {
        species: ["סרגוס", "לבט", "לוקוס"],
        bestMethod: "פיתיונות מסריחים (סבידה/גמברי)",
        reasoning: "מים עכורים מביאים את הסרגוסים לחפש אוכל בעזרת חוש הריח! זמן פצצה.",
        iconType: 'bait'
      };
    }
  }

  // SCENARIO 1: Flat Sea (ים פלטה)
  if (w < 0.4) {
    if (fishingStyle === 'ultralight' || fishingStyle === 'kayak') {
      return {
        species: isWinter ? ["קלמרי", "סבידה", "טרחון קטן"] : ["טרחון", "פלמידה", "טונה שחורה"],
        bestMethod: "ז'רז'ור קלמרים / פופרים קטנים",
        reasoning: "ים שטוח לגמרי מושלם לסגנון שלך. חפש רתיחות!",
        iconType: isWinter ? 'squid' : 'lure'
      };
    } else if (fishingStyle === 'bait') {
      return {
        species: ["דניס", "מרמיר", "בורי"],
        bestMethod: "פיתיונות על רגש (בוס או חוף עדין)",
        reasoning: "המים צלולים והדגים חשדניים. השתמש בחוטים דקים ופיתיון טבעי.",
        iconType: 'bait'
      };
    }
  }
  
  // SCENARIO 2: Working Sea (ים עובד)
  if (w >= 0.4 && w <= 1.2) {
    if (fishingStyle === 'kayak') {
      return {
        species: ["פלמידה", "אינטיאס", "דוראדו"],
        bestMethod: "טרולינג זהיר",
        reasoning: "הים קצת גלי, סע בזהירות וחפש את הטורפים בקווי העומק.",
        iconType: 'lure'
      };
    }
    if (c > 50) {
      return {
        species: ["לברק!", "גומבר", "לוקוס"],
        bestMethod: "ז'רז'ור (כלבים / מינואו)",
        reasoning: "ים עובד + עננות = זמן לברקים! טורפים יוצאים לאכול בקצף.",
        iconType: 'lure'
      };
    } else {
      return {
        species: ["סרגוס", "לוקוס", "דניס"],
        bestMethod: "דייג פיתיונות או בוס",
        reasoning: "מים עובדים עוזרים לדגים ביישנים לצאת לאכול.",
        iconType: 'bait'
      };
    }
  }
  
  // SCENARIO 3: Stormy/High Sea (ים גבוה/סוער)
  if (w > 1.2) {
    if (fishingStyle === 'kayak') {
      return {
        species: [],
        bestMethod: "להישאר בבית",
        reasoning: "הים סוער מדי לקיאק. סכנת חיים.",
        iconType: 'lure'
      };
    }
    return {
      species: ["סרגוס גדול", "לבט (שישן)", "לוקוס מפלצת"],
      bestMethod: "דייג פיתיונות כבד מהחוף/סלעים",
      reasoning: "הים גועש. טורפי ז'רז'ור יתרחקו, אבל דגי הקרקעית (סרגוסים) חוגגים בזרמים.",
      iconType: 'bait'
    };
  }

  // Generic fallback
  return {
    species: ["סרגוס", "טרחון"],
    bestMethod: "פיתיונות או ז'רז'ור קל",
    reasoning: "תנאים רגילים, הכל אפשרי.",
    iconType: 'lure'
  };
}`;

code = code.replace(regex, newCode);
fs.writeFileSync('src/lib/solunar.ts', code);
