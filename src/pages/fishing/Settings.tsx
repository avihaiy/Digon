import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell, BellRing, Settings2, Info, Moon, Sun, Waves, Volume2, Vibrate, MapPinOff, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/useAuth";

export default function Settings() {
  const { user, prefs, updateUserPrefs, logout } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const { theme, setTheme } = useTheme();

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

        {/* Theme Settings */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardContent className="p-5">
              <h3 className="font-bold text-base mb-4">תצוגה ועיצוב</h3>
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant={theme === 'light' ? 'default' : 'outline'} 
                  className={`flex flex-col items-center justify-center h-20 gap-2 rounded-2xl ${theme === 'light' ? 'bg-primary text-primary-foreground' : ''}`}
                  onClick={() => setTheme('light')}
                >
                  <Sun className="w-6 h-6" />
                  <span className="text-xs">בהיר</span>
                </Button>
                <Button 
                  variant={theme === 'dark' ? 'default' : 'outline'} 
                  className={`flex flex-col items-center justify-center h-20 gap-2 rounded-2xl ${theme === 'dark' ? 'bg-slate-800 text-white border-slate-700' : ''}`}
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="w-6 h-6" />
                  <span className="text-xs">כהה</span>
                </Button>
                <Button 
                  variant={theme === 'ocean' ? 'default' : 'outline'} 
                  className={`flex flex-col items-center justify-center h-20 gap-2 rounded-2xl ${theme === 'ocean' ? 'bg-blue-900 text-cyan-400 border-blue-800' : ''}`}
                  onClick={() => setTheme('ocean')}
                >
                  <Waves className="w-6 h-6" />
                  <span className="text-xs">אוקיינוס</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Push Notifications */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
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

        {/* Accessibility Settings */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-border/50 shadow-sm overflow-hidden mt-4">
            <CardContent className="p-0 divide-y divide-border/50">
              {/* Large Text */}
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${prefs?.a11y_large_text ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <span className="text-xl font-black leading-none">A</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-base">טקסט גדול</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">הגדל את הטקסט בכל האפליקציה</p>
                  </div>
                </div>
                <Switch 
                  checked={!!prefs?.a11y_large_text} 
                  onCheckedChange={(checked) => {
                    updateUserPrefs({ ...prefs, a11y_large_text: checked });
                  }} 
                />
              </div>

              {/* Reduce Motion */}
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${prefs?.a11y_reduce_motion ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z"/><path d="m9 10 2 2 4-4"/></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-base">צמצום אנימציות</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">ביטול תזוזות ומעברים</p>
                  </div>
                </div>
                <Switch 
                  checked={!!prefs?.a11y_reduce_motion} 
                  onCheckedChange={(checked) => {
                    updateUserPrefs({ ...prefs, a11y_reduce_motion: checked });
                  }} 
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Preferences */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-border/50 shadow-sm overflow-hidden mt-4">
            <CardContent className="p-0 divide-y divide-border/50">
              {/* Sound */}
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${prefs?.sound_enabled !== false ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Volume2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">צלילי מערכת</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">קולות תפיסה וכפתורים</p>
                  </div>
                </div>
                <Switch 
                  checked={prefs?.sound_enabled !== false} 
                  onCheckedChange={(checked) => {
                    updateUserPrefs({ ...prefs, sound_enabled: checked });
                  }} 
                />
              </div>

              {/* Haptics */}
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${prefs?.haptics_enabled !== false ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Vibrate className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">רטט (Haptics)</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">תחושה מוחשית בלחיצות</p>
                  </div>
                </div>
                <Switch 
                  checked={prefs?.haptics_enabled !== false} 
                  onCheckedChange={(checked) => {
                    updateUserPrefs({ ...prefs, haptics_enabled: checked });
                  }} 
                />
              </div>

              {/* Privacy Location */}
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${prefs?.privacy_hide_location ? 'bg-rose-500/10 text-rose-500' : 'bg-muted text-muted-foreground'}`}>
                    <MapPinOff className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">הסתרת מיקום מדויק</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">יסיר קישורי מפות מדיווחי התפיסות שלך</p>
                  </div>
                </div>
                <Switch 
                  checked={!!prefs?.privacy_hide_location} 
                  onCheckedChange={(checked) => {
                    updateUserPrefs({ ...prefs, privacy_hide_location: checked });
                  }} 
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Account Management */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h3 className="font-bold text-base mb-3 mt-6">ניהול חשבון</h3>
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full h-12 justify-start px-5 font-bold"
              onClick={() => logout()}
            >
              <LogOut className="w-5 h-5 ml-3 text-slate-500" />
              התנתקות מהחשבון
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full h-12 justify-start px-5 font-bold text-rose-500 border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
              onClick={() => {
                toast.error("למחיקת חשבון לצמיתות יש לפנות למנהל בווטסאפ מטעמי אבטחה.");
              }}
            >
              <Trash2 className="w-5 h-5 ml-3" />
              מחיקת חשבון ונתונים (GDPR)
            </Button>
          </div>
        </motion.div>

        <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-3xl flex gap-3 items-start mt-6">
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
