const fs = require('fs');

let code = fs.readFileSync('src/pages/fishing/TackleBox.tsx', 'utf8');

if (!code.includes('useMarineWeather')) {
  code = code.replace(
    /import { useTackleBox, GearCategory } from "@\/hooks\/useTackleBox";/,
    `import { useTackleBox, GearCategory } from "@/hooks/useTackleBox";\nimport { useMarineWeather } from "@/hooks/useMarineWeather";\nimport { BrainCircuit } from "lucide-react";`
  );
  
  // Also add `useMemo` if not imported
  if (!code.includes('useMemo')) {
    code = code.replace(/import { useState } from "react";/, `import { useState, useMemo } from "react";`);
  }
}

const hookStr = `  const { gear, addGear, removeGear } = useTackleBox();`;
const newHook = `  const { gear, addGear, removeGear } = useTackleBox();
  const { data: marineData } = useMarineWeather();

  const smartRecommendation = useMemo(() => {
    if (!gear.length) return null;
    if (marineData.isTurbid) {
      const brightLure = gear.find(g => g.category === 'lure' && (g.name.includes('זוהר') || g.name.includes('צהוב') || g.name.includes('לבן') || g.name.includes('רועש') || g.brand.toLowerCase().includes('topwater')));
      return {
        text: 'המים עכורים היום (Turbid). מומלץ להשתמש בדמוי בולט, בהיר או מרעיש:',
        item: brightLure || gear.find(g => g.category === 'lure') || gear[0]
      };
    }
    if (marineData.waveHeight && marineData.waveHeight > 1.0) {
      const heavy = gear.find(g => g.category === 'lure' && (g.name.includes('ג\\'יג') || g.name.includes('כבד') || g.name.toLowerCase().includes('jig')));
      return {
        text: 'הגלים גבוהים יחסית (מעל 1 מטר). קח איתך דמוי כבד יותר כמו ג\\'יג:',
        item: heavy || gear[0]
      };
    }
    if (marineData.cloudCover && marineData.cloudCover < 30 && marineData.waveHeight && marineData.waveHeight <= 0.6) {
      const topwater = gear.find(g => g.category === 'lure' && (g.name.includes('פופר') || g.name.includes('טופ') || g.name.toLowerCase().includes('popper') || g.name.toLowerCase().includes('top')));
      return {
        text: 'הים פלטה ויש שמש! זמן מעולה לדמויי טופ-ווטר / כלבים:',
        item: topwater || gear.find(g => g.category === 'lure') || gear[0]
      };
    }
    
    // Default fallback
    return {
      text: 'מזג האוויר קלאסי. פריט מומלץ מהקופסה שלך להיום:',
      item: gear.find(g => g.category === 'lure') || gear[0]
    };
  }, [gear, marineData]);
`;

if (!code.includes('useMarineWeather()')) {
  code = code.replace(hookStr, newHook);
}

const headerRegex = /\{\/\* Header \*\/\}\s*<div className="flex items-center justify-between px-4 mt-6">\s*<div>\s*<h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">\s*קופסת הציוד שלי <Package className="w-6 h-6 text-primary" \/>\s*<\/h1>\s*<p className="text-sm text-muted-foreground mt-1">\s*הציוד שילווה אותך לים\s*<\/p>\s*<\/div>\s*(?:<Dialog open=\{open\} onOpenChange=\{setOpen\}>[\s\S]*?<\/Dialog>)?\s*<\/div>/m;

const match = code.match(headerRegex);

if (match && !code.includes('Smart Recommendation')) {
  const replacement = match[0] + `
      {/* Smart Recommendation Banner */}
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
  code = code.replace(headerRegex, replacement);
}

fs.writeFileSync('src/pages/fishing/TackleBox.tsx', code);
