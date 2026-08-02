import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_LIKES_ID, APPWRITE_COMMENTS_ID, APPWRITE_NOTIFICATIONS_ID } from "@/lib/appwrite";
import { Query, ID } from "appwrite";
import { useAuth } from "./useAuth";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { APPWRITE_PROFILES_ID } from "@/lib/appwrite";
export function useSocial(catchId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { playPop, triggerHaptic } = useSoundEffects();

  // Fetch Likes
  const { data: likes = [] } = useQuery({
    queryKey: ["likes", catchId],
    queryFn: async () => {
      const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_LIKES_ID, [
        Query.equal("catch_id", catchId),
      ]);
      return res.documents;
    },
  });

  // Fetch Comments
  const { data: comments = [] } = useQuery({
    queryKey: ["comments", catchId],
    queryFn: async () => {
      const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_COMMENTS_ID, [
        Query.equal("catch_id", catchId),
        Query.orderAsc("$createdAt"),
      ]);
      return res.documents;
    },
  });

  const hasLiked = user ? likes.some((like: any) => like.user_id === user.$id) : false;

  const toggleLikeMutation = useMutation({
    mutationFn: async ({ ownerId }: { ownerId?: string } = {}) => {
      if (!user) throw new Error("Not logged in");
      const existingLike = likes.find((like: any) => like.user_id === user.$id);
      
      if (existingLike) {
        await databases.deleteDocument(APPWRITE_DB_ID, APPWRITE_LIKES_ID, existingLike.$id);
      } else {
        await databases.createDocument(APPWRITE_DB_ID, APPWRITE_LIKES_ID, ID.unique(), {
          catch_id: catchId,
          user_id: user.$id
        });

        // Check for Social Star Bonus (Exactly 5 likes)
        // Note: likes.length is the count BEFORE this like was added.
        if (ownerId && likes.length === 4) {
          try {
            const profileRes = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_PROFILES_ID, [
              Query.equal("user_id", ownerId)
            ]);
            if (profileRes.documents.length > 0) {
              const profile = profileRes.documents[0];
              await databases.updateDocument(APPWRITE_DB_ID, APPWRITE_PROFILES_ID, profile.$id, {
                points: (profile.points || 0) + 100
              });
              
              await databases.createDocument(APPWRITE_DB_ID, APPWRITE_NOTIFICATIONS_ID, ID.unique(), {
                user_id: ownerId,
                title: "כוכב הקהילה! ⭐",
                message: "התפיסה שלך פופולרית! הגעת ל-5 לייקים וזכית ב-100 נקודות בונוס!",
                is_read: "false",
                type: "social_star"
              });
            }
          } catch (e) {
            console.error("Social star logic failed", e);
          }
        }

        triggerHaptic('light');
        playPop();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["likes", catchId] });
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: async ({ text, ownerId }: { text: string, ownerId: string }) => {
      if (!user) throw new Error("Not logged in");
      await databases.createDocument(APPWRITE_DB_ID, APPWRITE_COMMENTS_ID, ID.unique(), {
        catch_id: catchId,
        user_id: user.$id,
        text
      });

      // Notify the owner of the catch if it's not the same user
      if (ownerId && ownerId !== user.$id) {
        try {
          await databases.createDocument(APPWRITE_DB_ID, APPWRITE_NOTIFICATIONS_ID, ID.unique(), {
            user_id: ownerId,
            title: "תגובה חדשה! 💬",
            message: `${user.name || 'דייג'} הגיב על התפיסה שלך: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
            is_read: "false",
            type: "new_comment"
          });
        } catch (e) {
          console.error("Failed to notify owner", e);
        }
      }
      
      triggerHaptic('medium');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", catchId] });
    }
  });

  return {
    likes,
    likesCount: likes.length,
    hasLiked,
    comments,
    commentsCount: comments.length,
    toggleLike: (ownerId?: string) => toggleLikeMutation.mutate({ ownerId }),
    addComment: (text: string, ownerId: string) => addCommentMutation.mutate({ text, ownerId }),
    isLikeLoading: toggleLikeMutation.isPending,
    isCommentLoading: addCommentMutation.isPending
  };
}
