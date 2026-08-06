import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_CATCHES_ID } from "@/lib/appwrite";
import { Query } from "appwrite";
import { getImageUrl } from "@/hooks/useCatches";
import { useAuth } from "@/hooks/useAuth";
import { Fish, MapPin, Calendar, Scale, Lock, BookOpen, WifiOff, RefreshCw } from "lucide-react";
import { getPendingCatches, syncOfflineCatches, PendingCatch } from "@/lib/offlineSync";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export default function Logbook() {
  const { user } = useAuth();
  const [selectedCatch, setSelectedCatch] = useState<any>(null);

  // Fetch User's Personal Catches
  const { data: catches = [], isLoading } = useQuery({
    queryKey: ["logbook", user?.$id],
    queryFn: async () => {
      if (!user) return [];
      const res = await databases.listDocuments(APPWRITE_DB_ID, APPWRITE_CATCHES_ID, [
        Query.equal("user_id", user.$id),
        Query.orderDesc("$createdAt")
      ]);
      return res.documents;
    },
    enabled: !!user
  });

  // Offline Catches State
  const [offlineCatches, setOfflineCatches] = useState<PendingCatch[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    getPendingCatches().then(setOfflineCatches);
    
    // Auto sync when online
    const handleOnline = async () => {
      if (offlineCatches.length > 0) {
        handleSync();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [offlineCatches.length]);

  const handleSync = async () => {
    setIsSyncing(true);
    const res = await syncOfflineCatches();
    setIsSyncing(false);
    
    if (res.success) {
      toast({ title: "סונכרן בהצלחה", description: res.message });
      getPendingCatches().then(setOfflineCatches);
      // Refresh online catches
      window.location.reload(); 
    } else {
      toast({ title: "שגיאת סנכרון", description: res.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Statistics
  const totalCatches = catches.length;
  const privateCatches = catches.filter(c => c.status === 'private').length;
  const publicCatches = totalCatches - privateCatches;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-lg mx-auto">
      
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden mt-2">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black mb-1 flex items-center gap-2">
              <BookOpen className="w-8 h-8" />
              יומן אישי
            </h1>
            <p className="text-indigo-100 text-sm font-medium">המקום הפרטי שלך לתעד את כל התפיסות</p>
          </div>
        </div>
      </div>

      {/* Offline Sync Banner */}
      {offlineCatches.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3 text-orange-800 dark:text-orange-200">
            <div className="bg-orange-100 dark:bg-orange-900 p-2 rounded-full">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">יש לך {offlineCatches.length} תפיסות שממתינות לסנכרון</p>
              <p className="text-xs opacity-80">נשמרו באופליין ויעלו לשרת כשתהיה קליטה</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-orange-200 text-orange-700 hover:bg-orange-100"
            onClick={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : "סנכרן"}
          </Button>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-border shadow-sm flex flex-col items-center justify-center text-center">
          <Fish className="w-6 h-6 text-cyan-500 mb-2" />
          <span className="text-2xl font-black text-foreground">{totalCatches}</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase">סה״כ תפיסות</span>
        </div>
        <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-border shadow-sm flex flex-col items-center justify-center text-center">
          <Lock className="w-6 h-6 text-purple-500 mb-2" />
          <span className="text-2xl font-black text-foreground">{privateCatches}</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase">יומן פרטי</span>
        </div>
        <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-border shadow-sm flex flex-col items-center justify-center text-center">
          <MapPin className="w-6 h-6 text-green-500 mb-2" />
          <span className="text-2xl font-black text-foreground">{publicCatches}</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase">בקהילה</span>
        </div>
      </div>

      {/* Catches List */}
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          היסטוריית תפיסות
        </h2>
        
        {catches.length > 0 ? (
          <div className="space-y-4">
            {catches.map((c: any) => (
              <div 
                key={c.$id}
                onClick={() => setSelectedCatch(c)}
                className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex gap-3 p-3 cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
              >
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-muted shrink-0 relative">
                  {c.image_id ? (
                    <img src={getImageUrl(c.image_id)} alt={c.fish_type} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Fish className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                  {c.status === 'private' && (
                    <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-md p-1 rounded-md text-white">
                      <Lock className="w-3 h-3" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-base text-foreground truncate">{c.fish_type || 'לא ידוע'}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1 truncate">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{c.location?.split('|||')[0].trim() || 'מיקום לא צוין'}</span>
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full" dir="ltr">
                      {new Date(c.$createdAt).toLocaleDateString('he-IL')}
                    </span>
                    {c.weight && (
                      <span className="text-xs font-bold text-primary flex items-center gap-1">
                        <Scale className="w-3 h-3" /> {c.weight}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center">
            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">היומן שלך ריק!</h3>
            <p className="text-sm text-muted-foreground max-w-[250px]">
              זה הזמן לצאת לים ולהוסיף את התפיסה הראשונה שלך ליומן הסודי.
            </p>
          </div>
        )}
      </div>

      {/* Catch Details Modal */}
      <Dialog open={!!selectedCatch} onOpenChange={(open) => !open && setSelectedCatch(null)}>
        <DialogContent className="max-w-md w-[90vw] p-0 overflow-hidden rounded-3xl gap-0 border-0 bg-transparent shadow-2xl">
          {selectedCatch && (
            <div className="bg-white dark:bg-slate-900 flex flex-col max-h-[85vh]">
              {selectedCatch.image_id && (
                <div className="relative w-full aspect-square bg-black">
                  <img 
                    src={getImageUrl(selectedCatch.image_id)} 
                    alt={selectedCatch.fish_type} 
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                  
                  {selectedCatch.status === 'private' && (
                    <div className="absolute top-4 left-4 bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                      <Lock className="w-3.5 h-3.5" /> תפיסה פרטית
                    </div>
                  )}

                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                    <div>
                      <h3 className="text-2xl font-black text-white shadow-sm drop-shadow-md">{selectedCatch.fish_type || 'דג לא ידוע'}</h3>
                      <p className="text-white/90 text-sm font-medium flex items-center gap-1 drop-shadow-md">
                        <MapPin className="w-4 h-4" /> 
                        {selectedCatch.location?.split('|||')[0].trim() || 'מיקום לא צוין'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="p-5 flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
                    <Scale className="w-5 h-5 text-emerald-500 mb-1" />
                    <span className="text-xs text-muted-foreground font-medium">משקל</span>
                    <span className="font-bold text-slate-900 dark:text-white mt-0.5">{selectedCatch.weight || 'לא הוזן'}</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-3 flex flex-col items-center justify-center text-center">
                    <Calendar className="w-5 h-5 text-blue-500 mb-1" />
                    <span className="text-xs text-muted-foreground font-medium">תאריך</span>
                    <span className="font-bold text-slate-900 dark:text-white mt-0.5" dir="ltr">
                      {new Date(selectedCatch.$createdAt).toLocaleDateString('he-IL')}
                    </span>
                  </div>
                </div>
                
                {selectedCatch.text && (
                  <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 mt-2">
                    <h4 className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">תיאור החוויה</h4>
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{selectedCatch.text}</p>
                  </div>
                )}
                
                {selectedCatch.location?.includes('|||') && (
                  <Button 
                    className="w-full mt-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl h-12 font-bold"
                    onClick={() => window.open(selectedCatch.location.split('|||')[1].trim(), '_blank')}
                  >
                    <MapPin className="w-4 h-4 ml-2" /> פתח מיקום במפה
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
