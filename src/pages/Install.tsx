import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Smartphone, Monitor, CheckCircle2, Share, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(checkStandalone);
    
    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isStandalone || isInstalled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl">האפליקציה מותקנת!</CardTitle>
            <CardDescription>
              אפליקציית דיגון מותקנת על המכשיר שלך
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              פתח את האפליקציה
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center mb-4">
            <img 
              src="/digon-logo.jpg" 
              alt="לוגו דיגון" 
              className="w-16 h-16 rounded-xl object-cover shadow-sm"
            />
          </div>
          <CardTitle className="text-2xl">התקן את האפליקציה</CardTitle>
          <CardDescription>
            קבל גישה מהירה לאפליקציית דיגון ישירות מהמסך הראשי
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-4 h-4 text-primary" />
              </div>
              <span>גישה מהירה מהמסך הראשי</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Monitor className="w-4 h-4 text-primary" />
              </div>
              <span>חוויית שימוש כמו אפליקציה מקורית</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Download className="w-4 h-4 text-primary" />
              </div>
              <span>טעינה מהירה יותר</span>
            </div>
          </div>

          {/* Install Button or iOS Instructions */}
          {isIOS ? (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <p className="font-medium text-sm">להתקנה ב-iPhone/iPad:</p>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li className="flex items-center gap-2">
                    לחץ על כפתור השיתוף
                    <Share className="w-4 h-4 inline" />
                  </li>
                  <li>גלול למטה ובחר "הוסף למסך הבית"</li>
                  <li>לחץ "הוסף" בפינה הימנית העליונה</li>
                </ol>
              </div>
            </div>
          ) : deferredPrompt ? (
            <Button onClick={handleInstall} className="w-full" size="lg">
              <Download className="w-5 h-5 ml-2" />
              התקן עכשיו
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <p className="font-medium text-sm">להתקנה באנדרואיד:</p>
                <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                  <li className="flex items-center gap-2">
                    לחץ על תפריט הדפדפן
                    <MoreVertical className="w-4 h-4 inline" />
                  </li>
                  <li>בחר "התקן אפליקציה" או "הוסף למסך הבית"</li>
                  <li>אשר את ההתקנה</li>
                </ol>
              </div>
            </div>
          )}

          <Button variant="ghost" onClick={() => navigate('/')} className="w-full">
            המשך בדפדפן
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
