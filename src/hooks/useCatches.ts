import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, storage, APPWRITE_DB_ID, APPWRITE_CATCHES_ID, APPWRITE_PROFILES_ID, APPWRITE_CATCH_IMAGES_BUCKET_ID } from "@/lib/appwrite";
import { ID, Query } from "appwrite";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export interface CatchReport {
  $id: string;
  user_id: string;
  user_name: string;
  fish_type: string;
  weight?: string;
  location: string;
  image_id: string;
  $createdAt: string;
}

export function getImageUrl(imageId: string) {
  if (!imageId) return "";
  return storage.getFileView(APPWRITE_CATCH_IMAGES_BUCKET_ID, imageId).toString();
}

export function useCatches() {
  const queryClient = useQueryClient();
  const { user, refreshProfile, updateLocalPoints } = useAuth();

  // Fetch Catches
  const { data: catches, isLoading } = useQuery({
    queryKey: ["catches"],
    queryFn: async () => {
      try {
        const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_CATCHES_ID, [
          Query.orderDesc("$createdAt"),
          Query.limit(50)
        ]);
        // Only show approved catches (or old catches without status) in the community feed
        return res.documents.filter((doc: any) => doc.status === 'approved' || !doc.status) as unknown as CatchReport[];
      } catch (error) {
        console.error("Failed to fetch catches (Appwrite collection might not exist yet):", error);
        return []; // Return empty gracefully if collection doesn't exist yet
      }
    },
  });

  // Report Catch Mutation
  const reportCatchMutation = useMutation({
    mutationFn: async (data: {
      fishType: string;
      weight: string;
      location: string;
      imageFile: File;
      imageBase64?: string;
      tournamentId?: string;
    }) => {
      if (!user) throw new Error("חובה להתחבר כדי לדווח על תפיסה");

      if (!navigator.onLine) {
        if (!data.imageBase64) throw new Error("חסרה תמונה בפורמט אופליין");
        
        const offlineCatch = {
          id: Date.now().toString(),
          user_id: user.$id,
          user_name: user.name || user.email?.split("@")[0] || "דייג אנונימי",
          fish_type: data.fishType,
          weight: data.weight || null,
          location: data.location,
          imageBase64: data.imageBase64,
          timestamp: new Date().toISOString()
        };
        
        const existing = JSON.parse(localStorage.getItem("offline_catches") || "[]");
        existing.push(offlineCatch);
        localStorage.setItem("offline_catches", JSON.stringify(existing));
        
        return { offline: true };
      }

      // 1. Upload Image to Storage Bucket
      const file = await storage.createFile(APPWRITE_CATCH_IMAGES_BUCKET_ID, ID.unique(), data.imageFile);
      const imageId = file.$id;

      // 2. Create Document in Catches Collection
      const catchData = {
        user_id: user.$id,
        user_name: user.name || user.email?.split("@")[0] || "דייג אנונימי",
        fish_type: data.fishType,
        weight: data.weight || null,
        location: data.location,
        image_id: imageId,
        status: 'pending', // Requires admin approval
        tournament_id: data.tournamentId || ""
      };

      await databases.createDocument(APPWRITE_DB_ID, APPWRITE_CATCHES_ID, ID.unique(), catchData);
      return { offline: false };
    },
    onSuccess: (data) => {
      if (data?.offline) {
        toast({
          title: "נשמר במצב אופליין 📡",
          description: "אין חיבור לאינטרנט. התפיסה נשמרה ותעלה ברגע שהקליטה תחזור!",
        });
      } else {
        toast({
          title: "הדיווח נשלח לאישור! 🎉",
          description: "התפיסה תפורסם בקהילה ותזכה אותך ב-10 מטבעות מיד לאחר אישור מנהל.",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["catches"] });
    },
    onError: (error: any) => {
      console.error(error);
      toast({
        title: "שגיאה בהעלאה",
        description: error?.message || "קרתה תקלה לא צפויה, אנא נסה שוב.",
        variant: "destructive",
      });
    },
  });

  return {
    catches,
    isLoading,
    reportCatch: reportCatchMutation.mutateAsync,
    isReporting: reportCatchMutation.isPending,
  };
}
