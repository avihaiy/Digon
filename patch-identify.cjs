const fs = require('fs');

let identifyCode = fs.readFileSync('src/pages/fishing/Identify.tsx', 'utf8');

// Upgrade model to 1.5-pro
identifyCode = identifyCode.replace(
  /model: "gemini-1\.5-flash"/,
  'model: "gemini-1.5-pro"'
);

// Upgrade prompt
const oldPromptRegex = /const prompt = `[\s\S]*?`;/;
const newPrompt = `const prompt = \`
        You are an expert marine biologist and fisherman in Israel (Mediterranean Sea, Red Sea, Sea of Galilee).
        Identify the fish in this image with maximum accuracy.
        First, analyze the shape, fins, scales, color patterns, and mouth.
        Consider common Israeli fish: דניס, ברמונדי, לוקוס, פרידה, אנטיאס, פלמידה, גומבר, בורי, אראס, אבו נפחא, מרמיר, סרגוס, טרכון, שולה, טונה שחורה, חרב, אבונפחא.
        If it's an invasive species from the Red Sea (Lessepsian migration), note it.
        If the image DOES NOT contain a fish or marine creature, return "לא זוהה דג בתמונה" for the name, 0 for confidence, and explain what you see in the description.
        Respond in pure JSON format (without markdown blocks) with the following structure:
        {
          "name": "Hebrew name of the fish (and common nickname)",
          "confidence": number between 0-100,
          "kosher": boolean,
          "danger": "string warning if it's venomous/poisonous (like Aras or Abu Nafha), otherwise null",
          "description": "Short description in Hebrew",
          "tips": "One short fishing tip or culinary tip in Hebrew",
          "minSize": "Minimum legal catch size in Israel (e.g. 45 ס״מ) or 'אין הגבלה'",
          "bestBait": "Recommended bait in Hebrew"
        }
      \`;`;
identifyCode = identifyCode.replace(oldPromptRegex, newPrompt);


// Add UI Edit logic
if (!identifyCode.includes('isEditingName')) {
  // 1. Add state imports if needed, but it already has useState. We add state variables.
  identifyCode = identifyCode.replace(
    /const \[result, setResult\] = useState<ScanResult \| null>\(null\);/,
    `const [result, setResult] = useState<ScanResult | null>(null);\n  const [isEditingName, setIsEditingName] = useState(false);\n  const [manualName, setManualName] = useState("");`
  );

  // 2. Add Edit button / Input in the UI
  // Find the h3 rendering result.name
  const nameUI = `<h3 className="font-black text-2xl text-slate-900 dark:text-white leading-tight">\n                          {result.name}\n                        </h3>`;
  const editUI = `{isEditingName ? (
                          <div className="flex items-center gap-2 mt-1">
                            <input 
                              type="text" 
                              value={manualName} 
                              onChange={(e) => setManualName(e.target.value)}
                              className="border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-sm bg-background w-40 font-bold"
                              placeholder="הכנס שם נכון..."
                              autoFocus
                            />
                            <Button 
                              size="sm" 
                              onClick={() => {
                                setResult({...result, name: manualName});
                                setIsEditingName(false);
                              }}
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                            >
                              שמור
                            </Button>
                          </div>
                        ) : (
                          <h3 className="font-black text-2xl text-slate-900 dark:text-white leading-tight flex items-center gap-2">
                            {result.name}
                            <button 
                              onClick={() => {
                                setManualName(result.name);
                                setIsEditingName(true);
                              }}
                              className="text-xs text-muted-foreground underline opacity-50 hover:opacity-100 font-normal"
                            >
                              (זיהוי שגוי?)
                            </button>
                          </h3>
                        )}`;
  
  identifyCode = identifyCode.replace(nameUI, editUI);
}

fs.writeFileSync('src/pages/fishing/Identify.tsx', identifyCode);
