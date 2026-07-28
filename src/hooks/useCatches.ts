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
  const { user, refreshProfile } = useAuth();

  // Fetch Catches
  const { data: catches, isLoading } = useQuery({
    queryKey: ["catches"],
    queryFn: async () => {
      try {
        const response = await databases.listDocuments(
          APPWRITE_DB_ID,
          APPWRITE_CATCHES_ID,
          [Query.orderDesc("$createdAt"), Query.limit(20)]
        );
        return response.documents as unknown as CatchReport[];
      } catch (error) {
        console.error("Failed to fetch catches (Appwrite collection might not exist yet):", error);
        return []; // Return empty gracefully if collection doesn't exist yet
      }
    },
  });

  // Report Catch Mutation
  const reportCatchMutation = useMutation({
    mutationFn: async ({
      fishType,
      weight,
      location,
      imageFile,
    }: {
      fishType: string;
      weight: string;
      location: string;
      imageFile: File;
    }) => {
      if (!user) throw new Error("חובה להתחבר כדי לדווח על תפיסה");

      // 1. Upload Image to Storage Bucket
      const fileUpload = await storage.createFile(
        APPWRITE_CATCH_IMAGES_BUCKET_ID,
        ID.unique(),
        imageFile
      );

      // 2. Create Document in Catches Collection
      await databases.createDocument(
        APPWRITE_DB_ID,
        APPWRITE_CATCHES_ID,
        ID.unique(),
        {
          user_id: user.$id,
          user_name: user.name || "דייג אנונימי",
          fish_type: fishType,
          weight: weight || "",
          location: location,
          image_id: fileUpload.$id,
        }
      );

      // 3. Increment User Points (Give 10 CoinsISR)
      try {
        const profileResponse = await databases.listDocuments(
          APPWRITE_DB_ID,
          APPWRITE_PROFILES_ID,
          [Query.equal("user_id", user.$id)]
        );
        
        if (profileResponse.documents.length > 0) {
          const profile = profileResponse.documents[0];
          const currentPoints = profile.points || 0;
          
          await databases.updateDocument(
            APPWRITE_DB_ID,
            APPWRITE_PROFILES_ID,
            profile.$id,
            { points: currentPoints + 10 }
          );
        }
      } catch (pointsError: any) {
        console.error("Failed to update points:", pointsError);
        toast({
          title: "שגיאה בעדכון נקודות",
          description: pointsError?.message || "לא הצלחנו לעדכן את הנקודות.",
          variant: "destructive"
        });
      }
    },
    onSuccess: () => {
      toast({
        title: "הדיווח עלה בהצלחה! 🎉",
        description: "קיבלת 10 מטבעות על הדיווח, המשך כך!",
      });
      queryClient.invalidateQueries({ queryKey: ["catches"] });
      refreshProfile();
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
