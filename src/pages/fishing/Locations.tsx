import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { databases, storage, APPWRITE_DB_ID, APPWRITE_LOCATIONS_ID, APPWRITE_CATCH_IMAGES_BUCKET_ID } from "@/lib/appwrite";
import { Query } from "appwrite";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Navigation2, Map as MapIcon, Star } from "lucide-react";
import { LocationReportDialog } from "@/components/locations/LocationReportDialog";

export default function Locations() {
  const { user } = useAuth();

  const { data: locations, isLoading } = useQuery({
    queryKey: ["fishing-locations"],
    queryFn: async () => {
      try {
        const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_LOCATIONS_ID, [
          Query.orderDesc("$createdAt"),
          Query.limit(50)
        ]);
        // Show approved or legacy locations
        return res.documents.filter((doc: any) => doc.status === 'approved' || !doc.status);
      } catch (e) {
        return [];
      }
    },
  });

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            מיקומי דייג
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            גלה ספוטים שווים באזור שלך
          </p>
        </div>
        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
          <MapIcon className="w-6 h-6 text-primary" />
        </div>
      </div>

      {/* Action Button */}
      <section>
        <LocationReportDialog>
          <Button size="lg" variant="outline" className="w-full h-16 text-lg rounded-2xl shadow-sm gap-3 group bg-background border-primary/20 hover:bg-primary/5">
            <Plus className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
            דווח על מיקום חדש
          </Button>
        </LocationReportDialog>
      </section>

      {/* Locations List */}
      <section className="pt-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold tracking-tight">ספוטים מומלצים</h2>
        </div>
        
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : locations?.length === 0 ? (
            <div className="text-center p-8 bg-muted/20 rounded-xl border border-dashed">
              <p className="text-sm text-muted-foreground">עדיין אין ספוטים במערכת.</p>
              <p className="text-xs text-muted-foreground mt-1">תהיה הראשון לדווח!</p>
            </div>
          ) : (
            locations?.map((loc: any) => {
              const previewUrl = loc.image_url 
                ? storage.getFilePreview(APPWRITE_CATCH_IMAGES_BUCKET_ID, loc.image_url).href 
                : null;
              
              const methodsArray = loc.fishing_methods 
                ? loc.fishing_methods.split(",").map((m: string) => m.trim()).filter(Boolean)
                : [];
                
              return (
                <Card key={loc.$id} className="overflow-hidden border-border/50 shadow-sm relative group">
                  <div className="flex flex-col p-4">
                    {/* Top Section: Name and Navigate */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                          {loc.name}
                        </h3>
                        <div className="flex items-center gap-1 text-yellow-500 text-xs font-bold mt-1">
                          <Star className="w-3.5 h-3.5 fill-yellow-500" />
                          5.0 <span className="text-muted-foreground ml-1 font-normal">(קהילה)</span>
                        </div>
                      </div>
                      
                      {loc.map_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary bg-primary/10 hover:bg-primary/20 rounded-full shrink-0"
                          onClick={() => window.open(loc.map_url, '_blank')}
                        >
                          <Navigation2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="flex gap-4">
                      {/* Left: Info */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div className="space-y-3">
                          {methodsArray.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {methodsArray.map((method: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-[10px] font-normal bg-muted">
                                  {method}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {!methodsArray.length && (
                            <p className="text-xs text-muted-foreground">
                              לא צויינו שיטות דייג
                            </p>
                          )}
                        </div>
                        <div className="mt-4 flex items-center text-[10px] text-muted-foreground">
                          <MapPin className="w-3 h-3 ml-1" />
                          מיקום מאושר
                        </div>
                      </div>
                      
                      {/* Right: Image */}
                      {previewUrl ? (
                        <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 border border-border/50">
                          <img src={previewUrl} alt={loc.name} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-xl shrink-0 border border-border/50 bg-muted flex items-center justify-center text-muted-foreground">
                          <MapIcon className="w-6 h-6 opacity-50" />
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
