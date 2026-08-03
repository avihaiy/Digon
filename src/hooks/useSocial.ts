import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, APPWRITE_DB_ID, APPWRITE_LIKES_ID, APPWRITE_COMMENTS_ID, APPWRITE_PROFILES_ID } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { useAuth } from './useAuth';

export function useSocial(catchId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: likes = [], isLoading: isLikesLoading } = useQuery({
    queryKey: ['likes', catchId],
    queryFn: async () => {
      if (!catchId) return [];
      try {
        const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_LIKES_ID, [
          Query.equal('catch_id', catchId)
        ]);
        return res.documents;
      } catch (e) {
        console.error('Failed to fetch likes', e);
        return [];
      }
    },
    enabled: !!catchId
  });

  const { data: comments = [], isLoading: isCommentsLoading } = useQuery({
    queryKey: ['comments', catchId],
    queryFn: async () => {
      if (!catchId) return [];
      try {
        const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_COMMENTS_ID, [
          Query.equal('catch_id', catchId),
          Query.orderAsc('$createdAt')
        ]);
        
        if (res.documents.length === 0) return [];
        
        const userIds = [...new Set(res.documents.map(c => c.user_id))];
        const profilesRes = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_PROFILES_ID, [
          Query.equal('user_id', userIds)
        ]);
        
        const profilesMap = profilesRes.documents.reduce((acc: any, p: any) => {
          acc[p.user_id] = p;
          return acc;
        }, {});
        
        return res.documents.map(c => ({
          ...c,
          profile: profilesMap[c.user_id] || null
        }));
      } catch (e) {
        console.error('Failed to fetch comments', e);
        return [];
      }
    },
    enabled: !!catchId
  });

  const isLiked = user ? likes.some((l: any) => l.user_id === user.$id) : false;

  const toggleLikeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not logged in');
      
      const existingLike = likes.find((l: any) => l.user_id === user.$id);
      
      if (existingLike) {
        await databases.deleteDocument(APPWRITE_DB_ID, APPWRITE_LIKES_ID, existingLike.$id);
      } else {
        await databases.createDocument(APPWRITE_DB_ID, APPWRITE_LIKES_ID, ID.unique(), {
          user_id: user.$id,
          catch_id: catchId
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['likes', catchId] });
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!user) throw new Error('Not logged in');
      if (!text.trim()) throw new Error('Empty comment');
      
      await databases.createDocument(APPWRITE_DB_ID, APPWRITE_COMMENTS_ID, ID.unique(), {
        user_id: user.$id,
        catch_id: catchId,
        text: text.trim()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', catchId] });
    }
  });

  return {
    likesCount: likes.length,
    isLiked,
    comments,
    isLoading: isLikesLoading || isCommentsLoading,
    toggleLike: () => toggleLikeMutation.mutate(),
    addComment: (text: string) => addCommentMutation.mutateAsync(text),
    isTogglingLike: toggleLikeMutation.isPending,
    isAddingComment: addCommentMutation.isPending
  };
}
