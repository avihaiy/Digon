import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, storage, APPWRITE_CATCHES_ID, APPWRITE_CATCH_IMAGES_BUCKET_ID, APPWRITE_PROFILES_ID } from "@/lib/appwrite";
import { ID, Query } from "appwrite";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, MapPin, LayoutList, Trash2, Check, X, Camera } from "lucide-react";

// The Database and Collection IDs should ideally come from env, but we hardcode for this migration script
const DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const PROFILES_ID = import.meta.env.VITE_APPWRITE_PROFILES_COLLECTION_ID;
const ADS_ID = "ads";
const LOCATIONS_ID = "locations";

export default function Admin() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("users");
  const [newLocationName, setNewLocationName] = useState("");


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
      toast.success("המיקום נמחק");
      queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
    },
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
  });

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
                          <Button size="sm" variant="outline" className="text-green-600" onClick={() => updateAdStatusMutation.mutate({ id: ad.$id, status: 'approved' })}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600" onClick={() => updateAdStatusMutation.mutate({ id: ad.$id, status: 'rejected' })}>
                            <X className="w-4 h-4" />
                          </Button>
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
                      <TableHead>שם המיקום</TableHead>
                      <TableHead>פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locationsData?.map((loc: any) => (
                      <TableRow key={loc.$id}>
                        <TableCell>{loc.name}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="destructive" onClick={() => deleteLocationMutation.mutate(loc.$id)}>
                            <Trash2 className="w-4 h-4" /> מחק
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
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
    </div>
  );
}
