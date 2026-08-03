import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_NOTIFICATIONS_ID } from "@/lib/appwrite";
import { Query, ID } from "appwrite";
import { useAuth } from "./useAuth";

export const APPWRITE_RELATIONSHIPS_ID = "relationships"; // Expected to be created by admin
export const APPWRITE_PROFILES_ID = import.meta.env.VITE_APPWRITE_PROFILES_COLLECTION_ID || "6a674a390030977cf6ae";

export function useFollowers(profileUserId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get followers of the profile user
  const { data: followers = [], isLoading: isFollowersLoading } = useQuery({
    queryKey: ["followers", profileUserId],
    queryFn: async () => {
      if (!profileUserId) return [];
      try {
        const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_RELATIONSHIPS_ID, [
          Query.equal("following_id", profileUserId),
          Query.limit(100)
        ]);
        
        if (res.documents.length === 0) return [];
        
        const followerIds = res.documents.map(d => d.follower_id);
        const profilesRes = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_PROFILES_ID, [
          Query.equal("user_id", followerIds)
        ]);
        
        return profilesRes.documents;
      } catch (e) {
        console.error("Failed to fetch followers", e);
        return [];
      }
    },
    enabled: !!profileUserId
  });

  // Get users the profile user is following
  const { data: following = [], isLoading: isFollowingLoading } = useQuery({
    queryKey: ["following", profileUserId],
    queryFn: async () => {
      if (!profileUserId) return [];
      try {
        const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_RELATIONSHIPS_ID, [
          Query.equal("follower_id", profileUserId),
          Query.limit(100)
        ]);

        if (res.documents.length === 0) return [];

        const followingIds = res.documents.map(d => d.following_id);
        const profilesRes = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_PROFILES_ID, [
          Query.equal("user_id", followingIds)
        ]);
        
        return profilesRes.documents;
      } catch (e) {
        console.error("Failed to fetch following", e);
        return [];
      }
    },
    enabled: !!profileUserId
  });

  const isFollowing = user ? followers.some((f: any) => f.user_id === user.$id) : false;

  const toggleFollowMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not logged in");
      
      // We need the relationship doc id to unfollow. Since `followers` is now profiles, we must query the relationship again to get its ID, or check if we are following.
      const relRes = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_RELATIONSHIPS_ID, [
        Query.equal("follower_id", user.$id),
        Query.equal("following_id", profileUserId)
      ]);
      
      const existingRelationship = relRes.documents[0];
      
      if (existingRelationship) {
        // Unfollow
        await databases.deleteDocument(APPWRITE_DB_ID, APPWRITE_RELATIONSHIPS_ID, existingRelationship.$id);
      } else {
        // Follow
        await databases.createDocument(APPWRITE_DB_ID, APPWRITE_RELATIONSHIPS_ID, ID.unique(), {
          follower_id: user.$id,
          following_id: profileUserId
        });

        // Notify the user being followed
        if (profileUserId !== user.$id) {
          try {
            await databases.createDocument(APPWRITE_DB_ID, APPWRITE_NOTIFICATIONS_ID, ID.unique(), {
              user_id: profileUserId,
              title: "עוקב חדש! 👥",
              message: `${user.name || 'מישהו'} התחיל לעקוב אחריך!`,
              is_read: "false",
              type: "new_follower"
            });
          } catch (e) {
            console.error("Failed to notify new follower", e);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followers", profileUserId] });
      if (user) {
        queryClient.invalidateQueries({ queryKey: ["following", user.$id] });
      }
    }
  });

  return {
    followers,
    following,
    followersCount: followers.length,
    followingCount: following.length,
    isFollowing,
    isLoading: isFollowersLoading || isFollowingLoading,
    toggleFollow: () => toggleFollowMutation.mutate(),
    isToggling: toggleFollowMutation.isPending
  };
}
