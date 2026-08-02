import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, storage, APPWRITE_DB_ID, APPWRITE_CATCHES_ID, APPWRITE_PROFILES_ID, APPWRITE_CATCH_IMAGES_BUCKET_ID } from "@/lib/appwrite";
import { ID, Query } from "appwrite";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { APPWRITE_NOTIFICATIONS_ID } from "@/lib/appwrite";

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
  const { user, refreshProfile, updateLocalPoints, prefs, updateUserPrefs } = useAuth();
  const { playSuccessChime, triggerHaptic } = useSoundEffects();

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
      isPrivate?: boolean;
    }) => {
      if (!user) throw new Error("חובה להתחבר כדי לדווח על תפיסה");

      if (!navigator.onLine) {
        if (!data.imageBase64) throw new Error("חסרה תמונה בפורמט אופליין");
        
        let finalLocation = data.location;
        if (prefs?.privacy_hide_location) {
          finalLocation = finalLocation.split("|||")[0].trim();
        }

        const offlineCatch = {
          id: Date.now().toString(),
          user_id: user.$id,
          user_name: user.name || user.email?.split("@")[0] || "דייג אנונימי",
          fish_type: data.fishType,
          weight: data.weight || null,
          location: finalLocation,
          imageBase64: data.imageBase64,
          isPrivate: data.isPrivate || false,
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

      // 1.5 Early Bird Check
      let isEarlyBird = false;
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_CATCHES_ID, [
          Query.greaterThanEqual("$createdAt", `${todayStr}T00:00:00.000Z`),
          Query.limit(1)
        ]);
        if (res.documents.length === 0) {
          isEarlyBird = true;
        }
      } catch (e) {
        console.error("Early bird check failed", e);
      }

      // 1.6 Hot Streak Logic
      let gotHotStreak = false;
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const lastCatch = prefs.last_catch_date as string | undefined;
        let currentStreak = (prefs.catch_streak as number) || 0;
        
        if (lastCatch !== todayStr) {
          if (lastCatch) {
            const lastDate = new Date(lastCatch);
            const todayDate = new Date(todayStr);
            const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            
            if (diffDays === 1) {
              currentStreak += 1;
            } else {
              currentStreak = 1;
            }
          } else {
            currentStreak = 1;
          }

          if (currentStreak >= 3) {
            gotHotStreak = true;
            currentStreak = 0; // Reset after getting the bonus
            
            // Give 100 points
            const profileRes = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_PROFILES_ID, [
              Query.equal("user_id", user.$id)
            ]);
            if (profileRes.documents.length > 0) {
              const profile = profileRes.documents[0];
              await databases.updateDocument(APPWRITE_DB_ID, APPWRITE_PROFILES_ID, profile.$id, {
                points: (profile.points || 0) + 100
              });
              
              await databases.createDocument(APPWRITE_DB_ID, APPWRITE_NOTIFICATIONS_ID, ID.unique(), {
                user_id: user.$id,
                title: "רצף תפיסות! 🔥",
                message: "דיווחת תפיסות 3 ימים ברצף! זכית ב-100 נקודות בונוס!",
                is_read: "false",
                type: "hot_streak"
              });
            }
          }

          await updateUserPrefs({
            ...prefs,
            last_catch_date: todayStr,
            catch_streak: currentStreak
          });
        }
      } catch (e) {
        console.error("Hot streak logic failed", e);
      }

      // 2. Create Document in Catches Collection
      let finalLocation = data.location;
      if (prefs?.privacy_hide_location) {
        finalLocation = finalLocation.split("|||")[0].trim();
      }

      const catchData = {
        user_id: user.$id,
        user_name: user.name || user.email?.split("@")[0] || "דייג אנונימי",
        fish_type: data.fishType,
        weight: data.weight || null,
        location: finalLocation,
        image_id: imageId,
        status: data.isPrivate ? 'private' : 'pending', // Private skips approval and community feed
        tournament_id: data.tournamentId || "",
        is_early_bird: isEarlyBird
      };

      await databases.createDocument(APPWRITE_DB_ID, APPWRITE_CATCHES_ID, ID.unique(), catchData);
      return { offline: false, isPrivate: data.isPrivate, gotHotStreak, isEarlyBird };
    },
    onSuccess: (data) => {
      if (data?.offline) {
        triggerHaptic('heavy');
        toast({
          title: "נשמר במצב אופליין 📡",
          description: "אין חיבור לאינטרנט. התפיסה נשמרה ותעלה ברגע שהקליטה תחזור!",
        });
      } else if (data?.isPrivate) {
        triggerHaptic('success');
        playSuccessChime();
        toast({
          title: "נשמר ביומן האישי 🔒",
          description: "התפיסה נשמרה בהצלחה ביומן הדיג הפרטי שלך.",
        });
      } else {
        triggerHaptic('success');
        playSuccessChime();
        if (data?.gotHotStreak) {
          toast({
            title: "רצף תפיסות! 🔥",
            description: "דיווחת תפיסות 3 ימים ברצף! 100 נקודות נוספו לחשבון שלך.",
          });
        } else {
          toast({
            title: "הדיווח נשלח לאישור! 🎉",
            description: "התפיסה תפורסם בקהילה ותזכה אותך בנקודות מיד לאחר אישור מנהל.",
          });
        }
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
