import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_NOTIFICATIONS_ID } from "@/lib/appwrite";
import { Query, ID } from "appwrite";
import { useAuth } from "./useAuth";
import { useMarineWeather } from "./useMarineWeather";
import { useEffect, useState } from "react";

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
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());
  const { data: marineData } = useMarineWeather();
  const [permission, setPermission] = useState<NotificationPermission>(
    "Notification" in window ? Notification.permission : "default"
  );

  const requestPermission = async () => {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setPermission(perm);
  };

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
    refetchInterval: 15000, // Poll every 15 seconds for new notifications
  });

  // Local Push Notifications Logic
  useEffect(() => {
    if (!notifications.length || permission !== "granted") return;
    
    const newNotifiedIds = new Set(notifiedIds);
    let hasNew = false;

    // Check for unread notifications we haven't seen yet in this session
    notifications.forEach((n) => {
      if (n.is_read !== "true" && !notifiedIds.has(n.$id)) {
        // Show push notification
        try {
          new Notification(n.title, {
            body: n.message,
            icon: '/icon-192x192.png'
          });
        } catch (e) {
          console.error("Failed to show notification", e);
        }
        newNotifiedIds.add(n.$id);
        hasNew = true;
      } else if (n.is_read === "true" && !notifiedIds.has(n.$id)) {
        // Add to seen so we don't notify if they unread it?
        // Wait, just mark it as seen since it's already read
        newNotifiedIds.add(n.$id);
        hasNew = true;
      }
    });

    if (hasNew) {
      setNotifiedIds(newNotifiedIds);
    }
  }, [notifications, permission, notifiedIds]);

  // Golden Hour Local Notifications Check
  useEffect(() => {
    if (permission !== "granted" || !marineData?.dailyForecast?.[0]?.biteTimes) return;

    const checkGoldenHours = () => {
      const now = new Date();
      const todayDateStr = now.toISOString().split('T')[0];
      const todayBiteTimes = marineData.dailyForecast![0].biteTimes;

      todayBiteTimes.forEach((bt, index) => {
        const [startHour, startMin] = bt.start.split(':').map(Number);
        
        const startTime = new Date();
        startTime.setHours(startHour, startMin, 0, 0);
        
        // Notify 60 minutes before
        const notifyTime = new Date(startTime.getTime() - 60 * 60 * 1000);
        
        const diffMs = Math.abs(now.getTime() - notifyTime.getTime());
        // If current time is within a 5-minute window of the notify time
        if (diffMs <= 5 * 60 * 1000) {
          const notifiedKey = `notified_gh_${todayDateStr}_${index}`;
          if (!localStorage.getItem(notifiedKey)) {
            try {
              new Notification('🎣 שעת הזהב מתקרבת!', {
                body: `תנאי הים ב${marineData.locationName} מתאימים לדיג. זמן האכילות (שעת הזהב) יתחיל ב-${bt.start}.`,
                icon: '/icon-192x192.png'
              });
              localStorage.setItem(notifiedKey, 'true');
            } catch (e) {
              console.error("Failed to show golden hour notification", e);
            }
          }
        }
      });
    };

    checkGoldenHours();
    const interval = setInterval(checkGoldenHours, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [permission, marineData]);

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
    requestPermission,
    permission
  };
}
