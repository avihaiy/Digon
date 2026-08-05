import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, APPWRITE_DB_ID, APPWRITE_CAMS_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { toast } from 'sonner';

export interface CamData {
  $id?: string;
  name: string;
  location: string;
  url: string;
  thumbnail: string;
  status: string; // 'LIVE' | 'OFFLINE'
  external?: boolean;
  source?: string;
}

export function useCams() {
  const queryClient = useQueryClient();

  const camsQuery = useQuery({
    queryKey: ['cams'],
    queryFn: async () => {
      try {
        const response = await databases.listDocuments(
          APPWRITE_DB_ID,
          APPWRITE_CAMS_ID,
          [Query.limit(50), Query.orderDesc('$createdAt')]
        );
        return response.documents as unknown as CamData[];
      } catch (error: any) {
        // If collection doesn't exist yet, just return empty array instead of breaking the app
        console.error('Error fetching cams:', error);
        return [];
      }
    },
  });

  const addCamMutation = useMutation({
    mutationFn: async (cam: Omit<CamData, '$id'>) => {
      return await databases.createDocument(
        APPWRITE_DB_ID,
        APPWRITE_CAMS_ID,
        ID.unique(),
        cam
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cams'] });
      toast.success('המצלמה נוספה בהצלחה');
    },
    onError: (error) => {
      toast.error('שגיאה בהוספת המצלמה: ' + error.message);
    }
  });

  const updateCamMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<CamData, '$id'>> }) => {
      return await databases.updateDocument(
        APPWRITE_DB_ID,
        APPWRITE_CAMS_ID,
        id,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cams'] });
      toast.success('המצלמה עודכנה בהצלחה');
    },
    onError: (error) => {
      toast.error('שגיאה בעדכון המצלמה: ' + error.message);
    }
  });

  const deleteCamMutation = useMutation({
    mutationFn: async (id: string) => {
      return await databases.deleteDocument(
        APPWRITE_DB_ID,
        APPWRITE_CAMS_ID,
        id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cams'] });
      toast.success('המצלמה נמחקה בהצלחה');
    },
    onError: (error) => {
      toast.error('שגיאה במחיקת המצלמה: ' + error.message);
    }
  });

  return {
    cams: camsQuery.data || [],
    isLoading: camsQuery.isLoading,
    addCam: addCamMutation,
    updateCam: updateCamMutation,
    deleteCam: deleteCamMutation
  };
}
