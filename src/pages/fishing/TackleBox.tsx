import { useState, useMemo } from "react";
import { useTackleBox, GearCategory } from "@/hooks/useTackleBox";
import { useMarineWeather } from "@/hooks/useMarineWeather";
import { BrainCircuit } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Plus, Package, Fish, Anchor } from "lucide-react";
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
  
  const [category, setCategory] = useState<string>("rod");
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
          <DialogContent className="rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-xl">הוספת ציוד חדש</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>סוג הציוד</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-12 rounded-2xl bg-muted/50 border-0">
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
                <Label>מותג (לדוגמה: Shimano, Daiwa)</Label>
                <Input 
                  value={brand} 
                  onChange={(e) => setBrand(e.target.value)} 
                  className="h-12 rounded-2xl bg-muted/50 border-0" 
                  placeholder="הזן מותג..."
                />
              </div>
              <div className="space-y-2">
                <Label>שם הדגם / הציוד</Label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="h-12 rounded-2xl bg-muted/50 border-0" 
                  placeholder="לדוגמה: Stradic CI4+"
                />
              </div>
              <Button type="submit" className="w-full h-12 rounded-2xl text-lg font-bold mt-2">
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
              {gear.map((item) => {
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
