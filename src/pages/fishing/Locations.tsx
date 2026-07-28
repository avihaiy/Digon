import FishingLayout from "@/components/fishing/FishingLayout";
import { motion } from "framer-motion";
import { MapPin, Navigation2, Star, Users, Plus } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_LOCATIONS_ID } from "@/lib/appwrite";
import { ID, Query } from "appwrite";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Locations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");

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

  const reportLocationMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("חובה להתחבר כדי לדווח");
      await databases.createDocument(APPWRITE_DB_ID, APPWRITE_LOCATIONS_ID, ID.unique(), {
        name,
        user_id: user.$id,
        status: 'pending'
      });
    },
    onSuccess: () => {
      toast({
        title: "המיקום נשלח לאישור! 🎉",
        description: "ברגע שיאושר על ידי מנהל, תזכה ב-10 מטבעות והמיקום יתווסף למפה.",
      });
      setIsOpen(false);
      setNewLocationName("");
      queryClient.invalidateQueries({ queryKey: ["fishing-locations"] });
      queryClient.invalidateQueries({ queryKey: ["admin-locations"] });
    },
    onError: (err: any) => {
      toast({
        title: "שגיאה",
        description: err.message || "לא הצלחנו לשלוח את המיקום",
        variant: "destructive"
      });
    }
  });

  return (
    <FishingLayout>
      <div className="px-4 pt-6 pb-20">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-black text-white text-start">מיקומי דייג</h1>
            <p className="text-cyan-400 text-sm mt-1">גלה את הספוטים החמים באזורך</p>
          </div>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-full flex gap-2 shadow-lg shadow-cyan-500/30">
                <Plus className="w-4 h-4" /> דיווח מיקום
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white" dir="rtl">
              <DialogHeader>
                <DialogTitle className="text-xl">דיווח על ספוט חדש 🎣</DialogTitle>
                <DialogDescription className="text-slate-400">
                  שתף מיקום דייג חדש עם הקהילה. לאחר אישור מנהל, תזכה ב-10 מטבעות!
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">שם המיקום</Label>
                  <Input 
                    id="name" 
                    placeholder="לדוגמה: שובר גלים תל ברוך" 
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    className="bg-slate-800 border-slate-700"
                  />
                </div>
                <Button 
                  className="w-full bg-cyan-500 hover:bg-cyan-600" 
                  onClick={() => reportLocationMutation.mutate(newLocationName)}
                  disabled={!newLocationName.trim() || reportLocationMutation.isPending}
                >
                  {reportLocationMutation.isPending ? "שולח..." : "שלח לאישור מנהל"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
            <h3 className="font-bold text-white">מיקומים מאושרים</h3>
          </div>
          
          {isLoading ? (
            <div className="text-center text-slate-400 py-8">טוען מיקומים...</div>
          ) : locations?.length === 0 ? (
             <div className="text-center text-slate-400 py-8">עדיין אין מיקומים מאושרים במערכת</div>
          ) : (
            locations?.map((loc: any, i: number) => (
              <motion.div 
                key={loc.$id || i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/5 backdrop-blur-md rounded-[1.5rem] p-3 border border-white/5 flex gap-4 items-center cursor-pointer hover:bg-white/10 transition-colors"
              >
                <div className="w-16 h-16 rounded-2xl bg-cyan-900/50 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  <MapPin className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white text-lg leading-tight">{loc.name}</h4>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1 text-yellow-400 text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-yellow-400" />
                      5.0
                    </div>
                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 text-emerald-400 bg-emerald-400/10`}>
                      פעיל
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </FishingLayout>
  );
}
