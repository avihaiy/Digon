import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, storage, APPWRITE_CATCHES_ID, APPWRITE_CATCH_IMAGES_BUCKET_ID, APPWRITE_PROFILES_ID, APPWRITE_LOCATIONS_ID, APPWRITE_STORE_ITEMS_ID, APPWRITE_SETTINGS_ID, APPWRITE_NOTIFICATIONS_ID, APPWRITE_COMMENTS_ID } from "@/lib/appwrite";
import { ID, Query, AppwriteException } from "appwrite";
import { useAuth } from "@/hooks/useAuth";
import { useTournaments } from "@/hooks/useTournaments";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, MapPin, LayoutList, Trash2, Check, X, Camera, Ticket, Store as StoreIcon, Settings, Coins, Trophy, Pencil, BellRing, MessageSquareWarning, Video, ShoppingCart, ExternalLink, Upload, Loader2 } from "lucide-react";
import { CamsManager } from "@/components/admin/CamsManager";

// The Database and Collection IDs should ideally come from env, but we hardcode for this migration script
const DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const PROFILES_ID = import.meta.env.VITE_APPWRITE_PROFILES_COLLECTION_ID;
const ADS_ID = "ads";
const LOCATIONS_ID = APPWRITE_LOCATIONS_ID;

export default function Admin() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

  // Helper to convert any image to JPEG to bypass Appwrite extension restrictions
  const convertToJpeg = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject("Canvas context not available");
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((blob) => {
            if (!blob) return reject("Blob conversion failed");
            resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpeg", { type: "image/jpeg" }));
          }, 'image/jpeg', 0.85); // Compress slightly as well
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeTab, setActiveTab] = useState("home"); // home, users, locations, catches, ads, raffles, store, settings, tournaments, notifications, comments
  const { tournaments, createTournament, endTournament, deleteTournament } = useTournaments();
  const [newLocationName, setNewLocationName] = useState("");
  const [newStoreItem, setNewStoreItem] = useState({ name: "", description: "", cost: "", type: "title", value: "", image_url: "" });
  
  // Points Modal State
  const [pointsModalOpen, setPointsModalOpen] = useState(false);
  const [selectedUserForPoints, setSelectedUserForPoints] = useState<any>(null);
  const [pointsAmount, setPointsAmount] = useState<string>("0");
  const [pointsOperation, setPointsOperation] = useState<"add" | "remove">("add");

  // Edit Catch Modal State
  const [editCatchModalOpen, setEditCatchModalOpen] = useState(false);
  const [selectedCatchToEdit, setSelectedCatchToEdit] = useState<any>(null);
  const [editFishType, setEditFishType] = useState("");
  const [editWeight, setEditWeight] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editMapUrl, setEditMapUrl] = useState("");

  // Edit Store Item Modal State
  const [editStoreItemModalOpen, setEditStoreItemModalOpen] = useState(false);
  const [selectedStoreItemToEdit, setSelectedStoreItemToEdit] = useState<any>(null);
  const [editStoreItemData, setEditStoreItemData] = useState({ name: "", description: "", cost: "", type: "title", value: "", image_url: "" });

  // Fetch Users (Profiles)
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await databases.listDocuments(DB_ID, PROFILES_ID, [Query.limit(100)]);
      return res.documents;
    },
    enabled: !!user,
  });

  // Fetch Ads
  const { data: adsData, isLoading: adsLoading } = useQuery({
    queryKey: ["admin-ads"],
    queryFn: async () => {
      const res = await databases.listDocuments(DB_ID, ADS_ID, [Query.limit(100)]);
      return res.documents;
    },
    enabled: !!user,
  });

  // Fetch Locations
  const { data: locationsData, isLoading: locationsLoading } = useQuery({
    queryKey: ["admin-locations"],
    queryFn: async () => {
      const res = await databases.listDocuments(DB_ID, LOCATIONS_ID, [Query.limit(100)]);
      return res.documents;
    },
    enabled: !!user,
  });

  // Fetch Catches
  const { data: catchesData, isLoading: catchesLoading } = useQuery({
    queryKey: ["admin-catches"],
    queryFn: async () => {
      const res = await databases.listDocuments(DB_ID, APPWRITE_CATCHES_ID, [Query.orderDesc("$createdAt"), Query.limit(100)]);
      return res.documents;
    },
    enabled: !!user,
  });

  // Fetch Store Items
  const { data: storeItemsData, isLoading: storeItemsLoading } = useQuery({
    queryKey: ["admin-store-items"],
    queryFn: async () => {
      const res = await databases.listDocuments(DB_ID, APPWRITE_STORE_ITEMS_ID, [Query.limit(100)]);
      return res.documents;
    },
    enabled: !!user,
  });

  // Fetch Settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      try {
        const res = await databases.listDocuments(DB_ID, APPWRITE_SETTINGS_ID, [Query.limit(10)]);
        return res.documents;
      } catch (e: any) {
        if (e.code === 404) return []; // Collection might not exist yet
        throw e;
      }
    },
    enabled: !!user,
  });

  // Fetch Comments
  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ["admin-comments"],
    queryFn: async () => {
      try {
        const res = await databases.listDocuments(DB_ID, APPWRITE_COMMENTS_ID, [Query.orderDesc("$createdAt"), Query.limit(100)]);
        return res.documents;
      } catch (e) {
        return [];
      }
    },
    enabled: !!user,
  });

  // Add Location Mutation
  const addLocationMutation = useMutation({
    mutationFn: async (name: string) => {
      await databases.createDocument(DB_ID, LOCATIONS_ID, ID.unique(), {
        name,
        added_by: user?.$id,
        latitude: 31.0, // Default mock
        longitude: 35.0, // Default mock
      });
    },
    onSuccess: () => {
      toast.success("המיקום נוסף בהצלחה");
      setNewLocationName("");
      queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
    },
    onError: () => toast.error("שגיאה בהוספת מיקום"),
  });

  // Delete Location Mutation
  const deleteLocationMutation = useMutation({
    mutationFn: async (id: string) => {
      await databases.deleteDocument(DB_ID, LOCATIONS_ID, id);
    },
    onSuccess: () => {
      toast.success("המיקום נמחק בהצלחה!");
      queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
      queryClient.invalidateQueries({ queryKey: ["fishing-locations"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
    },
  });

  // Approve Location Mutation
  const approveLocationMutation = useMutation({
    mutationFn: async ({ locId, userId }: { locId: string, userId: string }) => {
      await databases.updateDocument(DB_ID, LOCATIONS_ID, locId, {
        status: 'approved'
      });

      const profileResponse = await databases.listDocuments(
        DB_ID,
        APPWRITE_PROFILES_ID,
        [Query.equal("user_id", userId)]
      );
      if (profileResponse.documents.length > 0) {
        const profile = profileResponse.documents[0];
        await databases.updateDocument(
          DB_ID,
          APPWRITE_PROFILES_ID,
          profile.$id,
          { points: (profile.points || 0) + 10 }
        );
      }
    },
    onSuccess: (_, variables) => {
      toast.success("המיקום אושר והדייג קיבל 10 מטבעות! 🎉");
      // עדכון מיידי של התצוגה בלי לחכות לשרת
      queryClient.setQueryData(["admin-locations"], (oldData: any) => {
        if (!oldData) return oldData;
        return oldData.map((loc: any) => 
          loc.$id === variables.locId ? { ...loc, status: 'approved' } : loc
        );
      });
      queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
      queryClient.invalidateQueries({ queryKey: ["fishing-locations"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
    },
    onError: () => toast.error("שגיאה באישור המיקום"),
  });

  // Delete Catch Mutation
  const deleteCatchMutation = useMutation({
    mutationFn: async ({ id, imageId }: { id: string, imageId: string }) => {
      if (imageId) {
        try {
          await storage.deleteFile(APPWRITE_CATCH_IMAGES_BUCKET_ID, imageId);
        } catch (e) {
          console.error("Failed to delete image", e);
        }
      }
      await databases.deleteDocument(DB_ID, APPWRITE_CATCHES_ID, id);
    },
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-catches"] });
      const previousCatches = queryClient.getQueryData(["admin-catches"]);
      queryClient.setQueryData(["admin-catches"], (old: any) => 
        old ? old.filter((c: any) => c.$id !== id) : []
      );
      return { previousCatches };
    },
    onSuccess: () => {
      toast.success("התפיסה נמחקה בהצלחה");
      queryClient.invalidateQueries({ queryKey: ["catches"] });
    },
    onError: (err, variables, context: any) => {
      toast.error("שגיאה במחיקת התפיסה");
      if (context?.previousCatches) {
        queryClient.setQueryData(["admin-catches"], context.previousCatches);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-catches"] });
    },
  });

  // Edit Catch Mutation
  const editCatchMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      await databases.updateDocument(DB_ID, APPWRITE_CATCHES_ID, id, data);
    },
    onSuccess: () => {
      toast.success("התפיסה עודכנה בהצלחה!");
      queryClient.invalidateQueries({ queryKey: ["admin-catches"] });
      queryClient.invalidateQueries({ queryKey: ["catches"] });
      queryClient.invalidateQueries({ queryKey: ["map-catches"] });
      setEditCatchModalOpen(false);
    },
    onError: () => toast.error("שגיאה בעדכון התפיסה"),
  });

  // Approve Catch Mutation
  const approveCatchMutation = useMutation({
    mutationFn: async ({ catchId, userId, weight, isEarlyBird }: { catchId: string, userId: string, weight?: string, isEarlyBird?: boolean }) => {
      // 1. Update status to approved
      await databases.updateDocument(DB_ID, APPWRITE_CATCHES_ID, catchId, {
        status: 'approved'
      });

      // 2. Fetch catch approved points
      let catchPoints = 10;
      try {
        const pSetting = settingsData?.find((s: any) => s.key === 'catch_approved_points');
        if (pSetting) {
          catchPoints = pSetting.value;
        }
      } catch (e) {
        // Fallback
      }

      // Early Bird Bonus
      let earnedEarlyBird = false;
      if (isEarlyBird) {
        catchPoints += 50;
        earnedEarlyBird = true;
      }

      // Monster Hunter Bonus
      let earnedMonsterHunter = false;
      if (weight) {
        let weightInGrams = 0;
        const weightStr = weight.toLowerCase();
        const numMatch = weightStr.match(/[\d.]+/);
        if (numMatch) {
          let val = parseFloat(numMatch[0]);
          if (weightStr.includes('kg') || weightStr.includes('ק"ג') || weightStr.includes('קילו')) {
            weightInGrams = val * 1000;
          } else {
            weightInGrams = val;
          }
        }
        
        if (weightInGrams >= 3000) {
          catchPoints += 100;
          earnedMonsterHunter = true;
        }
      }

      // 3. Give points and badges to the user
      const profileResponse = await databases.listDocuments(
        DB_ID,
        APPWRITE_PROFILES_ID,
        [Query.equal("user_id", userId)]
      );
      if (profileResponse.documents.length > 0) {
        const profile = profileResponse.documents[0];
        const currentBadges = (profile.badges as string[]) || [];
        
        let newBadges = [...currentBadges];
        let gotFirstCatchBadge = false;
        let gotMonsterBadge = false;

        // Auto award First Catch badge
        if (!currentBadges.includes("first_catch")) {
          newBadges.push("first_catch");
          gotFirstCatchBadge = true;
        }

        // Auto award Monster Hunter badge
        if (earnedMonsterHunter && !currentBadges.includes("monster_hunter")) {
          newBadges.push("monster_hunter");
          gotMonsterBadge = true;
        }

        await databases.updateDocument(
          DB_ID,
          APPWRITE_PROFILES_ID,
          profile.$id,
          { 
            points: (profile.points || 0) + catchPoints,
            badges: newBadges
          }
        );

        if (gotFirstCatchBadge) {
          try {
            await databases.createDocument(DB_ID, APPWRITE_NOTIFICATIONS_ID, ID.unique(), {
              user_id: userId,
              title: "תג חדש! 🏅",
              message: "קיבלת את תג 'דייג מתחיל' על אישור התפיסה הראשונה שלך!",
              is_read: "false",
              type: "new_badge"
            });
          } catch (e) { console.error("Badge notif error", e); }
        }

        if (gotMonsterBadge) {
          try {
            await databases.createDocument(DB_ID, APPWRITE_NOTIFICATIONS_ID, ID.unique(), {
              user_id: userId,
              title: "תג חדש! 🦈",
              message: "קיבלת את תג 'מפלצת הים' על תפיסה של דג מעל 3 קילו!",
              is_read: "false",
              type: "new_badge"
            });
          } catch (e) { console.error("Badge notif error", e); }
        }
      }

      // 4. Send notification
      try {
        let msg = `המנהל אישר את התפיסה שלך וזכית ב-${catchPoints} מטבעות דיגון!`;
        if (earnedEarlyBird) msg += " (כולל 50 נק' בונוס על התפיסה הראשונה של היום!)";
        if (earnedMonsterHunter) msg += " (כולל 100 נק' בונוס מפלצת הים!)";

        await databases.createDocument(
          DB_ID,
          APPWRITE_NOTIFICATIONS_ID,
          ID.unique(),
          {
            user_id: userId,
            title: "תפיסה אושרה! 🎉",
            message: msg,
            is_read: "false",
            type: "catch_approved"
          }
        );
      } catch (e) {
        console.error("Failed to send notification", e);
      }

      return catchPoints;
    },
    onSuccess: (catchPoints) => {
      toast.success(`התפיסה אושרה בהצלחה והדייג קיבל ${catchPoints} מטבעות! 🎉`);
      queryClient.invalidateQueries({ queryKey: ["admin-catches"] });
      queryClient.invalidateQueries({ queryKey: ["catches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
    },
    onError: () => toast.error("שגיאה באישור התפיסה"),
  });

  // Edit Store Item Mutation
  const editStoreItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      const payload = { ...data };
      if (typeof payload.cost !== 'undefined') {
        payload.cost = payload.cost === "" || isNaN(parseInt(payload.cost)) ? 0 : parseInt(payload.cost);
      }
      // Don't send fields that Appwrite doesn't expect if they are empty
      if (!payload.description) payload.description = "";
      
      // Clean up internal appwrite fields before update if they exist
      delete payload.$id;
      delete payload.$createdAt;
      delete payload.$updatedAt;
      delete payload.$databaseId;
      delete payload.$collectionId;
      delete payload.$permissions;
      
      await databases.updateDocument(DB_ID, APPWRITE_STORE_ITEMS_ID, id, payload);
    },
    onSuccess: () => {
      toast.success("הפריט עודכן בהצלחה!");
      queryClient.invalidateQueries({ queryKey: ["admin-store-items"] });
      queryClient.invalidateQueries({ queryKey: ["store-items-aliexpress"] });
      setEditStoreItemModalOpen(false);
    },
    onError: () => toast.error("שגיאה בעדכון הפריט"),
  });

  // Toggle Ads Mutationus Mutation
  const updateAdStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await databases.updateDocument(DB_ID, ADS_ID, id, { status });
    },
    onSuccess: () => {
      toast.success("סטטוס המודעה עודכן");
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
    },
    onError: (err: any) => {
      toast.error("שגיאה בעדכון הסטטוס: " + err.message);
    }
  });

  // Delete Ad Mutation
  const deleteAdMutation = useMutation({
    mutationFn: async (id: string) => {
      await databases.deleteDocument(DB_ID, ADS_ID, id);
    },
    onSuccess: () => {
      toast.success("המודעה נמחקה בהצלחה!");
      queryClient.invalidateQueries({ queryKey: ["admin-ads"] });
    },
    onError: (err: any) => {
      toast.error("שגיאה במחיקת מודעה: " + err.message);
    }
  });

  // Add Store Item Mutation
  const addStoreItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await databases.createDocument(DB_ID, APPWRITE_STORE_ITEMS_ID, ID.unique(), {
        name: data.name,
        description: data.description,
        cost: parseInt(data.cost),
        type: data.type,
        value: data.value,
        is_active: true
      });
      return res;
    },
    onSuccess: (newDoc) => {
      toast.success("הפריט נוסף לחנות בהצלחה!");
      // Update cache instantly
      queryClient.setQueryData(["admin-store-items"], (old: any) => {
        return old ? [newDoc, ...old] : [newDoc];
      });
      // Also invalidate to be safe
      queryClient.invalidateQueries({ queryKey: ["admin-store-items"] });
    },
    onError: (err: any) => {
      toast.error("שגיאה בהוספת פריט: " + err.message);
    }
  });

  // Toggle Store Item Mutation
  const toggleStoreItemMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await databases.updateDocument(DB_ID, APPWRITE_STORE_ITEMS_ID, id, { is_active: isActive });
    },
    onSuccess: () => {
      toast.success("סטטוס הפריט עודכן!");
      queryClient.invalidateQueries({ queryKey: ["admin-store-items"] });
    }
  });

  // Send Points Mutation
  const sendPointsMutation = useMutation({
    mutationFn: async ({ userId, pointsToAdd, currentPoints }: { userId: string; pointsToAdd: number; currentPoints: number }) => {
      const finalPoints = Math.max(0, currentPoints + pointsToAdd);
      await databases.updateDocument(DB_ID, APPWRITE_PROFILES_ID, userId, { points: finalPoints });
      return { userId, finalPoints };
    },
    onSuccess: ({ userId, finalPoints }) => {
      toast.success("הנקודות עודכנו בהצלחה!");
      // Optimistic cache update
      queryClient.setQueryData(["admin-users"], (old: any) => {
        if (!old) return old;
        return old.map((u: any) => 
          u.$id === userId ? { ...u, points: finalPoints } : u
        );
      });
      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setPointsModalOpen(false);
    },
    onError: (err: any) => {
      toast.error("שגיאה בעדכון הנקודות: " + err.message);
    }
  });

  // Save Settings Mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: number }) => {
      // Find if setting exists
      const existing = settingsData?.find((s: any) => s.key === key);
      if (existing) {
        await databases.updateDocument(DB_ID, APPWRITE_SETTINGS_ID, existing.$id, { value });
      } else {
        await databases.createDocument(DB_ID, APPWRITE_SETTINGS_ID, ID.unique(), { key, value });
      }
    },
    onSuccess: () => {
      toast.success("ההגדרות נשמרו בהצלחה!");
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
    onError: (err: any) => {
      toast.error("שגיאה בשמירת הגדרות: " + err.message);
    }
  });

  const drawRaffleWinner = async () => {
    if (!usersData) return;
    
    // Create a pool of tickets
    const pool: any[] = [];
    usersData.forEach((user: any) => {
      const tickets = user.tickets || 0;
      for (let i = 0; i < tickets; i++) {
        pool.push(user);
      }
    });

    if (pool.length === 0) {
      toast.error("אף אחד לא קנה כרטיסי הגרלה עדיין!");
      return;
    }

    // Pick random
    const winner = pool[Math.floor(Math.random() * pool.length)];
    toast.success(`🎉 המנצח בהגרלה הוא: ${winner.full_name} (${winner.tickets} כרטיסים)!`, { duration: 10000 });
  };

  const resetRaffles = async () => {
    if (!usersData) return;
    if (!confirm("האם אתה בטוח שברצונך לאפס את כרטיסי ההגרלה של כולם ל-0?")) return;
    
    toast.info("מתחיל איפוס...");
    try {
      const promises = usersData
        .filter(u => u.tickets > 0)
        .map(u => databases.updateDocument(DB_ID, PROFILES_ID, u.$id, { tickets: 0 }));
      
      await Promise.all(promises);
      toast.success("איפוס הסתיים בהצלחה!");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e) {
      toast.error("שגיאה באיפוס");
    }
  };

  // Redirect if not logged in
  if (!loading && !user) {
    return <Navigate to="/login" replace />;
  }

  if (loading) return <div className="p-8 text-center">טוען...</div>;

  return (
    <div className="container mx-auto p-4 md:p-8 animate-fade-in" dir="rtl">
      <h1 className="text-3xl font-bold mb-8 text-foreground">פאנל ניהול - דיגון</h1>

      {activeTab === "home" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          <Card className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border-slate-200 dark:border-slate-800" onClick={() => setActiveTab("users")}>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center gap-3">
              <div className="p-4 bg-blue-500/10 rounded-2xl"><Users className="w-8 h-8 text-blue-500" /></div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">ניהול דייגים</h3>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border-slate-200 dark:border-slate-800" onClick={() => setActiveTab("ads")}>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center gap-3">
              <div className="p-4 bg-emerald-500/10 rounded-2xl"><LayoutList className="w-8 h-8 text-emerald-500" /></div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">שוק וציוד</h3>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border-slate-200 dark:border-slate-800" onClick={() => setActiveTab("locations")}>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center gap-3">
              <div className="p-4 bg-red-500/10 rounded-2xl"><MapPin className="w-8 h-8 text-red-500" /></div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">נקודות דייג</h3>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border-slate-200 dark:border-slate-800" onClick={() => setActiveTab("catches")}>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center gap-3">
              <div className="p-4 bg-cyan-500/10 rounded-2xl"><Camera className="w-8 h-8 text-cyan-500" /></div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">תפיסות ואישורים</h3>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border-slate-200 dark:border-slate-800" onClick={() => setActiveTab("store")}>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center gap-3">
              <div className="p-4 bg-yellow-500/10 rounded-2xl"><StoreIcon className="w-8 h-8 text-yellow-500" /></div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">חנות פרסים</h3>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border-slate-200 dark:border-slate-800" onClick={() => setActiveTab("tournaments")}>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center gap-3">
              <div className="p-4 bg-orange-500/10 rounded-2xl"><Trophy className="w-8 h-8 text-orange-500" /></div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">ליגת דיגון</h3>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border-slate-200 dark:border-slate-800" onClick={() => setActiveTab("notifications")}>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center gap-3">
              <div className="p-4 bg-purple-500/10 rounded-2xl"><BellRing className="w-8 h-8 text-purple-500" /></div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">התראות פוש</h3>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border-slate-200 dark:border-slate-800" onClick={() => setActiveTab("comments")}>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center gap-3">
              <div className="p-4 bg-rose-500/10 rounded-2xl"><MessageSquareWarning className="w-8 h-8 text-rose-500" /></div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">פיקוח תגובות</h3>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border-slate-200 dark:border-slate-800" onClick={() => setActiveTab("cams")}>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center gap-3">
              <div className="p-4 bg-teal-500/10 rounded-2xl"><Video className="w-8 h-8 text-teal-500" /></div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">ניהול מצלמות חוף</h3>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border-slate-200 dark:border-slate-800" onClick={() => setActiveTab("aliexpress")}>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center gap-3">
              <div className="p-4 bg-orange-500/10 rounded-2xl"><ShoppingCart className="w-8 h-8 text-orange-500" /></div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">המלצות ציוד</h3>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors border-slate-200 dark:border-slate-800" onClick={() => setActiveTab("settings")}>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center gap-3">
              <div className="p-4 bg-slate-500/10 rounded-2xl"><Settings className="w-8 h-8 text-slate-500" /></div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200">הגדרות מערכת</h3>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setActiveTab("home")} className="mb-4 text-muted-foreground hover:text-foreground">
            &larr; חזור לתפריט
          </Button>
        </div>
      )}

      <div className="grid gap-6">
        {activeTab === "users" && (
          <Card>
            <CardHeader>
              <CardTitle>ניהול משתמשים (דייגים)</CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? <p>טוען משתמשים...</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>שם / אימייל</TableHead>
                      <TableHead>תפקיד</TableHead>
                      <TableHead>נקודות במערכת</TableHead>
                      <TableHead>פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersData?.map((u: any) => (
                      <TableRow key={u.$id}>
                        <TableCell>{u.full_name || 'ללא שם'}</TableCell>
                        <TableCell>{u.role === 'ADMIN' ? 'מנהל' : 'משתמש רגיל'}</TableCell>
                        <TableCell className="font-bold text-yellow-600">{u.points || 0} נק׳</TableCell>
                        <TableCell>
                          <Button 
                            size="sm"
                            variant="outline"
                            className="bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white border-blue-200"
                            onClick={() => {
                              setSelectedUserForPoints(u);
                              setPointsAmount("0");
                              setPointsOperation("add");
                              setPointsModalOpen(true);
                            }}
                          >
                            <Coins className="w-4 h-4 ml-1" /> נהל נקודות
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!usersData || usersData.length === 0) && (
                      <TableRow><TableCell colSpan={4} className="text-center">אין משתמשים</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "ads" && (
          <Card>
            <CardHeader>
              <CardTitle>אישור מודעות</CardTitle>
            </CardHeader>
            <CardContent>
              {adsLoading ? <p>טוען מודעות...</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>כותרת</TableHead>
                      <TableHead>מחיר</TableHead>
                      <TableHead>סטטוס</TableHead>
                      <TableHead>פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adsData?.map((ad: any) => (
                      <TableRow key={ad.$id}>
                        <TableCell>{ad.title}</TableCell>
                        <TableCell>{ad.price} ₪</TableCell>
                        <TableCell>{ad.status === 'approved' ? 'מאושר' : ad.status === 'rejected' ? 'נדחה' : 'ממתין'}</TableCell>
                        <TableCell className="flex gap-2">
                          {ad.status !== 'approved' && (
                            <Button size="sm" variant="outline" className="text-green-600" onClick={() => updateAdStatusMutation.mutate({ id: ad.$id, status: 'approved' })} disabled={updateAdStatusMutation.isPending}>
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          {ad.status !== 'rejected' && (
                            <Button size="sm" variant="outline" className="text-red-600" onClick={() => updateAdStatusMutation.mutate({ id: ad.$id, status: 'rejected' })} disabled={updateAdStatusMutation.isPending}>
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!adsData || adsData.length === 0) && (
                      <TableRow><TableCell colSpan={4} className="text-center">אין מודעות במערכת</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "locations" && (
          <Card>
            <CardHeader>
              <CardTitle>מיקומי דייג</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <Input 
                  placeholder="הזן שם של מיקום דייג חדש..." 
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  className="max-w-xs"
                />
                <Button onClick={() => addLocationMutation.mutate(newLocationName)} disabled={!newLocationName || addLocationMutation.isPending}>
                  הוסף מיקום
                </Button>
              </div>

              {locationsLoading ? <p>טוען מיקומים...</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>תמונה</TableHead>
                      <TableHead>שם המיקום</TableHead>
                      <TableHead>שיטות</TableHead>
                      <TableHead>מפה</TableHead>
                      <TableHead>סטטוס</TableHead>
                      <TableHead>פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locationsData?.map((loc: any) => {
                      const previewUrl = loc.image_url 
                        ? storage.getFilePreview(APPWRITE_CATCH_IMAGES_BUCKET_ID, loc.image_url).href 
                        : null;
                      return (
                      <TableRow key={loc.$id}>
                        <TableCell>
                          {previewUrl ? (
                            <img src={previewUrl} alt={loc.name} className="w-12 h-12 object-cover rounded-md" />
                          ) : (
                            <div className="w-12 h-12 bg-slate-100 rounded-md flex items-center justify-center text-xs text-slate-400">אין</div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{loc.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{loc.fishing_methods || "לא צוין"}</TableCell>
                        <TableCell>
                          {loc.map_url ? (
                            <a href={loc.map_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline text-xs">
                              פתח מפה
                            </a>
                          ) : (
                            <span className="text-slate-400 text-xs">אין קישור</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={loc.status === 'approved' ? 'text-green-600' : 'text-orange-500 font-bold'}>
                            {loc.status === 'approved' ? 'מאושר' : 'ממתין'}
                          </span>
                        </TableCell>
                        <TableCell className="flex gap-2 items-center h-16">
                          {loc.status !== 'approved' && loc.user_id && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => approveLocationMutation.mutate({ locId: loc.$id, userId: loc.user_id })}
                              disabled={approveLocationMutation.isPending}
                            >
                              <Check className="w-4 h-4" /> אשר
                            </Button>
                          )}
                          <Button size="sm" variant="destructive" onClick={() => deleteLocationMutation.mutate(loc.$id)}>
                            <Trash2 className="w-4 h-4" /> מחק
                          </Button>
                        </TableCell>
                      </TableRow>
                    )})}
                    {(!locationsData || locationsData.length === 0) && (
                      <TableRow><TableCell colSpan={2} className="text-center">לא הוזנו מיקומים</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "catches" && (
          <Card>
            <CardHeader>
              <CardTitle>ניהול תפיסות</CardTitle>
            </CardHeader>
            <CardContent>
              {catchesLoading ? <p>טוען תפיסות...</p> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>שם הדייג</TableHead>
                      <TableHead>סוג דג</TableHead>
                      <TableHead>תאריך</TableHead>
                      <TableHead>סטטוס</TableHead>
                      <TableHead>פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {catchesData?.map((catchItem: any) => (
                      <TableRow key={catchItem.$id}>
                        <TableCell>{catchItem.user_name}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span>{catchItem.fish_type} {catchItem.weight ? `(${catchItem.weight})` : ""}</span>
                            <div className="flex gap-1 flex-wrap">
                              {catchItem.is_early_bird && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full font-bold">🌞 המשכים קום</span>}
                              {(() => {
                                let isMonster = false;
                                if (catchItem.weight) {
                                  let w = 0;
                                  const str = catchItem.weight.toLowerCase();
                                  const m = str.match(/[\d.]+/);
                                  if (m) {
                                    let v = parseFloat(m[0]);
                                    if (str.includes('kg') || str.includes('ק"ג') || str.includes('קילו')) w = v * 1000;
                                    else w = v;
                                  }
                                  if (w >= 3000) isMonster = true;
                                }
                                return isMonster ? <span className="text-[10px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full font-bold">🦈 מפלצת</span> : null;
                              })()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(catchItem.$createdAt).toLocaleDateString("he-IL")}</TableCell>
                        <TableCell>
                          <span className={catchItem.status === 'approved' ? 'text-green-600' : 'text-orange-500 font-bold'}>
                            {catchItem.status === 'approved' ? 'מאושר' : 'ממתין'}
                          </span>
                        </TableCell>
                        <TableCell className="flex gap-2">
                          {catchItem.status !== 'approved' && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => {
                                approveCatchMutation.mutate({ 
                                  catchId: catchItem.$id, 
                                  userId: catchItem.user_id,
                                  weight: catchItem.weight,
                                  isEarlyBird: catchItem.is_early_bird
                                });
                              }}
                              disabled={approveCatchMutation.isPending}
                            >
                              <Check className="w-4 h-4" /> אשר
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-slate-100"
                            onClick={() => {
                              setSelectedCatchToEdit(catchItem);
                              setEditFishType(catchItem.fish_type || "");
                              setEditWeight(catchItem.weight || "");
                              
                              const locParts = (catchItem.location || "").split("|||");
                              setEditLocation(locParts[0] ? locParts[0].trim() : "");
                              setEditMapUrl(locParts[1] ? locParts[1].trim() : "");
                              
                              setEditCatchModalOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" /> ערוך
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => {
                              if(window.confirm("האם למחוק תפיסה זו? (פעולה זו תמחק גם את התמונה)")) {
                                deleteCatchMutation.mutate({ id: catchItem.$id, imageId: catchItem.image_id });
                              }
                            }}
                            disabled={deleteCatchMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4" /> מחק
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!catchesData || catchesData.length === 0) && (
                      <TableRow><TableCell colSpan={4} className="text-center">אין תפיסות במערכת</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      {/* Raffles Tab */}
      {activeTab === "raffles" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Ticket className="w-5 h-5 text-rose-500"/> ניהול הגרלות ופרסים</CardTitle>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <p>טוען משתמשים...</p>
            ) : (
              <div className="space-y-6">
                <div className="flex gap-4">
                  <Button onClick={drawRaffleWinner} className="bg-rose-500 hover:bg-rose-600 gap-2 h-12 text-lg px-8">
                    <Ticket className="w-5 h-5" /> בצע הגרלה עכשיו!
                  </Button>
                  <Button onClick={resetRaffles} variant="destructive" className="h-12 px-8">
                    אפס כרטיסים לכולם
                  </Button>
                </div>
                
                <h3 className="font-bold mt-8 mb-4">משתתפים בעלי כרטיסים:</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">שם</TableHead>
                        <TableHead className="text-right">כרטיסים 🎟️</TableHead>
                        <TableHead className="text-right">סה״כ נקודות</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(usersData || []).filter((u: any) => u.tickets > 0).map((user: any) => (
                        <TableRow key={user.$id}>
                          <TableCell className="font-medium">{user.full_name || 'אנונימי'}</TableCell>
                          <TableCell className="font-bold text-rose-600">{user.tickets}</TableCell>
                          <TableCell>{user.points}</TableCell>
                        </TableRow>
                      ))}
                      {(usersData || []).filter((u: any) => u.tickets > 0).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            אין משתתפים עם כרטיסי הגרלה עדיין.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Store Management Tab */}
      {activeTab === "store" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><StoreIcon className="w-5 h-5 text-yellow-500"/> ניהול חנות דיגון</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl mb-8 border border-slate-200 dark:border-slate-800">
              <h3 className="font-bold mb-4">הוספת פריט / חבילה חדשה</h3>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <Input placeholder="שם החבילה/מוצר" value={newStoreItem.name} onChange={e => setNewStoreItem({...newStoreItem, name: e.target.value})} />
                <Input placeholder="תיאור קצר" value={newStoreItem.description} onChange={e => setNewStoreItem({...newStoreItem, description: e.target.value})} />
                <Input type="number" placeholder="עלות (נקודות)" value={newStoreItem.cost} onChange={e => setNewStoreItem({...newStoreItem, cost: e.target.value})} />
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newStoreItem.type} 
                  onChange={e => setNewStoreItem({...newStoreItem, type: e.target.value})}
                >
                  <option value="title">תואר (Title)</option>
                  <option value="border">מסגרת (Border)</option>
                  <option value="tickets">כרטיסי הגרלה</option>
                  <option value="ai_credits">סריקות AI</option>
                  <option value="feature">פיצ'ר מיוחד</option>
                </select>
                <Input placeholder="ערך / קישור AliExpress" value={newStoreItem.value} onChange={e => setNewStoreItem({...newStoreItem, value: e.target.value})} />
                {newStoreItem.type === 'aliexpress' && (
                  <Input placeholder="קישור לתמונה (חובה לאליאקספרס)" value={newStoreItem.image_url} onChange={e => setNewStoreItem({...newStoreItem, image_url: e.target.value})} />
                )}
              </div>
              <Button 
                className="mt-4 bg-yellow-500 hover:bg-yellow-600 w-full md:w-auto"
                disabled={!newStoreItem.name || (newStoreItem.type !== 'aliexpress' && !newStoreItem.cost) || !newStoreItem.value || addStoreItemMutation.isPending}
                onClick={() => {
                  const payload: any = { ...newStoreItem };
                  if (payload.type === 'aliexpress' && !payload.cost) payload.cost = 0; // Cost is 0 for aliexpress items
                  addStoreItemMutation.mutate(payload);
                  setNewStoreItem({ name: "", description: "", cost: "", type: "title", value: "", image_url: "" });
                }}
              >
                הוסף לחנות
              </Button>
            </div>

            {storeItemsLoading ? <p>טוען חבילות...</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>שם החבילה</TableHead>
                    <TableHead>עלות</TableHead>
                    <TableHead>סוג</TableHead>
                    <TableHead>סטטוס (פעיל/כבוי)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {storeItemsData?.filter((item: any) => item.type !== 'aliexpress').map((item: any) => (
                    <TableRow key={item.$id} className={item.is_active ? '' : 'opacity-50'}>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.description}</div>
                      </TableCell>
                      <TableCell className="font-bold text-yellow-600">{item.cost} נק'</TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant={item.is_active ? "default" : "outline"}
                            size="sm"
                            className={item.is_active ? "bg-green-500 hover:bg-green-600" : ""}
                            onClick={() => toggleStoreItemMutation.mutate({ id: item.$id, isActive: !item.is_active })}
                          >
                            {item.is_active ? "פעיל - מוצג" : "כבוי - מוסתר"}
                          </Button>
                          <Button 
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedStoreItemToEdit(item);
                              setEditStoreItemData({
                                name: item.name || "",
                                description: item.description || "",
                                cost: item.cost || "",
                                type: item.type || "title",
                                value: item.value || "",
                                image_url: item.image_url || ""
                              });
                              setEditStoreItemModalOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if(window.confirm("האם אתה בטוח שברצונך למחוק מוצר זה?")) {
                                deleteStoreItemMutation.mutate(item.$id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!storeItemsData || storeItemsData.filter((i: any) => i.type !== 'aliexpress').length === 0) && (
                    <TableRow><TableCell colSpan={4} className="text-center">אין חבילות בחנות</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* AliExpress Tab */}
      {activeTab === "aliexpress" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-orange-500"/> ניהול המלצות ציוד (AliExpress)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl mb-8 border border-slate-200 dark:border-slate-800">
              <h3 className="font-bold mb-4">הוספת מוצר מומלץ חדש</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input placeholder="שם המוצר" value={newStoreItem.name} onChange={e => setNewStoreItem({...newStoreItem, name: e.target.value})} />
                <Input placeholder="תיאור קצר (לדוגמה: פיתיון מנצח ללברק)" value={newStoreItem.description} onChange={e => setNewStoreItem({...newStoreItem, description: e.target.value})} />
                <Input placeholder="קישור למוצר באליאקספרס" value={newStoreItem.value} onChange={e => setNewStoreItem({...newStoreItem, value: e.target.value})} />
                <div className="flex gap-2">
                  <Input placeholder="קישור לתמונה או העלאה" value={newStoreItem.image_url} onChange={e => setNewStoreItem({...newStoreItem, image_url: e.target.value})} className="flex-1" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    id="aliexpress-image-upload" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingImage(true);
                      try {
                        const jpegFile = await convertToJpeg(file);
                        const uploaded = await storage.createFile(APPWRITE_CATCH_IMAGES_BUCKET_ID, ID.unique(), jpegFile);
                        const url = storage.getFileView(APPWRITE_CATCH_IMAGES_BUCKET_ID, uploaded.$id);
                        setNewStoreItem({...newStoreItem, image_url: url.href});
                        toast.success("תמונה הועלתה בהצלחה!");
                      } catch (err: any) {
                        toast.error("שגיאה בהעלאת תמונה: " + (err?.message || "Unknown error"));
                        console.error(err);
                      } finally {
                        setUploadingImage(false);
                      }
                    }}
                  />
                  <Button 
                    variant="outline" 
                    className="shrink-0"
                    onClick={() => document.getElementById('aliexpress-image-upload')?.click()}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <Button 
                className="mt-4 bg-orange-500 hover:bg-orange-600 w-full md:w-auto text-white"
                disabled={!newStoreItem.name || !newStoreItem.value || !newStoreItem.image_url || addStoreItemMutation.isPending}
                onClick={() => {
                  const payload: any = { ...newStoreItem, type: 'aliexpress', cost: 0 };
                  addStoreItemMutation.mutate(payload);
                  setNewStoreItem({ name: "", description: "", cost: "", type: "title", value: "", image_url: "" });
                }}
              >
                הוסף להמלצות
              </Button>
            </div>

            {storeItemsLoading ? <p>טוען מוצרים...</p> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>שם המוצר</TableHead>
                    <TableHead>קישור אליאקספרס</TableHead>
                    <TableHead>סטטוס (פעיל/כבוי)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {storeItemsData?.filter((item: any) => item.type === 'aliexpress').map((item: any) => (
                    <TableRow key={item.$id} className={item.is_active ? '' : 'opacity-50'}>
                      <TableCell>
                        <div className="font-medium flex items-center gap-3">
                          {item.image_url && <img src={item.image_url} alt="" className="w-10 h-10 rounded-md object-cover border border-slate-200 dark:border-slate-800" />}
                          <div>
                            <div>{item.name}</div>
                            <div className="text-xs text-muted-foreground">{item.description}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <a href={item.value} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline flex items-center gap-1 text-xs bg-blue-500/10 px-2 py-1 rounded-md w-fit">
                          צפה במוצר <ExternalLink className="w-3 h-3" />
                        </a>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant={item.is_active ? "default" : "outline"}
                            size="sm"
                            className={item.is_active ? "bg-green-500 hover:bg-green-600" : ""}
                            onClick={() => toggleStoreItemMutation.mutate({ id: item.$id, isActive: !item.is_active })}
                          >
                            {item.is_active ? "פעיל - מוצג" : "כבוי - מוסתר"}
                          </Button>
                          <Button 
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedStoreItemToEdit(item);
                              setEditStoreItemData({
                                name: item.name || "",
                                description: item.description || "",
                                cost: item.cost || "",
                                type: item.type || "aliexpress",
                                value: item.value || "",
                                image_url: item.image_url || ""
                              });
                              setEditStoreItemModalOpen(true);
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if(window.confirm("האם אתה בטוח שברצונך למחוק מוצר זה?")) {
                                deleteStoreItemMutation.mutate(item.$id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!storeItemsData || storeItemsData.filter((i: any) => i.type === 'aliexpress').length === 0) && (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">אין עדיין המלצות ציוד. הוסף את המוצר הראשון שלך!</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-slate-500"/> הגדרות אפליקציה כלליות</CardTitle>
          </CardHeader>
          <CardContent>
            {settingsLoading ? <p>טוען הגדרות...</p> : (
              <div className="space-y-6">
                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">נקודות הרשמה 🎁</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-md">
                      כמות הנקודות שמשתמש מקבל באופן אוטומטי מיד לאחר יצירת החשבון.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <Input 
                      type="number" 
                      className="w-24 text-center font-bold text-lg"
                      defaultValue={settingsData?.find((s:any) => s.key === 'registration_points')?.value || 50}
                      id="input_registration_points"
                    />
                    <Button onClick={() => {
                      const val = parseInt((document.getElementById('input_registration_points') as HTMLInputElement).value) || 0;
                      saveSettingsMutation.mutate({ key: 'registration_points', value: val });
                    }} disabled={saveSettingsMutation.isPending}>שמור</Button>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">נקודות אישור תפיסה 🐟</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-md">
                      כמות הנקודות שהדייג מקבל כשהמנהל מאשר את התפיסה שלו בעמוד התפיסות.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <Input 
                      type="number" 
                      className="w-24 text-center font-bold text-lg"
                      defaultValue={settingsData?.find((s:any) => s.key === 'catch_approved_points')?.value || 10}
                      id="input_catch_approved_points"
                    />
                    <Button onClick={() => {
                      const val = parseInt((document.getElementById('input_catch_approved_points') as HTMLInputElement).value) || 0;
                      saveSettingsMutation.mutate({ key: 'catch_approved_points', value: val });
                    }} disabled={saveSettingsMutation.isPending}>שמור</Button>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">נקודות דיווח מיקום 📍</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-md">
                      כמות הנקודות שמקבל משתמש שמוסיף מיקום דייג חדש במפה.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <Input 
                      type="number" 
                      className="w-24 text-center font-bold text-lg"
                      defaultValue={settingsData?.find((s:any) => s.key === 'location_report_points')?.value || 15}
                      id="input_location_report_points"
                    />
                    <Button onClick={() => {
                      const val = parseInt((document.getElementById('input_location_report_points') as HTMLInputElement).value) || 0;
                      saveSettingsMutation.mutate({ key: 'location_report_points', value: val });
                    }} disabled={saveSettingsMutation.isPending}>שמור</Button>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">סף דיווחי ספאם לחסימה 🛡️</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-md">
                      כמות הפעמים שמשתמשים צריכים לדווח על תפיסה כ"ספאם" כדי שהיא תוסתר אוטומטית.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <Input 
                      type="number" 
                      className="w-24 text-center font-bold text-lg"
                      defaultValue={settingsData?.find((s:any) => s.key === 'auto_hide_threshold')?.value || 3}
                      id="input_auto_hide_threshold"
                    />
                    <Button onClick={() => {
                      const val = parseInt((document.getElementById('input_auto_hide_threshold') as HTMLInputElement).value) || 0;
                      saveSettingsMutation.mutate({ key: 'auto_hide_threshold', value: val });
                    }} disabled={saveSettingsMutation.isPending}>שמור</Button>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">בונוס התחברות יומית (Streak) 🎁</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-md">
                      כמות הנקודות שמקבלים בכל יום רצוף של התחברות לאפליקציה (ימים 1-7).
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 w-full">
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                      const defaultVals: any = { 1:10, 2:20, 3:30, 4:40, 5:50, 6:60, 7:150 };
                      return (
                        <div key={day} className="flex flex-col gap-1">
                          <label className="text-xs font-bold text-slate-500 text-center">יום {day}</label>
                          <Input 
                            type="number" 
                            className="text-center font-bold"
                            defaultValue={settingsData?.find((s:any) => s.key === `daily_bonus_day_${day}`)?.value || defaultVals[day]}
                            id={`input_daily_bonus_day_${day}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={async () => {
                      const promises = [1, 2, 3, 4, 5, 6, 7].map((day) => {
                        const val = parseInt((document.getElementById(`input_daily_bonus_day_${day}`) as HTMLInputElement).value) || 0;
                        // Use mutation asynchronously
                        return saveSettingsMutation.mutateAsync({ key: `daily_bonus_day_${day}`, value: val });
                      });
                      try {
                        await Promise.all(promises);
                        // The mutation handles success toast and invalidation
                      } catch(e) {
                        toast.error("שגיאה בשמירת חלק מהימים");
                      }
                    }} disabled={saveSettingsMutation.isPending}>
                      שמור את כל הימים
                    </Button>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-start gap-4">
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">הודעת מערכת גלובלית 📢</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-md">
                        טקסט שיוצג כבאנר בולט בראש מסך הבית לכלל המשתמשים.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">הפעל באנר:</span>
                      <Switch 
                        checked={settingsData?.find((s:any) => s.key === 'global_announcement_active')?.value === 'true'}
                        onCheckedChange={(checked) => {
                          saveSettingsMutation.mutate({ key: 'global_announcement_active', value: checked ? 'true' : 'false' });
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row w-full gap-3">
                    <Input 
                      type="text" 
                      placeholder="הכנס את תוכן ההודעה כאן..."
                      className="flex-1 font-medium"
                      defaultValue={settingsData?.find((s:any) => s.key === 'global_announcement')?.value || ''}
                      id="input_global_announcement"
                    />
                    <Button onClick={() => {
                      const val = (document.getElementById('input_global_announcement') as HTMLInputElement).value || '';
                      saveSettingsMutation.mutate({ key: 'global_announcement', value: val });
                    }} disabled={saveSettingsMutation.isPending}>שמור הודעה</Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tournaments Tab */}
      {activeTab === "tournaments" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-orange-500"/> ניהול תחרויות ואתגרים</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-orange-500/5 border border-orange-500/20 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2 w-full">
                <label className="text-xs font-bold text-slate-500">כותרת התחרות (למשל: תחרות לוקוסים)</label>
                <Input id="new_tournament_title" placeholder="כותרת" />
              </div>
              <div className="flex-1 space-y-2 w-full">
                <label className="text-xs font-bold text-slate-500">תיאור וכללים</label>
                <Input id="new_tournament_desc" placeholder="תיאור התחרות" />
              </div>
              <div className="w-full md:w-32 space-y-2">
                <label className="text-xs font-bold text-slate-500">דמי הרשמה</label>
                <Input id="new_tournament_entry" type="number" defaultValue="50" />
              </div>
              <div className="w-full md:w-32 space-y-2">
                <label className="text-xs font-bold text-slate-500">קופה התחלתית</label>
                <Input id="new_tournament_prize" type="number" defaultValue="1000" />
              </div>
              <div className="w-full md:w-40 space-y-2">
                <label className="text-xs font-bold text-slate-500">תאריך סיום</label>
                <Input id="new_tournament_end" type="date" />
              </div>
              <Button onClick={() => {
                const title = (document.getElementById('new_tournament_title') as HTMLInputElement).value;
                const desc = (document.getElementById('new_tournament_desc') as HTMLInputElement).value;
                const entry = parseInt((document.getElementById('new_tournament_entry') as HTMLInputElement).value) || 0;
                const prize = parseInt((document.getElementById('new_tournament_prize') as HTMLInputElement).value) || 0;
                const end = (document.getElementById('new_tournament_end') as HTMLInputElement).value;
                if (!title || !end || !desc) {
                  toast.error("חובה למלא כותרת, תיאור ותאריך סיום");
                  return;
                }
                createTournament({
                  title, 
                  description: desc, 
                  entry_fee: entry,
                  prize_pool: prize, 
                  start_date: new Date().toISOString(), 
                  end_date: new Date(end).toISOString(), 
                  status: 'active',
                  participants: []
                });
                (document.getElementById('new_tournament_title') as HTMLInputElement).value = "";
              }}>יצירת תחרות חדשה</Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם התחרות</TableHead>
                  <TableHead>הרשמה</TableHead>
                  <TableHead>קופה</TableHead>
                  <TableHead>משתתפים</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tournaments.map((t) => (
                  <TableRow key={t.$id}>
                    <TableCell className="font-bold">{t.title}</TableCell>
                    <TableCell>{t.entry_fee} 🪙</TableCell>
                    <TableCell className="font-bold text-amber-600">{t.prize_pool} 🪙</TableCell>
                    <TableCell>{t.participants?.length || 0}</TableCell>
                    <TableCell>
                      {t.status === 'active' ? (
                        <span className="bg-green-500/20 text-green-600 px-2 py-1 rounded-full text-xs font-bold">פעילה</span>
                      ) : (
                        <span className="bg-slate-500/20 text-slate-600 px-2 py-1 rounded-full text-xs font-bold">
                          {t.status === 'upcoming' ? 'בקרוב' : 'הסתיימה'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 items-center flex-wrap">
                        {t.status === 'active' && (
                          <Button 
                            size="sm" 
                            variant="default" 
                            className="h-8 bg-amber-500 hover:bg-amber-600 text-black" 
                            onClick={async () => {
                              try {
                                toast.loading("מחשב את המנצח (סך משקל)...", { id: "calc-winner" });
                                
                                // 1. Fetch all approved catches in timeframe
                                const res = await databases.listDocuments(DB_ID, APPWRITE_CATCHES_ID, [
                                  Query.equal('status', 'approved'),
                                  Query.greaterThanEqual('$createdAt', t.start_date),
                                  Query.lessThanEqual('$createdAt', t.end_date || new Date().toISOString()),
                                  Query.limit(500)
                                ]);
                                
                                if (res.documents.length === 0) {
                                  toast.error("לא נמצאו תפיסות בטווח התחרות", { id: "calc-winner" });
                                  return;
                                }

                                // 2. Parse weights and sum by user
                                const userWeights: Record<string, number> = {};
                                res.documents.forEach((catchDoc: any) => {
                                  // Only count catches from users who actually participated
                                  if (!t.participants?.includes(catchDoc.user_id)) return;

                                  let weightInGrams = 0;
                                  const weightStr = (catchDoc.weight || "").toLowerCase();
                                  
                                  const numMatch = weightStr.match(/[\d.]+/);
                                  if (numMatch) {
                                    let val = parseFloat(numMatch[0]);
                                    if (weightStr.includes('kg') || weightStr.includes('ק"ג') || weightStr.includes('קילו')) {
                                      weightInGrams = val * 1000;
                                    } else {
                                      weightInGrams = val;
                                    }
                                  }
                                  
                                  userWeights[catchDoc.user_id] = (userWeights[catchDoc.user_id] || 0) + weightInGrams;
                                });

                                let maxWeight = -1;
                                let winnerId = null;
                                
                                Object.keys(userWeights).forEach(uid => {
                                  if (userWeights[uid] > maxWeight) {
                                    maxWeight = userWeights[uid];
                                    winnerId = uid;
                                  }
                                });

                                if (!winnerId) {
                                  toast.error("לא נמצאו תפיסות למשתתפים רשומים", { id: "calc-winner" });
                                  return;
                                }

                                // 3. Declare winner
                                await endTournament({ tournamentId: t.$id, winnerId, prize: t.prize_pool });
                                toast.success(`נמצא מנצח! התחרות הסתיימה.`, { id: "calc-winner" });
                                
                              } catch (e) {
                                toast.error("שגיאה בחישוב המנצח", { id: "calc-winner" });
                              }
                            }}
                          >
                            חישוב מנצח וסיום 🏆
                          </Button>
                        )}
                        {t.status !== 'active' && t.winner_user_id && (
                          <span className="text-xs text-muted-foreground ml-4">מנצח: {t.winner_user_id}</span>
                        )}
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="h-8 ml-auto" 
                          onClick={() => {
                            if(confirm('למחוק תחרות זו? (פעולה זו לא תמחק את הנקודות שכבר חולקו)')) {
                              deleteTournament(t.$id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BellRing className="w-5 h-5 text-purple-500"/> הודעות פוש למשתמשים</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-purple-500/5 border border-purple-500/20 p-6 rounded-xl space-y-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">שליחת התראה לקהילה</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-md">
                  ההתראה תופיע במרכז ההתראות באפליקציה (כפעמון אדום), 
                  ותוכל לשמש למידע על תחרויות, אזהרות, או פניות אישיות.
                </p>
              </div>
              
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">בחר נמען</label>
                  <select id="global_push_recipient" className="w-full max-w-md bg-background border border-border rounded-md px-3 py-2 text-sm">
                    <option value="all">לכל המשתמשים (גלובלי)</option>
                    {usersData?.map(u => (
                      <option key={u.$id} value={u.user_id}>
                        {u.full_name || "אנונימי"} (מזהה: {u.user_id?.substring(0, 8)}...)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">כותרת ההתראה</label>
                  <Input id="global_push_title" placeholder="למשל: תחרות חדשה באוויר! 🎉" className="max-w-md" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">תוכן ההתראה</label>
                  <Input id="global_push_message" placeholder="פירוט ההודעה שיופיע למשתמשים" className="max-w-md" />
                </div>
                <Button 
                  className="bg-purple-600 hover:bg-purple-700 text-white mt-4"
                  onClick={async () => {
                    const recipient = (document.getElementById('global_push_recipient') as HTMLSelectElement).value;
                    const title = (document.getElementById('global_push_title') as HTMLInputElement).value;
                    const message = (document.getElementById('global_push_message') as HTMLInputElement).value;
                    if (!title || !message) {
                      toast.error("חובה להזין כותרת ותוכן");
                      return;
                    }
                    
                    toast.promise(
                      databases.createDocument(DB_ID, APPWRITE_NOTIFICATIONS_ID, ID.unique(), {
                        user_id: recipient,
                        title,
                        message,
                        is_read: "false",
                        type: recipient === "all" ? "global_push" : "personal_push"
                      }),
                      {
                        loading: "שולח התראות...",
                        success: () => {
                          (document.getElementById('global_push_title') as HTMLInputElement).value = "";
                          (document.getElementById('global_push_message') as HTMLInputElement).value = "";
                          return recipient === "all" ? "ההתראה נשלחה לכולם בהצלחה!" : "התראה נשלחה למשתמש!";
                        },
                        error: "שגיאה בשליחת התראה"
                      }
                    );
                  }}
                >
                  <BellRing className="w-4 h-4 mr-2 ml-1" />
                  שלח התראה
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cams Tab */}
      {activeTab === "cams" && (
        <CamsManager />
      )}

      {/* Edit Store Item Modal */}
      {editStoreItemModalOpen && selectedStoreItemToEdit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl w-full max-w-sm shadow-xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setEditStoreItemModalOpen(false)}
              className="absolute top-4 end-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-center mb-4">עריכת פריט</h2>
            <div className="space-y-3">
              <Input placeholder="שם המוצר" value={editStoreItemData.name} onChange={e => setEditStoreItemData({...editStoreItemData, name: e.target.value})} />
              <Input placeholder="תיאור קצר" value={editStoreItemData.description} onChange={e => setEditStoreItemData({...editStoreItemData, description: e.target.value})} />
              {editStoreItemData.type !== 'aliexpress' && (
                <Input type="number" placeholder="עלות (נקודות)" value={editStoreItemData.cost} onChange={e => setEditStoreItemData({...editStoreItemData, cost: e.target.value})} />
              )}
              <Input placeholder="קישור למוצר באליאקספרס / ערך" value={editStoreItemData.value} onChange={e => setEditStoreItemData({...editStoreItemData, value: e.target.value})} />
              
              <div className="flex gap-2">
                <Input placeholder="קישור לתמונה או העלאה" value={editStoreItemData.image_url} onChange={e => setEditStoreItemData({...editStoreItemData, image_url: e.target.value})} className="flex-1" />
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  id="edit-store-image-upload" 
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingImage(true);
                    try {
                      const jpegFile = await convertToJpeg(file);
                      const uploaded = await storage.createFile(APPWRITE_CATCH_IMAGES_BUCKET_ID, ID.unique(), jpegFile);
                      const url = storage.getFileView(APPWRITE_CATCH_IMAGES_BUCKET_ID, uploaded.$id);
                      setEditStoreItemData({...editStoreItemData, image_url: url.href});
                      toast.success("תמונה הועלתה בהצלחה!");
                    } catch (err: any) {
                      toast.error("שגיאה בהעלאת תמונה: " + (err?.message || "Unknown error"));
                      console.error(err);
                    } finally {
                      setUploadingImage(false);
                    }
                  }}
                />
                <Button 
                  variant="outline" 
                  className="shrink-0"
                  onClick={() => document.getElementById('edit-store-image-upload')?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                </Button>
              </div>

              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4"
                disabled={!editStoreItemData.name || !editStoreItemData.value || editStoreItemMutation.isPending}
                onClick={() => {
                  editStoreItemMutation.mutate({ id: selectedStoreItemToEdit.$id, data: editStoreItemData });
                }}
              >
                {editStoreItemMutation.isPending ? "שומר..." : "שמור שינויים"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Points Modal */}
      {pointsModalOpen && selectedUserForPoints && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl w-full max-w-sm shadow-xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setPointsModalOpen(false)}
              className="absolute top-4 end-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-3">
                <Coins className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-xl font-bold text-center">ניהול נקודות</h2>
              <p className="text-sm text-center text-muted-foreground mt-1">
                עבור {selectedUserForPoints.full_name || 'אנונימי'}
              </p>
              <div className="mt-2 text-sm bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full font-medium">
                יתרה נוכחית: <span className="font-bold text-blue-600 dark:text-blue-400">{selectedUserForPoints.points || 0} נק׳</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Button 
                  variant={pointsOperation === "add" ? "default" : "outline"} 
                  className={`flex-1 ${pointsOperation === "add" ? "bg-green-500 hover:bg-green-600 text-white" : ""}`}
                  onClick={() => setPointsOperation("add")}
                >
                  הענק נקודות (+)
                </Button>
                <Button 
                  variant={pointsOperation === "remove" ? "default" : "outline"} 
                  className={`flex-1 ${pointsOperation === "remove" ? "bg-rose-500 hover:bg-rose-600 text-white" : ""}`}
                  onClick={() => setPointsOperation("remove")}
                >
                  הורד נקודות (-)
                </Button>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  כמות נקודות {pointsOperation === 'add' ? 'להוספה' : 'להורדה'}
                </label>
                <Input 
                  type="number"
                  placeholder="למשל: 50"
                  value={pointsAmount}
                  onChange={e => setPointsAmount(e.target.value)}
                  className="h-12 text-center text-xl font-bold"
                  autoFocus
                />
              </div>

              <Button 
                className="w-full h-12 text-lg font-bold mt-4" 
                disabled={!pointsAmount || parseInt(pointsAmount) <= 0 || sendPointsMutation.isPending}
                onClick={() => {
                  let amount = parseInt(pointsAmount) || 0;
                  if (pointsOperation === "remove") amount = -amount;
                  sendPointsMutation.mutate({ 
                    userId: selectedUserForPoints.$id, 
                    pointsToAdd: amount,
                    currentPoints: selectedUserForPoints.points || 0
                  });
                }}
              >
                בצע עדכון
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Catch Modal */}
      {editCatchModalOpen && selectedCatchToEdit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl w-full max-w-sm shadow-xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setEditCatchModalOpen(false)}
              className="absolute top-4 end-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-3">
                <Pencil className="w-8 h-8 text-blue-500" />
              </div>
              <h2 className="text-xl font-bold text-center">עריכת תפיסה</h2>
              <p className="text-sm text-center text-muted-foreground mt-1">
                {selectedCatchToEdit.user_name}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  סוג הדג
                </label>
                <Input 
                  value={editFishType}
                  onChange={e => setEditFishType(e.target.value)}
                  className="h-10 font-bold"
                />
              </div>
              
              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  משקל
                </label>
                <Input 
                  value={editWeight}
                  onChange={e => setEditWeight(e.target.value)}
                  className="h-10"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  מיקום
                </label>
                <Input 
                  value={editLocation}
                  onChange={e => setEditLocation(e.target.value)}
                  className="h-10"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  קישור למפה (אופציונלי)
                </label>
                <Input 
                  value={editMapUrl}
                  onChange={e => setEditMapUrl(e.target.value)}
                  className="h-10 text-left dir-ltr"
                  placeholder="https://maps.app.goo.gl/..."
                />
              </div>

              <Button 
                className="w-full h-12 text-lg font-bold mt-4" 
                disabled={editCatchMutation.isPending || !editFishType || !editLocation}
                onClick={() => {
                  editCatchMutation.mutate({ 
                    id: selectedCatchToEdit.$id, 
                    data: {
                      fish_type: editFishType,
                      weight: editWeight,
                      location: editMapUrl.trim() ? `${editLocation.trim()} ||| ${editMapUrl.trim()}` : editLocation.trim()
                    }
                  });
                }}
              >
                שמור שינויים
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
