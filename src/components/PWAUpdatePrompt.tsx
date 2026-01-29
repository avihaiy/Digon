import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';

export function PWAUpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegistered(registration) {
      console.log('SW Registered:', registration);
      
      // Check for updates every 10 seconds for faster detection
      if (registration) {
        // Check for updates every 10 seconds
        setInterval(() => {
          registration.update();
        }, 10 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
    onNeedRefresh() {
      setShowPrompt(true);
    },
    onOfflineReady() {
      toast.success('האפליקציה מוכנה לעבודה אופליין');
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setShowPrompt(true);
    }
  }, [needRefresh]);

  const handleUpdate = async () => {
    await updateServiceWorker(true);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setNeedRefresh(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-4">
      <div className="bg-primary text-primary-foreground rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">עדכון זמין!</h3>
            <p className="text-sm opacity-90 mt-1">
              גרסה חדשה של האפליקציה זמינה. רענן כדי לקבל את העדכונים האחרונים.
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleUpdate}
                className="gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                רענן עכשיו
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                אחר כך
              </Button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded hover:bg-primary-foreground/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
