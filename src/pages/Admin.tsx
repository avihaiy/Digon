import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, storage, APPWRITE_CATCHES_ID, APPWRITE_CATCH_IMAGES_BUCKET_ID, APPWRITE_PROFILES_ID, APPWRITE_LOCATIONS_ID, APPWRITE_STORE_ITEMS_ID } from "@/lib/appwrite";
import { ID, Query } from "appwrite";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, MapPin, LayoutList, Trash2, Check, X, Camera, Ticket, Store as StoreIcon } from "lucide-react";

// The Database and Collection IDs should ideally come from env, but we hardcode for this migration script
const DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const PROFILES_ID = import.meta.env.VITE_APPWRITE_PROFILES_COLLECTION_ID;
const ADS_ID = "ads";
const LOCATIONS_ID = APPWRITE_LOCATIONS_ID;

export default function Admin() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("users");
  const [newLocationName, setNewLocationName] = useState("");
  const [newStoreItem, setNewStoreItem] = useState({ name: "", description: "", cost: "", type: "title", value: "" });


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

  // Approve Catch Mutation
  const approveCatchMutation = useMutation({
    mutationFn: async ({ catchId, userId }: { catchId: string, userId: string }) => {
      // 1. Update status to approved
      await databases.updateDocument(DB_ID, APPWRITE_CATCHES_ID, catchId, {
        status: 'approved'
      });

      // 2. Give 10 points to the user
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
    onSuccess: () => {
      toast.success("התפיסה אושרה בהצלחה והדייג קיבל 10 מטבעות! 🎉");
      queryClient.invalidateQueries({ queryKey: ["admin-catches"] });
      queryClient.invalidateQueries({ queryKey: ["catches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-data"] });
    },
    onError: () => toast.error("שגיאה באישור התפיסה"),
  });

  // Update Ad Status Mutation
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
      await databases.createDocument(DB_ID, APPWRITE_STORE_ITEMS_ID, ID.unique(), {
        name: data.name,
        description: data.description,
        cost: parseInt(data.cost),
        type: data.type,
        value: data.value,
        is_active: true
      });
    },
    onSuccess: () => {
      toast.success("הפריט נוסף לחנות בהצלחה!");
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

      <div className="flex space-x-4 space-x-reverse mb-8 overflow-x-auto pb-2">
        <Button 
          variant={activeTab === "users" ? "default" : "outline"} 
          onClick={() => setActiveTab("users")}
          className="flex gap-2 items-center"
        >
          <Users className="w-4 h-4" /> דייגים
        </Button>
        <Button 
          variant={activeTab === "ads" ? "default" : "outline"} 
          onClick={() => setActiveTab("ads")}
          className="flex gap-2 items-center"
        >
          <LayoutList className="w-4 h-4" /> מודעות
        </Button>
        <Button 
          variant={activeTab === "locations" ? "default" : "outline"} 
          onClick={() => setActiveTab("locations")}
          className="flex gap-2 items-center"
        >
          <MapPin className="w-4 h-4" /> מיקומי דייג
        </Button>
        <Button 
          variant={activeTab === "catches" ? "default" : "outline"} 
          onClick={() => setActiveTab("catches")}
          className="flex gap-2 items-center"
        >
          <Camera className="w-4 h-4" /> תפיסות
        </Button>
        <Button 
          variant={activeTab === "raffles" ? "default" : "outline"} 
          onClick={() => setActiveTab("raffles")}
          className="flex gap-2 items-center bg-rose-500/10 text-rose-600 border-rose-200 hover:bg-rose-500 hover:text-white"
        >
          <Ticket className="w-4 h-4" /> ניהול הגרלות
        </Button>
        <Button 
          variant={activeTab === "store" ? "default" : "outline"} 
          onClick={() => setActiveTab("store")}
          className="flex gap-2 items-center bg-yellow-500/10 text-yellow-600 border-yellow-200 hover:bg-yellow-500 hover:text-white"
        >
          <StoreIcon className="w-4 h-4" /> ניהול חנות
        </Button>
      </div>

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
                      <TableHead>מספר טלפון</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersData?.map((u: any) => (
                      <TableRow key={u.$id}>
                        <TableCell>{u.full_name || 'ללא שם'}</TableCell>
                        <TableCell>{u.role === 'ADMIN' ? 'מנהל' : 'משתמש רגיל'}</TableCell>
                        <TableCell>{u.phone_number || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {(!usersData || usersData.length === 0) && (
                      <TableRow><TableCell colSpan={3} className="text-center">אין משתמשים</TableCell></TableRow>
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
                        <TableCell>{catchItem.fish_type} {catchItem.weight ? `(${catchItem.weight})` : ""}</TableCell>
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
                                approveCatchMutation.mutate({ catchId: catchItem.$id, userId: catchItem.user_id });
                              }}
                              disabled={approveCatchMutation.isPending}
                            >
                              <Check className="w-4 h-4" /> אשר
                            </Button>
                          )}
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
              <h3 className="font-bold mb-4">הוספת חבילה חדשה</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Input placeholder="שם החבילה (למשל: תואר מלך)" value={newStoreItem.name} onChange={e => setNewStoreItem({...newStoreItem, name: e.target.value})} />
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
                  <option value="feature">פיצ'ר מיוחד</option>
                </select>
                <Input placeholder="ערך פנימי (למשל: gold או 1)" value={newStoreItem.value} onChange={e => setNewStoreItem({...newStoreItem, value: e.target.value})} />
              </div>
              <Button 
                className="mt-4 bg-yellow-500 hover:bg-yellow-600 w-full md:w-auto"
                disabled={!newStoreItem.name || !newStoreItem.cost || !newStoreItem.value || addStoreItemMutation.isPending}
                onClick={() => {
                  addStoreItemMutation.mutate(newStoreItem);
                  setNewStoreItem({ name: "", description: "", cost: "", type: "title", value: "" });
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
                  {storeItemsData?.map((item: any) => (
                    <TableRow key={item.$id} className={item.is_active ? '' : 'opacity-50'}>
                      <TableCell>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">{item.description}</div>
                      </TableCell>
                      <TableCell className="font-bold text-yellow-600">{item.cost} נק'</TableCell>
                      <TableCell>{item.type}</TableCell>
                      <TableCell>
                        <Button 
                          variant={item.is_active ? "default" : "outline"}
                          size="sm"
                          className={item.is_active ? "bg-green-500 hover:bg-green-600" : ""}
                          onClick={() => toggleStoreItemMutation.mutate({ id: item.$id, isActive: !item.is_active })}
                        >
                          {item.is_active ? "פעיל - מוצג" : "כבוי - מוסתר"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!storeItemsData || storeItemsData.length === 0) && (
                    <TableRow><TableCell colSpan={4} className="text-center">אין חבילות בחנות</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
