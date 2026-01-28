import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { offlineStorage } from '@/lib/offline-storage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OfflineSyncContextType {
  isOnline: boolean;
  pendingActionsCount: number;
  lastSyncTime: Date | null;
  isSyncing: boolean;
  syncNow: () => Promise<void>;
  addOfflineAction: (type: 'insert' | 'update' | 'delete', table: string, data: Record<string, unknown>) => Promise<void>;
}

const OfflineSyncContext = createContext<OfflineSyncContextType | null>(null);

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingActionsCount, setPendingActionsCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('חזרת לאינטרנט! מסנכרן נתונים...');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('אין חיבור לאינטרנט. השינויים יישמרו מקומית.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load pending actions count
  const loadPendingCount = useCallback(async () => {
    try {
      const actions = await offlineStorage.getPendingActions();
      setPendingActionsCount(actions.length);
    } catch (error) {
      console.error('Failed to load pending actions:', error);
    }
  }, []);

  // Load last sync time
  useEffect(() => {
    const loadSyncTime = async () => {
      const time = await offlineStorage.getSyncMeta<number>('lastSyncTime');
      if (time) {
        setLastSyncTime(new Date(time));
      }
    };
    loadSyncTime();
    loadPendingCount();
  }, [loadPendingCount]);

  // Sync pending actions when online
  const syncNow = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    try {
      const actions = await offlineStorage.getPendingActions();
      
      if (actions.length === 0) {
        setIsSyncing(false);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const action of actions) {
        try {
          // Type-safe table access
          const validTables = ['members', 'payments', 'aliyot', 'receipts', 'budget_transactions', 'expenses'] as const;
          type ValidTable = typeof validTables[number];
          
          if (!validTables.includes(action.table as ValidTable)) {
            console.warn(`Unknown table: ${action.table}`);
            await offlineStorage.removePendingAction(action.id);
            continue;
          }

          const table = action.table as ValidTable;

          switch (action.type) {
            case 'insert':
              await supabase.from(table).insert(action.data as never);
              break;
            case 'update':
              if (action.data.id) {
                await supabase.from(table).update(action.data as never).eq('id', action.data.id as string);
              }
              break;
            case 'delete':
              if (action.data.id) {
                await supabase.from(table).delete().eq('id', action.data.id as string);
              }
              break;
          }
          
          await offlineStorage.removePendingAction(action.id);
          successCount++;
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`סונכרנו ${successCount} פעולות בהצלחה`);
      }
      if (failCount > 0) {
        toast.error(`${failCount} פעולות נכשלו בסנכרון`);
      }

      await offlineStorage.setSyncMeta('lastSyncTime', Date.now());
      setLastSyncTime(new Date());
      await loadPendingCount();
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('הסנכרון נכשל');
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, loadPendingCount]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingActionsCount > 0) {
      syncNow();
    }
  }, [isOnline, pendingActionsCount, syncNow]);

  // Add offline action
  const addOfflineAction = useCallback(async (
    type: 'insert' | 'update' | 'delete',
    table: string,
    data: Record<string, unknown>
  ) => {
    await offlineStorage.addPendingAction({ type, table, data });
    await loadPendingCount();
  }, [loadPendingCount]);

  return (
    <OfflineSyncContext.Provider value={{
      isOnline,
      pendingActionsCount,
      lastSyncTime,
      isSyncing,
      syncNow,
      addOfflineAction,
    }}>
      {children}
    </OfflineSyncContext.Provider>
  );
}

export function useOfflineSync() {
  const context = useContext(OfflineSyncContext);
  if (!context) {
    throw new Error('useOfflineSync must be used within OfflineSyncProvider');
  }
  return context;
}
