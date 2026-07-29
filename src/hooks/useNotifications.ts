import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_NOTIFICATIONS_ID } from "@/lib/appwrite";
import { Query, ID } from "appwrite";
import { useAuth } from "./useAuth";

export interface Notification {
  $id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: string; // we will use "true" / "false" string to match the user's setup
  type?: string;
  link?: string;
  $createdAt: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.$id],
    queryFn: async () => {
      if (!user) return [];
      try {
        const res = await databases.listDocuments(
          APPWRITE_DB_ID,
          APPWRITE_NOTIFICATIONS_ID,
          [
            Query.equal("user_id", user.$id),
            Query.orderDesc("$createdAt"),
            Query.limit(50),
          ]
        );
        return res.documents as unknown as Notification[];
      } catch (e) {
        console.error("Failed to fetch notifications", e);
        return [];
      }
    },
    enabled: !!user,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await databases.updateDocument(
        APPWRITE_DB_ID,
        APPWRITE_NOTIFICATIONS_ID,
        notificationId,
        { is_read: "true" }
      );
      return notificationId;
    },
    onSuccess: (id) => {
      queryClient.setQueryData(["notifications", user?.$id], (old: Notification[] | undefined) => {
        if (!old) return old;
        return old.map(n => n.$id === id ? { ...n, is_read: "true" } : n);
      });
    },
  });

  const unreadCount = notifications.filter(n => n.is_read !== "true").length;

  return {
    notifications,
    isLoading,
    unreadCount,
    markAsRead: (id: string) => markAsReadMutation.mutate(id),
  };
}
