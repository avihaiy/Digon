import { useState, useMemo } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useTackleBox, GearCategory } from "@/hooks/useTackleBox";
import { useMarineWeather } from "@/hooks/useMarineWeather";
import { BrainCircuit } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Plus, Package, Fish, Anchor, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const CATEGORIES: { id: GearCategory, name: string, icon: React.ReactNode } = [
  { id: "rod", name: "חכה", icon: <div className="w-2 h-10 bg-slate-400 rounded-full rotate-45" /> },
  { id: "reel", name: "רולר", icon: <div className="w-6 h-6 rounded-full border-4 border-slate-500" /> },
  { id: "lure", name: "דמוי / פיתיון", icon: <Fish className="w-5 h-5 text-emerald-500" /> },
  { id: "line", name: "חוט", icon: <div className="w-6 h-6 rounded-full border border-dashed border-slate-500" /> },
  { id: "accessory", name: "אביזר", icon: <Anchor className="w-5 h-5 text-slate-500" /> },
];

export default function TackleBox() {
  const { gear, addGear, removeGear } = useTackleBox();
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
      const heavy = gear.find(g => g.category === 'lure' && (g.name.includes('ג\'יג') || g.name.includes('כבד') || g.name.toLowerCase().includes('jig')));
      return {
        text: 'הגלים גבוהים יחסית (מעל 1 מטר). קח איתך דמוי כבד יותר כמו ג\'יג:',
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

  const [open, setOpen] = useState(false);
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
      
      const gearListStr = gear.map(g => `${g.category}: ${g.brand} ${g.name} (${g.specs || 'ללא מפרט'})`).join('\n');
      
      const prompt = `
      You are a professional fishing tackle advisor in Israel. 
      The user wants to know what setup (rod, reel, lure) to tie on RIGHT NOW based on their actual tackle box and current marine weather.
      
      Marine Weather right now:
      Wave Height: ${marineData.waveHeight}m
      Wind Speed: ${marineData.windSpeed} km/h
      Water Temp: ${marineData.temperature}°C
      Cloud Cover: ${marineData.cloudCover}%
      
      User's Tackle Box:
      ${gearListStr}
      
      Reply in Hebrew. Be enthusiastic but professional. Suggest one specific combo (rod+reel+lure/bait) from their box that fits the weather, and explain briefly WHY it fits (e.g., "The waves are high, so use this heavy jig with your powerful rod"). Keep it under 4 sentences.
      `;
      
      const result = await model.generateContent(prompt);
      setAiAdvice(result.response.text());
    } catch (e) {
      console.error(e);
      setAiAdvice("התרחשה שגיאה בהתייעצות עם המומחה. נסה שוב.");
    } finally {
      setAiLoading(false);
    }
  };
  
  const [category, setCategory] = useState<string>("rod");
  const [specs, setSpecs] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [brand, setBrand] = useState("");
  const [name, setName] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !brand) {
      toast.error("אנא מלא את שם המוצר והמותג");
      return;
    }

    addGear({
      category: category as GearCategory,
      brand,
      name
    });

    setOpen(false);
    setBrand("");
    setName("");
    toast.success("הפריט נוסף לקופסה בהצלחה!");
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto min-h-[calc(100vh-80px)] flex flex-col">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 mt-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            קופסת הציוד שלי <Package className="w-6 h-6 text-primary" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            הציוד שילווה אותך לים
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="icon" className="h-12 w-12 rounded-full shadow-lg">
              <Plus className="w-6 h-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-2 text-slate-800 dark:text-slate-100"><Package className="w-7 h-7 text-cyan-500" /> הוספת ציוד לקופסה</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 font-bold">סוג הציוד</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-14 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-cyan-500 shadow-inner font-medium text-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 font-bold">מותג (לדוגמה: Shimano, Daiwa)</Label>
                <Input 
                  value={brand} 
                  onChange={(e) => setBrand(e.target.value)} 
                  className="h-14 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-inner font-medium text-lg placeholder:text-slate-400 dark:placeholder:text-slate-500" 
                  placeholder="הזן מותג..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 font-bold">שם הדגם / הציוד</Label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="h-14 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-inner font-medium text-lg placeholder:text-slate-400 dark:placeholder:text-slate-500" 
                  placeholder="לדוגמה: Stradic CI4+"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 font-bold">מפרט טכני (אופציונלי)</Label>
                <Input 
                  value={specs} 
                  onChange={(e) => setSpecs(e.target.value)} 
                  className="h-14 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 shadow-inner font-medium text-lg placeholder:text-slate-400 dark:placeholder:text-slate-500" 
                  placeholder={
                    category === 'rod' ? 'לדוגמה: משקלי זריקה 10-30g' : 
                    category === 'reel' ? 'לדוגמה: מידה 3000' : 
                    category === 'lure' ? 'לדוגמה: 15g Sinking' : 
                    'לדוגמה: מידה / משקל / צבע'
                  }
                />
              </div>
              <Button type="submit" className="w-full h-14 rounded-2xl text-lg font-black mt-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all duration-300 border-0">
                הוסף לקופסה
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
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
      )}

      {/* Filter Tabs */}
      {gear.length > 0 && (
        <div className="px-4 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex items-center gap-2 min-w-max">
            <button
              onClick={() => setFilterCategory("all")}
              className={`px-4 py-2 rounded-2xl text-sm font-bold transition-colors ${filterCategory === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
            >
              הכל
            </button>
            {CATEGORIES.map(c => (
              <button
                key={c.id}
                onClick={() => setFilterCategory(c.id)}
                className={`px-4 py-2 rounded-2xl text-sm font-bold transition-colors flex items-center gap-1.5 ${filterCategory === c.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 flex-1">
        {gear.length === 0 ? (
          <div className="text-center p-8 bg-muted/30 rounded-3xl mt-8">
            <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground font-medium mb-4">הקופסה שלך ריקה.</p>
            <Button variant="outline" onClick={() => setOpen(true)} className="rounded-2xl border-primary/20 hover:bg-primary/5">
              הוסף פריט ראשון
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {gear.filter(item => filterCategory === "all" || item.category === filterCategory).map((item) => {
                const cat = CATEGORIES.find(c => c.id === item.category);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="border-border/50 shadow-sm overflow-hidden group">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
                            {cat?.icon}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-primary mb-0.5">{cat?.name} | {item.brand}</div>
                            <div className="font-bold text-base">{item.name}</div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeGear(item.id)}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
