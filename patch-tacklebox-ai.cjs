const fs = require('fs');

let code = fs.readFileSync('src/pages/fishing/TackleBox.tsx', 'utf8');

// Add imports
code = code.replace(
  'import { useState, useMemo } from "react";',
  'import { useState, useMemo } from "react";\nimport { GoogleGenerativeAI } from "@google/generative-ai";'
);
code = code.replace(
  'import { Trash2, Plus, Package, Fish, Anchor } from "lucide-react";',
  'import { Trash2, Plus, Package, Fish, Anchor, Sparkles } from "lucide-react";'
);

// Add AI Advisor logic
const hookInsertMatch = 'const [open, setOpen] = useState(false);';
const hookInsertReplace = `const [open, setOpen] = useState(false);
  const [aiAdvisorOpen, setAiAdvisorOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);

  const getTackleAdvice = async () => {
    if (gear.length === 0) {
      toast.error("קופסת הציוד שלך ריקה. הוסף פריטים קודם.");
      return;
    }
    setAiAdvisorOpen(true);
    setAiLoading(true);
    setAiAdvice(null);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        toast.error("מפתח API חסר");
        setAiLoading(false);
        return;
      }
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
      
      const gearListStr = gear.map(g => \`\${g.category}: \${g.brand} \${g.name} (\${g.specs || 'ללא מפרט'})\`).join('\\n');
      
      const prompt = \`
      You are a professional fishing tackle advisor in Israel. 
      The user wants to know what setup (rod, reel, lure) to tie on RIGHT NOW based on their actual tackle box and current marine weather.
      
      Marine Weather right now:
      Wave Height: \${marineData.waveHeight}m
      Wind Speed: \${marineData.windSpeed} km/h
      Water Temp: \${marineData.temperature}°C
      Cloud Cover: \${marineData.cloudCover}%
      
      User's Tackle Box:
      \${gearListStr}
      
      Reply in Hebrew. Be enthusiastic but professional. Suggest one specific combo (rod+reel+lure/bait) from their box that fits the weather, and explain briefly WHY it fits (e.g., "The waves are high, so use this heavy jig with your powerful rod"). Keep it under 4 sentences.
      \`;
      
      const result = await model.generateContent(prompt);
      setAiAdvice(result.response.text());
    } catch (e) {
      console.error(e);
      setAiAdvice("התרחשה שגיאה בהתייעצות עם המומחה. נסה שוב.");
    } finally {
      setAiLoading(false);
    }
  };`;

code = code.replace(hookInsertMatch, hookInsertReplace);

// Add AI Advisor Button and Dialog
const bannerMatch = `{/* Smart Recommendation Banner */}
      {smartRecommendation && gear.length > 0 && (
        <div className="mx-4 mt-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-start gap-3 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/20 rounded-full blur-[40px] pointer-events-none" />
          <BrainCircuit className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-emerald-800 dark:text-emerald-300">המלצת AI יומית</h3>
            <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1 leading-tight">
              {smartRecommendation.text}
            </p>
            <div className="mt-2 inline-flex items-center gap-2 bg-white/60 dark:bg-black/20 px-3 py-1.5 rounded-lg border border-emerald-500/20">
              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{smartRecommendation.item?.brand} {smartRecommendation.item?.name}</span>
            </div>
          </div>
        </div>
      )}`;

const bannerReplace = `{/* AI Interactive Advisor */}
      {gear.length > 0 && (
        <div className="px-4 mt-2">
          <Button 
            onClick={getTackleAdvice}
            className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-lg shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
          >
            <Sparkles className="w-5 h-5" />
            מה לקשור עכשיו? (AI Advisor)
          </Button>

          <Dialog open={aiAdvisorOpen} onOpenChange={setAiAdvisorOpen}>
            <DialogContent className="rounded-3xl p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2 text-amber-500">
                  <Sparkles className="w-6 h-6" />
                  המלצת ה-Pro
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4 min-h-[100px] flex items-center justify-center">
                {aiLoading ? (
                  <div className="flex flex-col items-center gap-3 animate-pulse">
                    <BrainCircuit className="w-10 h-10 text-amber-500/50" />
                    <span className="text-amber-500/80 font-medium">מנתח את הציוד שלך ומזג האוויר בים...</span>
                  </div>
                ) : (
                  <p className="text-lg leading-relaxed text-slate-200">
                    {aiAdvice}
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Smart Recommendation Banner */}
      {smartRecommendation && gear.length > 0 && (
        <div className="mx-4 mt-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-start gap-3 shadow-sm relative overflow-hidden hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/20 rounded-full blur-[40px] pointer-events-none" />
          <BrainCircuit className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-emerald-800 dark:text-emerald-300">המלצת AI יומית</h3>
            <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-1 leading-tight">
              {smartRecommendation.text}
            </p>
            <div className="mt-2 inline-flex items-center gap-2 bg-white/60 dark:bg-black/20 px-3 py-1.5 rounded-lg border border-emerald-500/20">
              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{smartRecommendation.item?.brand} {smartRecommendation.item?.name}</span>
            </div>
          </div>
        </div>
      )}`;

code = code.replace(bannerMatch.replace(/\r\n/g, '\n'), bannerReplace.replace(/\r\n/g, '\n'));

fs.writeFileSync('src/pages/fishing/TackleBox.tsx', code);
