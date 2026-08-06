import { useState, useEffect } from 'react';
import { ID, Query } from 'appwrite';
import { databases, storage, APPWRITE_DB_ID, APPWRITE_REELS_ID, APPWRITE_REELS_BUCKET_ID } from '@/lib/appwrite';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { compressVideoLocally } from '@/lib/videoCompression';

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
      
      const formattedReels = response.documents.map(doc => {
        const isMe = user && doc.userId === user.$id;
        return {
          ...doc,
          id: doc.$id,
          user: {
            name: isMe ? (profile?.name || user.name || "אני") : "משתמש דיגון",
            avatar: isMe ? (profile?.avatar || "") : "",
            handle: isMe ? ("@" + (profile?.name || "me").replace(/\s+/g, "_").toLowerCase()) : "@digon_user"
          }
        };
      }) as ReelData[];
      
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
      // 0. Compress video locally
      let fileToUpload = file;
      if (file.type.startsWith('video/')) {
        fileToUpload = await compressVideoLocally(file);
      }

      // 1. Upload video to storage
      const uploadedFile = await storage.createFile(
        APPWRITE_REELS_BUCKET_ID,
        ID.unique(),
        fileToUpload
      );

      // 2. Get file view URL
      const fileUrl = storage.getFileView(APPWRITE_REELS_BUCKET_ID, uploadedFile.$id);
      const finalVideoUrl = typeof fileUrl === 'string' ? fileUrl : (fileUrl?.href || fileUrl?.toString());
      
      // 3. Create document in database
      const newReel = await databases.createDocument(
        APPWRITE_DB_ID,
        APPWRITE_REELS_ID,
        ID.unique(),
        {
          userId: user.$id,
          videoUrl: finalVideoUrl,
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

  const deleteReel = async (reelId: string, videoUrl: string) => {
    if (!user) return false;
    
    try {
      // 1. Delete DB document
      await databases.deleteDocument(APPWRITE_DB_ID, APPWRITE_REELS_ID, reelId);
      
      // 2. Try to delete the actual video file from storage
      if (videoUrl && typeof videoUrl === 'string') {
        const fileIdMatch = videoUrl.match(/\/files\/([a-zA-Z0-9]+)\/view/);
        if (fileIdMatch && fileIdMatch[1]) {
          try {
            await storage.deleteFile(APPWRITE_REELS_BUCKET_ID, fileIdMatch[1]);
          } catch (e) {
            console.error("Failed to delete video file, it might have already been deleted", e);
          }
        }
      }
      
      // 3. Update UI
      setReels(prev => prev.filter(r => r.$id !== reelId && (r as any).id !== reelId));
      return true;
    } catch (error) {
      console.error("Delete error:", error);
      throw error;
    }
  };

  return {
    reels,
    loading,
    uploadReel,
    deleteReel,
    fetchReels,
    setReels
  };
}
