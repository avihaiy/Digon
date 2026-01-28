/**
 * Offline Storage Module
 * Uses IndexedDB for local data persistence
 */

const DB_NAME = 'gabai-offline-db';
const DB_VERSION = 1;

interface PendingAction {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: string;
  data: Record<string, unknown>;
  timestamp: number;
}

interface CachedData {
  table: string;
  data: unknown[];
  timestamp: number;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store for pending actions (to sync when online)
        if (!db.objectStoreNames.contains('pendingActions')) {
          db.createObjectStore('pendingActions', { keyPath: 'id' });
        }

        // Store for cached data
        if (!db.objectStoreNames.contains('cachedData')) {
          db.createObjectStore('cachedData', { keyPath: 'table' });
        }

        // Store for sync metadata
        if (!db.objectStoreNames.contains('syncMeta')) {
          db.createObjectStore('syncMeta', { keyPath: 'key' });
        }
      };
    });

    return this.initPromise;
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // Pending Actions
  async addPendingAction(action: Omit<PendingAction, 'id' | 'timestamp'>): Promise<string> {
    const store = await this.getStore('pendingActions', 'readwrite');
    const id = crypto.randomUUID();
    const pendingAction: PendingAction = {
      ...action,
      id,
      timestamp: Date.now(),
    };
    
    return new Promise((resolve, reject) => {
      const request = store.add(pendingAction);
      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingActions(): Promise<PendingAction[]> {
    const store = await this.getStore('pendingActions');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async removePendingAction(id: string): Promise<void> {
    const store = await this.getStore('pendingActions', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearPendingActions(): Promise<void> {
    const store = await this.getStore('pendingActions', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Cached Data
  async cacheData(table: string, data: unknown[]): Promise<void> {
    const store = await this.getStore('cachedData', 'readwrite');
    const cachedData: CachedData = {
      table,
      data,
      timestamp: Date.now(),
    };
    
    return new Promise((resolve, reject) => {
      const request = store.put(cachedData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCachedData<T>(table: string): Promise<{ data: T[]; timestamp: number } | null> {
    const store = await this.getStore('cachedData');
    return new Promise((resolve, reject) => {
      const request = store.get(table);
      request.onsuccess = () => {
        if (request.result) {
          resolve({ data: request.result.data as T[], timestamp: request.result.timestamp });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Sync Metadata
  async setSyncMeta(key: string, value: unknown): Promise<void> {
    const store = await this.getStore('syncMeta', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put({ key, value, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncMeta<T>(key: string): Promise<T | null> {
    const store = await this.getStore('syncMeta');
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        resolve(request.result?.value ?? null);
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineStorage = new OfflineStorage();
