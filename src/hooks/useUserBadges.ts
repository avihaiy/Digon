import { useQuery } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_PROFILES_ID } from "@/lib/appwrite";
import { Query } from "appwrite";

export function useUserBadges(userId: string) {
  const { data: profileData, isLoading } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: async () => {
      if (!userId) return null;
      try {
        const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_PROFILES_ID, [
          Query.equal("user_id", userId),
          Query.limit(1)
        ]);
        if (res.documents.length > 0) {
          return res.documents[0];
        }
        return null;
      } catch (e) {
        console.error("Failed to fetch profile", e);
        return null;
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 60 // Cache for 1 hour
  });

  return { 
    badges: (profileData?.badges as string[]) || [], 
    title: profileData?.title || null,
    isLoading 
  };
}
