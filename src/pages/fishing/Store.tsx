import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store as StoreIcon, ShieldCheck, Ticket, User, Gem, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Store() {
  const { points, profileData, updateProfileField } = useAuth();
  const [loading, setLoading] = useState(false);

  const buyItem = async (cost: number, field: string, value: any, itemName: string, isIncrement = false) => {
    if (points < cost) {
      toast.error("אין לך מספיק נקודות דיגון!");
      return;
    }

    setLoading(true);
    try {
      // Deduct points
      const newPoints = points - cost;
      await updateProfileField('points', newPoints);

      // Give item
      let finalValue = value;
      if (isIncrement) {
        const currentVal = profileData?.[field] || 0;
        finalValue = currentVal + value;
      }
      
      const success = await updateProfileField(field, finalValue);
      if (success) {
        toast.success(`התחדשת ב-${itemName}!`);
      } else {
        toast.error("אירעה שגיאה בביצוע הרכישה.");
      }
    } catch (e) {
      toast.error("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  };

  const hasGoldBorder = profileData?.border === 'gold';
  const hasTitleMaster = profileData?.title === 'מלך הלוקוסים';
  const ticketsCount = profileData?.tickets || 0;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto min-h-[calc(100vh-80px)]">
      <div className="flex flex-col px-4 mt-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          חנות דיגון <StoreIcon className="w-6 h-6 text-primary" />
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          המר את הנקודות שלך להטבות מטורפות
        </p>
      </div>

      <div className="px-4">
        <Card className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-yellow-500/20 shadow-none">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-full">
                <span className="text-xl">🪙</span>
              </div>
              <div>
                <p className="text-xs text-yellow-600 dark:text-yellow-500 font-bold">היתרה שלך</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{points} נק׳</p>
              </div>
            </div>
            {points < 50 && (
              <div className="text-xs text-muted-foreground bg-background/50 px-3 py-1.5 rounded-full border border-border">
                תעלה תפיסות כדי להרוויח עוד
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="px-4 space-y-4">
        {/* Cosmetics */}
        <div>
          <h3 className="font-bold text-base mb-3 flex items-center gap-2">
            <Gem className="w-5 h-5 text-purple-500" /> עיצוב פרופיל
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Card className={`border-2 ${hasGoldBorder ? 'border-yellow-500' : 'border-border/50'}`}>
              <CardContent className="p-4 text-center">
                <div className="w-16 h-16 rounded-full mx-auto border-4 border-yellow-400 bg-muted mb-3 flex items-center justify-center">
                  <User className="w-6 h-6 text-yellow-600" />
                </div>
                <h4 className="font-bold text-sm mb-1">טבעת פרופיל מוזהבת</h4>
                <p className="text-xs text-muted-foreground mb-3">יופיע בטבלת המובילים</p>
                {hasGoldBorder ? (
                  <Button disabled variant="outline" className="w-full h-8 text-xs font-bold text-yellow-600 border-yellow-500">בבעלותך</Button>
                ) : (
                  <Button 
                    disabled={loading || points < 50} 
                    onClick={() => buyItem(50, 'border', 'gold', 'טבעת מוזהבת')}
                    className="w-full h-8 text-xs font-bold bg-yellow-500 hover:bg-yellow-600 text-white"
                  >
                    50 נק׳
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className={`border-2 ${hasTitleMaster ? 'border-primary' : 'border-border/50'}`}>
              <CardContent className="p-4 text-center">
                <div className="w-16 h-16 rounded-full mx-auto bg-primary/10 mb-3 flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-primary" />
                </div>
                <h4 className="font-bold text-sm mb-1">תואר "מלך הלוקוסים"</h4>
                <p className="text-xs text-muted-foreground mb-3">יופיע ליד שמך</p>
                {hasTitleMaster ? (
                  <Button disabled variant="outline" className="w-full h-8 text-xs font-bold text-primary border-primary">בבעלותך</Button>
                ) : (
                  <Button 
                    disabled={loading || points < 30} 
                    onClick={() => buyItem(30, 'title', 'מלך הלוקוסים', 'תואר חדש')}
                    className="w-full h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-white"
                  >
                    30 נק׳
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Raffles */}
        <div className="mt-8">
          <h3 className="font-bold text-base mb-3 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-rose-500" /> כרטיסי הגרלה
          </h3>
          <Card className="border-rose-500/30 bg-rose-500/5">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <h4 className="font-bold">הגרלת ציוד חודשית</h4>
                <p className="text-xs text-muted-foreground mt-1">ככל שתקנה יותר כרטיסים, הסיכוי לזכות עולה!</p>
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-600 rounded-full text-xs font-bold border border-rose-500/20">
                  <Ticket className="w-3.5 h-3.5" /> יש לך {ticketsCount} כרטיסים
                </div>
              </div>
              <Button 
                disabled={loading || points < 20} 
                onClick={() => buyItem(20, 'tickets', 1, 'כרטיס הגרלה', true)}
                className="h-12 rounded-2xl bg-rose-500 hover:bg-rose-600 font-bold px-6 shrink-0"
              >
                20 נק׳
              </Button>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
