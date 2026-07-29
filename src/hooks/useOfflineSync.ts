import { useEffect } from "react";
import { useCatches } from "@/hooks/useCatches";
import { toast } from "@/hooks/use-toast";

export function OfflineSyncManager() {
  const { reportCatch } = useCatches();

  useEffect(() => {
    const handleOnline = async () => {
      const offlineCatches = JSON.parse(localStorage.getItem("offline_catches") || "[]");
      
      if (offlineCatches.length > 0) {
        toast({
          title: "מזהה חיבור זמין 🌐",
          description: `מעלה ${offlineCatches.length} תפיסות מהיומן...`,
        });

        let successCount = 0;
        
        for (const catchData of offlineCatches) {
          try {
            // Convert base64 back to File object for the upload
            const res = await fetch(catchData.imageBase64);
            const blob = await res.blob();
            const file = new File([blob], `offline-catch-${catchData.id}.jpg`, { type: "image/jpeg" });

            await reportCatch({
              fishType: catchData.fish_type,
              weight: catchData.weight || "",
              location: catchData.location,
              imageFile: file,
              isPrivate: catchData.isPrivate || false
            });
            
            successCount++;
          } catch (e) {
            console.error("Failed to sync offline catch:", e);
          }
        }

        // Clear local storage if everything synced successfully
        if (successCount === offlineCatches.length) {
          localStorage.removeItem("offline_catches");
          toast({
            title: "סנכרון הושלם! ✅",
            description: "כל התפיסות הועלו בהצלחה לענן.",
          });
        } else {
          // If partial success, keep the failed ones
          const remaining = offlineCatches.slice(successCount);
          localStorage.setItem("offline_catches", JSON.stringify(remaining));
        }
      }
    };

    window.addEventListener("online", handleOnline);
    // Also try on mount in case they loaded app offline but just gained connection before mount
    if (navigator.onLine) {
      handleOnline();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [reportCatch]);

  return null;
}
