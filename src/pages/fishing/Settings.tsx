import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell, BellRing, Settings2, Info } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Settings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("הדפדפן שלך לא תומך בהתראות.");
      return;
    }

    try {
      const p = await Notification.requestPermission();
      setPermission(p);
      if (p === "granted") {
        setNotificationsEnabled(true);
        toast.success("התראות הופעלו בהצלחה!");
      } else {
        setNotificationsEnabled(false);
        toast.error("יש לאשר התראות בהגדרות הדפדפן/מכשיר.");
      }
    } catch (e) {
      console.error(e);
      toast.error("אירעה שגיאה בבקשת הרשאת התראות.");
    }
  };

  const simulateGoldWindow = () => {
    if (permission !== "granted") {
      toast.error("יש להפעיל התראות קודם.");
      return;
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification("דיגון - חלון זהב מתקרב! 🌅", {
          body: "הים פלטה ויש שקיעה מטורפת. זה הזמן לארוז את החכות ולצאת לים!",
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png",
          tag: "gold-window",
          requireInteraction: true,
          vibrate: [200, 100, 200]
        });
        toast.success("נשלחה התראת ניסיון. תבדוק את המסך שלך!");
      });
    } else {
      // Fallback for non-SW browsers
      new Notification("דיגון - חלון זהב מתקרב! 🌅", {
        body: "הים פלטה ויש שקיעה מטורפת. זה הזמן לארוז את החכות ולצאת לים!",
        icon: "/pwa-192x192.png"
      });
      toast.success("נשלחה התראת ניסיון.");
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto min-h-[calc(100vh-80px)]">
      
      <div className="flex flex-col px-4 mt-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          הגדרות מתקדמות <Settings2 className="w-6 h-6 text-primary" />
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          נהל את ההתראות החכמות של דיגון
        </p>
      </div>

      <div className="px-4 space-y-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="p-5 flex items-center justify-between border-b border-border/50">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${notificationsEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Bell className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">התראות פוש (Push)</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">קבל עדכונים על חלונות זהב בזמן אמת</p>
                  </div>
                </div>
                <Switch 
                  checked={notificationsEnabled} 
                  onCheckedChange={(checked) => {
                    if (checked && permission !== "granted") {
                      requestPermission();
                    } else if (!checked) {
                      setNotificationsEnabled(false);
                      toast.info("התראות כובו מקומית. שים לב שכדי לבטל לחלוטין צריך לשנות בהגדרות הדפדפן.");
                    }
                  }} 
                />
              </div>

              {notificationsEnabled && (
                <div className="bg-primary/5 p-5">
                  <Button 
                    className="w-full h-12 rounded-2xl gap-2 font-bold shadow-sm" 
                    onClick={simulateGoldWindow}
                  >
                    <BellRing className="w-5 h-5" />
                    שלח התראת ניסיון (חלון זהב)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-3xl flex gap-3 items-start mt-4">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-blue-600 text-sm">איך ההתראות עובדות?</h4>
            <p className="text-xs text-blue-600/80 mt-1 leading-relaxed">
              מערכת ההתראות של דיגון משתמשת ביכולות הדפדפן (Web Push). כשתאשר את קבלת ההתראות, תוכל לקבל הודעות ישירות למסך הנעילה שלך על תנאי ים מעולים לדייג באזורך!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
