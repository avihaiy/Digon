import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, storage, APPWRITE_DB_ID, APPWRITE_LOCATIONS_ID, APPWRITE_CATCH_IMAGES_BUCKET_ID } from "@/lib/appwrite";
import { ID, Query } from "appwrite";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FishingLayout from "@/components/fishing/FishingLayout";
import { MapPin, Plus, Navigation2, Star, ExternalLink, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";
import { LocationReportDialog } from "@/components/locations/LocationReportDialog";

export default function Locations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
    <FishingLayout>
      <div className="px-4 pt-6 pb-20">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-black text-white text-start">מיקומי דייג</h1>
            <p className="text-cyan-400 text-sm mt-1">גלה ספוטים מומלצים על ידי הקהילה</p>
          </div>
          
          <LocationReportDialog>
            <Button className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-full flex gap-2 shadow-lg shadow-cyan-500/30">
              <Plus className="w-4 h-4" /> דיווח מיקום
            </Button>
          </LocationReportDialog>
        </motion.div>

        {/* Map Placeholder */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full h-48 rounded-[2rem] bg-slate-800 relative overflow-hidden mb-8 border border-white/10"
        >
          <img src="/fishing_bg.jpg" alt="Map" className="w-full h-full object-cover opacity-50 blur-sm scale-110" />
          <div className="absolute inset-0 bg-blue-900/40 mix-blend-overlay"></div>
          
          {/* Fake Map Pins */}
          <div className="absolute top-1/4 start-1/3">
            <div className="relative">
              <div className="w-4 h-4 bg-cyan-400 rounded-full animate-ping absolute opacity-75"></div>
              <div className="w-4 h-4 bg-cyan-400 rounded-full relative border-2 border-white shadow-[0_0_10px_cyan]"></div>
            </div>
          </div>
          <div className="absolute bottom-1/3 end-1/4">
            <div className="w-4 h-4 bg-rose-500 rounded-full border-2 border-white shadow-[0_0_10px_red]"></div>
          </div>
          
          <button className="absolute bottom-4 end-4 bg-white/10 backdrop-blur-md p-3 rounded-full border border-white/20 shadow-lg text-white">
            <Navigation2 className="w-5 h-5" />
          </button>
        </motion.div>

        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-white">מיקומים מומלצים</h3>
          </div>
          
          {isLoading ? (
            <div className="text-center text-slate-400 py-8">טוען מיקומים...</div>
          ) : locations?.length === 0 ? (
             <div className="text-center text-slate-400 py-8">עדיין אין מיקומים מומלצים. תהיה הראשון לדווח!</div>
          ) : (
            locations?.map((loc: any, i: number) => {
              const previewUrl = loc.image_url 
                ? storage.getFilePreview(APPWRITE_CATCH_IMAGES_BUCKET_ID, loc.image_url).href 
                : null;
                
              return (
                <motion.div 
                  key={loc.$id || i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/5 backdrop-blur-md rounded-[1.5rem] overflow-hidden border border-white/5 flex flex-col hover:bg-white/10 transition-colors"
                >
                  {previewUrl && (
                    <div className="w-full h-32 relative">
                      <img src={previewUrl} alt={loc.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  
                  <div className="p-4 flex gap-4 items-center">
                    {!previewUrl && (
                      <div className="w-16 h-16 rounded-2xl bg-cyan-900/50 border border-cyan-500/20 flex items-center justify-center shrink-0">
                        <MapPin className="w-6 h-6 text-cyan-400" />
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <h4 className="font-bold text-white text-lg leading-tight">{loc.name}</h4>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold">
                          <Star className="w-3.5 h-3.5 fill-yellow-400" />
                          5.0
                        </div>
                        <div className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 text-emerald-400 bg-emerald-400/10">
                          מאושר
                        </div>
                      </div>
                    </div>

                    {loc.map_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/30 rounded-full"
                        onClick={() => window.open(loc.map_url, '_blank')}
                      >
                        <Navigation2 className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </FishingLayout>
  );
}
