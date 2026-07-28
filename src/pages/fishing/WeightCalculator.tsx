import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Scale, Info, Ruler } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const FISH_FACTORS = [
  { id: "locus", name: "לוקוס (דקר)", factor: 1.8 },
  { id: "denis", name: "דניס", factor: 1.5 },
  { id: "sargus", name: "סרגוס", factor: 1.4 },
  { id: "tuna", name: "טונה / פלמידה", factor: 1.9 },
  { id: "mali", name: "אינטיאס", factor: 1.7 },
  { id: "barracuda", name: "ברקודה (מליטה)", factor: 0.6 },
  { id: "generic", name: "כללי (ממוצע)", factor: 1.0 },
];

export default function WeightCalculator() {
  const [length, setLength] = useState<string>("");
  const [selectedFish, setSelectedFish] = useState<string>("generic");

  const calculateWeight = () => {
    const l = parseFloat(length);
    if (isNaN(l) || l <= 0) return null;

    const fish = FISH_FACTORS.find(f => f.id === selectedFish);
    const factor = fish ? fish.factor : 1.0;

    // Formula: Weight (kg) = (Length(cm)^3) / 100000 * factor
    // This is a simplified length-weight relationship for common fish shapes
    const weightInKg = (Math.pow(l, 3) / 100000) * factor;
    return weightInKg;
  };

  const weight = calculateWeight();

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto min-h-[calc(100vh-80px)]">
      
      {/* Header */}
      <div className="flex flex-col px-4 mt-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          מחשבון משקל <Scale className="w-6 h-6 text-primary" />
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          תפסת דג ואין לך משקל? הכנס את האורך שלו!
        </p>
      </div>

      <div className="px-4 space-y-6">
        <Card className="border-border/50 shadow-sm rounded-3xl overflow-hidden">
          <CardContent className="p-6 space-y-5">
            
            <div className="space-y-2">
              <Label className="text-sm font-bold">סוג הדג</Label>
              <Select value={selectedFish} onValueChange={setSelectedFish}>
                <SelectTrigger className="w-full h-12 rounded-2xl bg-muted/50 border-0">
                  <SelectValue placeholder="בחר סוג דג" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {FISH_FACTORS.map(fish => (
                    <SelectItem key={fish.id} value={fish.id}>{fish.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-bold flex items-center gap-2">
                <Ruler className="w-4 h-4 text-muted-foreground" />
                אורך הדג (בסנטימטרים)
              </Label>
              <div className="relative">
                <Input 
                  type="number" 
                  placeholder="לדוגמה: 45"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="h-14 rounded-2xl bg-muted/50 border-0 text-lg pe-12"
                />
                <span className="absolute end-4 top-4 text-muted-foreground font-medium">ס״מ</span>
              </div>
            </div>

          </CardContent>
        </Card>

        <AnimatePresence>
          {weight !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Card className="border-primary/20 shadow-lg bg-gradient-to-br from-primary/10 to-primary/5 rounded-3xl overflow-hidden text-center relative">
                <CardContent className="p-8">
                  <p className="text-sm font-bold text-muted-foreground mb-2">משקל מוערך:</p>
                  <div className="flex items-end justify-center gap-2 text-primary">
                    <span className="text-5xl font-black">{weight >= 1 ? weight.toFixed(2) : (weight * 1000).toFixed(0)}</span>
                    <span className="text-xl font-bold mb-1">{weight >= 1 ? "ק״ג" : "גרם"}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-3xl flex gap-3 items-start mt-4">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-600 text-sm">איך זה עובד?</h4>
            <p className="text-xs text-amber-600/80 mt-1 leading-relaxed">
              המחשבון מבוסס על מודלים של ביולוגיה ימית המעריכים משקל לפי יחס אורך-משקל של מיני דגים שונים. התוצאה היא הערכה בלבד ועשויה להשתנות לפי מצב הדג (לפני/אחרי הטלה, תזונה וכו').
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
