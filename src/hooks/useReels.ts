import { useState, useEffect } from 'react';
import { ID, Query } from 'appwrite';
import { databases, storage, APPWRITE_DB_ID, APPWRITE_REELS_ID, APPWRITE_REELS_BUCKET_ID } from '@/lib/appwrite';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface ReelData {
  $id: string;
  userId: string;
  videoUrl: string;
  description?: string;
  likes: number;
  comments: number;
  location?: string;
  song?: string;
  $createdAt: string;
  user?: {
    name: string;
    avatar: string;
    handle: string;
  };
}

export function useReels() {
  const [reels, setReels] = useState<ReelData[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();

  useEffect(() => {
    fetchReels();
  }, []);

  const fetchReels = async () => {
    try {
      setLoading(true);
      const response = await databases.listDocuments(
        APPWRITE_DB_ID,
        APPWRITE_REELS_ID,
        [Query.limit(20)]
      );
      
      const formattedReels = response.documents.map(doc => ({
        ...doc,
        user: {
          name: "דייג דיגון",
          avatar: "",
          handle: "@digon_user"
        }
      })) as ReelData[];
      
      setReels(formattedReels);
    } catch (error) {
      console.error("Error fetching reels:", error);
    } finally {
      setLoading(false);
    }
  };

  const uploadReel = async (file: File) => {
    if (!user) {
      toast.error("יש להתחבר כדי להעלות סרטון");
      return null;
    }

    try {
      // 1. Upload video to storage
      const uploadedFile = await storage.createFile(
        APPWRITE_REELS_BUCKET_ID,
        ID.unique(),
        file
      );

      // 2. Get file view URL
      const fileUrl = storage.getFileView(APPWRITE_REELS_BUCKET_ID, uploadedFile.$id);

      // 3. Create document in database
      const newReel = await databases.createDocument(
        APPWRITE_DB_ID,
        APPWRITE_REELS_ID,
        ID.unique(),
        {
          userId: user.$id,
          videoUrl: fileUrl.href,
          description: "סרטון חדש מהשטח! 🎣",
          likes: 0,
          comments: 0,
          location: "ישראל",
          song: "Digon Original Audio"
        }
      );

      // 4. Update local state
      const reelWithUser = {
        ...newReel,
        user: {
          name: profile?.name || user.name || "אני",
          avatar: profile?.avatar || "",
          handle: "@" + (profile?.name || "me").replace(/\s+/g, "_").toLowerCase()
        }
      } as ReelData;

      setReels(prev => [reelWithUser, ...prev]);
      return newReel;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  return {
    reels,
    loading,
    uploadReel,
    fetchReels,
    setReels // Expose this in case Reels.tsx needs to fallback to INITIAL_REELS_DATA if error
  };
}
