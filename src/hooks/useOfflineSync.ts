import { useEffect } from "react";
import { databases, storage, APPWRITE_DB_ID, APPWRITE_CATCHES_ID, APPWRITE_CATCH_IMAGES_BUCKET_ID } from "@/lib/appwrite";
import { ID } from "appwrite";
import { toast } from "sonner";

// Helper to convert base64 to File
function dataURLtoFile(dataurl: string, filename: string) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while(n--){
      u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, {type:mime});
}

export function useOfflineSync() {
  useEffect(() => {
    const syncOfflineCatches = async () => {
      const offlineCatchesStr = localStorage.getItem("offline_catches");
      if (!offlineCatchesStr) return;

      const offlineCatches = JSON.parse(offlineCatchesStr);
      if (offlineCatches.length === 0) return;

      toast.info(`מסנכרן ${offlineCatches.length} דיווחים שנשמרו באופליין...`);

      const remainingCatches = [];

      for (const catchData of offlineCatches) {
        try {
          const file = dataURLtoFile(catchData.imageBase64, `offline-${catchData.id}.jpg`);
          
          // 1. Upload Image
          const uploadedFile = await storage.createFile(APPWRITE_CATCH_IMAGES_BUCKET_ID, ID.unique(), file);
          
          // 2. Create Catch Document
          const docData = {
            user_id: catchData.user_id,
            user_name: catchData.user_name,
            fish_type: catchData.fish_type,
            weight: catchData.weight,
            location: catchData.location,
            image_id: uploadedFile.$id,
            status: 'pending'
          };

          await databases.createDocument(APPWRITE_DB_ID, APPWRITE_CATCHES_ID, ID.unique(), docData);
        } catch (error) {
          console.error("Failed to sync offline catch", error);
          remainingCatches.push(catchData); // Keep it to retry later
        }
      }

      localStorage.setItem("offline_catches", JSON.stringify(remainingCatches));

      if (remainingCatches.length < offlineCatches.length) {
        toast.success("דיווחי אופליין סונכרנו בהצלחה!");
      }
    };

    // Attempt sync on initial load if online
    if (navigator.onLine) {
      syncOfflineCatches();
    }

    // Attempt sync when connection comes back
    window.addEventListener("online", syncOfflineCatches);
    
    return () => {
      window.removeEventListener("online", syncOfflineCatches);
    };
  }, []);
}
