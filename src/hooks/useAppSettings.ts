import { useQuery } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_SETTINGS_ID } from "@/lib/appwrite";
import { Query } from "appwrite";

export interface AppSetting {
  key: string;
  value: string;
}

export function useAppSettings() {
  return useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      try {
        const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_SETTINGS_ID, [Query.limit(50)]);
        const settingsMap: Record<string, string> = {};
        res.documents.forEach((doc) => {
          settingsMap[doc.key] = doc.value;
        });
        return settingsMap;
      } catch (e: any) {
        if (e.code === 404) return {}; // Collection might not exist yet
        throw e;
      }
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}
