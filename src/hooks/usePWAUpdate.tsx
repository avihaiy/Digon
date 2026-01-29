import { createContext, useContext, useState, ReactNode } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';

interface PWAUpdateContextType {
  needRefresh: boolean;
  updateServiceWorker: () => Promise<void>;
  dismissUpdate: () => void;
}

const PWAUpdateContext = createContext<PWAUpdateContextType | undefined>(undefined);

export function PWAUpdateProvider({ children }: { children: ReactNode }) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegistered(registration) {
      console.log('SW Registered:', registration);
      
      // Check for updates every 10 seconds
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 10 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
    onOfflineReady() {
      toast.success('האפליקציה מוכנה לעבודה אופליין');
    },
  });

  const handleUpdate = async () => {
    await updateServiceWorker(true);
  };

  const dismissUpdate = () => {
    setNeedRefresh(false);
  };

  return (
    <PWAUpdateContext.Provider value={{ 
      needRefresh, 
      updateServiceWorker: handleUpdate,
      dismissUpdate 
    }}>
      {children}
    </PWAUpdateContext.Provider>
  );
}

export function usePWAUpdate() {
  const context = useContext(PWAUpdateContext);
  if (context === undefined) {
    throw new Error('usePWAUpdate must be used within a PWAUpdateProvider');
  }
  return context;
}
