import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_MESSAGES_ID, APPWRITE_PROFILES_ID } from "@/lib/appwrite";
import { ID, Query } from "appwrite";
import { useAuth } from "./useAuth";

export interface Message {
  $id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  is_read: string;
  $createdAt: string;
}

export function useMessages(chatWithUserId?: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Query to get all distinct users we have chatted with (Inbox View)
  const { data: inboxUsers = [], isLoading: isLoadingInbox } = useQuery({
    queryKey: ["inbox", user?.$id],
    queryFn: async () => {
      if (!user?.$id) return [];
      
      try {
        // Fetch messages where we are sender or receiver
        const sentRes = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_MESSAGES_ID, [
          Query.equal("sender_id", user.$id),
          Query.orderDesc("$createdAt"),
          Query.limit(100)
        ]);
        
        const recvRes = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_MESSAGES_ID, [
          Query.equal("receiver_id", user.$id),
          Query.orderDesc("$createdAt"),
          Query.limit(100)
        ]);

        const allMessages = [...sentRes.documents, ...recvRes.documents].sort(
          (a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
        );

        const uniqueUserIds = new Set<string>();
        const latestMessages: Record<string, any> = {};

        allMessages.forEach(msg => {
          const otherUserId = msg.sender_id === user.$id ? msg.receiver_id : msg.sender_id;
          if (!uniqueUserIds.has(otherUserId)) {
            uniqueUserIds.add(otherUserId);
            latestMessages[otherUserId] = msg;
          }
        });

        // Now fetch profiles for these users
        const usersList = [];
        for (const uid of Array.from(uniqueUserIds)) {
          try {
            const profileRes = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_PROFILES_ID, [
              Query.equal("user_id", uid)
            ]);
            if (profileRes.documents.length > 0) {
              usersList.push({
                user_id: uid,
                profile: profileRes.documents[0],
                latestMessage: latestMessages[uid]
              });
            }
          } catch (e) { }
        }

        return usersList;
      } catch (e) {
        return [];
      }
    },
    enabled: !!user?.$id && !chatWithUserId
  });

  // Query to get messages between me and a specific user
  const { data: chatMessages = [], isLoading: isLoadingChat } = useQuery({
    queryKey: ["chat", user?.$id, chatWithUserId],
    queryFn: async () => {
      if (!user?.$id || !chatWithUserId) return [];
      try {
        const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_MESSAGES_ID, [
          Query.or([
            Query.and([Query.equal("sender_id", user.$id), Query.equal("receiver_id", chatWithUserId)]),
            Query.and([Query.equal("sender_id", chatWithUserId), Query.equal("receiver_id", user.$id)])
          ]),
          Query.orderAsc("$createdAt"),
          Query.limit(100)
        ]);
        return res.documents as unknown as Message[];
      } catch (e) {
        return [];
      }
    },
    enabled: !!user?.$id && !!chatWithUserId,
    refetchInterval: 3000 // Poll every 3 seconds for live chat feel
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ receiverId, text }: { receiverId: string, text: string }) => {
      if (!user?.$id) throw new Error("Not logged in");
      return databases.createDocument(APPWRITE_DB_ID, APPWRITE_MESSAGES_ID, ID.unique(), {
        sender_id: user.$id,
        receiver_id: receiverId,
        text,
        is_read: "false"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", user?.$id, chatWithUserId] });
      queryClient.invalidateQueries({ queryKey: ["inbox", user?.$id] });
    }
  });

  return {
    inboxUsers,
    isLoadingInbox,
    chatMessages,
    isLoadingChat,
    sendMessage: sendMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending
  };
}
