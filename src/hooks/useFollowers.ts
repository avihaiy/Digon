import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_NOTIFICATIONS_ID } from "@/lib/appwrite";
import { Query, ID } from "appwrite";
import { useAuth } from "./useAuth";

export const APPWRITE_RELATIONSHIPS_ID = "relationships"; // Expected to be created by admin

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
          Query.equal("following_id", profileUserId)
        ]);
        return res.documents;
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
          Query.equal("follower_id", profileUserId)
        ]);
        return res.documents;
      } catch (e) {
        console.error("Failed to fetch following", e);
        return [];
      }
    },
    enabled: !!profileUserId
  });

  const isFollowing = user ? followers.some((f: any) => f.follower_id === user.$id) : false;

  const toggleFollowMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not logged in");
      const existingRelationship = followers.find((f: any) => f.follower_id === user.$id);
      
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
    followersCount: followers.length,
    followingCount: following.length,
    isFollowing,
    isLoading: isFollowersLoading || isFollowingLoading,
    toggleFollow: () => toggleFollowMutation.mutate(),
    isToggling: toggleFollowMutation.isPending
  };
}
