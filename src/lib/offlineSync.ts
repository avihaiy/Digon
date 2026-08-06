import { get, set } from 'idb-keyval';
import { databases, storage, APPWRITE_DB_ID, APPWRITE_CATCHES_ID, APPWRITE_CATCH_IMAGES_BUCKET_ID } from './appwrite';
import { ID } from 'appwrite';

const PENDING_CATCHES_KEY = 'pending_catches';

export interface PendingCatch {
  id: string;
  userId: string;
  timestamp: number;
  data: any; // The catch data payload
  imageFile?: File | null; // The file object
}

export async function saveCatchOffline(catchData: PendingCatch) {
  const pending = await get<PendingCatch[]>(PENDING_CATCHES_KEY) || [];
  pending.push(catchData);
  await set(PENDING_CATCHES_KEY, pending);
}

export async function getPendingCatches(): Promise<PendingCatch[]> {
  return await get<PendingCatch[]>(PENDING_CATCHES_KEY) || [];
}

export async function clearPendingCatches() {
  await set(PENDING_CATCHES_KEY, []);
}

export async function syncOfflineCatches() {
  if (!navigator.onLine) return { success: false, message: 'עדיין אין חיבור לאינטרנט' };
  
  const pending = await getPendingCatches();
  if (pending.length === 0) return { success: true, message: 'אין תפיסות לסנכרן', count: 0 };
  
  let successCount = 0;
  const newPending = [];
  
  for (const item of pending) {
    try {
      let imageId = null;
      if (item.imageFile) {
        // Upload image first
        const uploadRes = await storage.createFile(
          APPWRITE_CATCH_IMAGES_BUCKET_ID,
          ID.unique(),
          item.imageFile
        );
        imageId = uploadRes.$id;
      }
      
      // Merge image ID into data
      const payload = { ...item.data };
      if (imageId) {
        payload.image_id = imageId;
      }
      
      // Save to database
      await databases.createDocument(
        APPWRITE_DB_ID,
        APPWRITE_CATCHES_ID,
        ID.unique(),
        payload
      );
      
      successCount++;
    } catch (e) {
      console.error('Failed to sync catch:', item, e);
      newPending.push(item); // Keep it in queue if failed
    }
  }
  
  // Save remaining (failed) items back to queue
  await set(PENDING_CATCHES_KEY, newPending);
  
  return { 
    success: successCount > 0, 
    count: successCount, 
    message: `סונכרנו בהצלחה ${successCount} תפיסות מהאופליין!` 
  };
}
