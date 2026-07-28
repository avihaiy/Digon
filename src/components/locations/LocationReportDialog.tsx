import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, storage, APPWRITE_DB_ID, APPWRITE_LOCATIONS_ID, APPWRITE_CATCH_IMAGES_BUCKET_ID } from "@/lib/appwrite";
import { ID } from "appwrite";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Camera, Image as ImageIcon, X } from "lucide-react";
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

export function LocationReportDialog({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);

  const AVAILABLE_METHODS = [
    "ז'רז'ור",
    "פתיונות",
    "בוס",
    "בולונז",
    "ג'יג",
    "טרולינג"
  ];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    if (!newOpen) {
      setNewLocationName("");
      setMapUrl("");
      setImageFile(null);
      setImagePreview(null);
      setSelectedMethods([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const reportLocationMutation = useMutation({
    mutationFn: async (data: { name: string, mapUrl: string, imageFile: File | null, fishingMethods: string }) => {
      if (!user) throw new Error("חובה להתחבר כדי לדווח");
      
      let imageId = "";
      let imageUrl = "";
      if (data.imageFile) {
        const file = await storage.createFile(APPWRITE_CATCH_IMAGES_BUCKET_ID, ID.unique(), data.imageFile);
        imageId = file.$id;
        imageUrl = file.$id; // saving just the id in image_url column or creating full url
      }

      await databases.createDocument(APPWRITE_DB_ID, APPWRITE_LOCATIONS_ID, ID.unique(), {
        name: data.name,
        user_id: user.$id,
        added_by: user.$id,
        status: 'pending',
        latitude: 31.0,
        longitude: 35.0,
        map_url: data.mapUrl,
        image_url: imageUrl,
        fishing_methods: data.fishingMethods
      });
    },
    onSuccess: () => {
      toast({
        title: "המיקום נשלח לאישור! 🎉",
        description: "ברגע שיאושר על ידי מנהל, תזכה ב-10 מטבעות והמיקום יתווסף למפה.",
      });
      handleOpenChange(false);
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
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl p-4 md:p-6 h-[90vh] sm:h-auto overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            דיווח על ספוט חדש
          </DialogTitle>
          <DialogDescription>
            שתף מיקום דייג חדש עם הקהילה. לאחר אישור מנהל, תזכה ב-10 מטבעות!
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>תמונת המיקום (אופציונלי)</Label>
            {imagePreview ? (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="h-20 flex flex-col gap-2 rounded-xl border-dashed"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs">מצלמה</span>
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="h-20 flex flex-col gap-2 rounded-xl border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs">גלריה</span>
                </Button>
                
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  ref={cameraInputRef}
                  className="hidden" 
                  onChange={handleFileChange} 
                />
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef}
                  className="hidden" 
                  onChange={handleFileChange} 
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">שם המיקום</Label>
            <Input 
              id="name" 
              placeholder="לדוגמה: שובר גלים תל ברוך" 
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mapUrl">קישור למיקום (Google Maps)</Label>
            <Input 
              id="mapUrl" 
              placeholder="הדבק קישור כאן (אופציונלי)" 
              value={mapUrl}
              onChange={(e) => setMapUrl(e.target.value)}
              className="text-left dir-ltr"
            />
          </div>

          <div className="space-y-2">
            <Label>שיטות דייג מומלצות</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {AVAILABLE_METHODS.map((method) => {
                const isSelected = selectedMethods.includes(method);
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedMethods(prev => prev.filter(m => m !== method));
                      } else {
                        setSelectedMethods(prev => [...prev, method]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                      isSelected 
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' 
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {method}
                  </button>
                );
              })}
            </div>
          </div>

          <Button 
            className="w-full mt-4" 
            onClick={() => reportLocationMutation.mutate({ name: newLocationName, mapUrl, imageFile, fishingMethods: selectedMethods.join(", ") })}
            disabled={!newLocationName.trim() || reportLocationMutation.isPending}
          >
            {reportLocationMutation.isPending ? "שולח..." : "שלח לאישור מנהל"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
