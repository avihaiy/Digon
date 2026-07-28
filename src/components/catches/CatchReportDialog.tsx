import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCatches } from "@/hooks/useCatches";
import { Camera, Image as ImageIcon, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

interface CatchReportDialogProps {
  children: React.ReactNode;
}

export function CatchReportDialog({ children }: CatchReportDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { reportCatch, isReporting } = useCatches();
  const [open, setOpen] = useState(false);
  
  const [fishType, setFishType] = useState("");
  const [weight, setWeight] = useState("");
  const [location, setLocation] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !user) {
      toast({
        title: "התחברות נדרשת",
        description: "כדי לדווח על תפיסה ולהרוויח נקודות, אנא התחבר.",
      });
      navigate("/login");
      return;
    }
    setOpen(newOpen);
    if (!newOpen) {
      // Reset form on close
      setFishType("");
      setWeight("");
      setLocation("");
      setImageFile(null);
      setImagePreview(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) {
      toast({
        title: "חסרה תמונה",
        description: "חובה להעלות תמונה של התפיסה!",
        variant: "destructive",
      });
      return;
    }
    
    if (!fishType || !location) {
      toast({
        title: "שדות חסרים",
        description: "אנא מלא את סוג הדג ומיקום התפיסה.",
        variant: "destructive",
      });
      return;
    }

    try {
      await reportCatch({ fishType, weight, location, imageFile, imageBase64: imagePreview || undefined });
      setOpen(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md w-[95vw] rounded-2xl p-4 md:p-6" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl">דיווח על תפיסה חדשה 🎣</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Image Upload Area */}
          <div className="space-y-2">
            <Label>תמונת התפיסה</Label>
            
            {imagePreview ? (
              <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-border">
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
                  className="h-24 flex flex-col gap-2 rounded-xl border-dashed"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs">פתח מצלמה</span>
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="h-24 flex flex-col gap-2 rounded-xl border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs">בחר מגלריה</span>
                </Button>
                
                {/* Hidden inputs */}
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
            <Label htmlFor="fishType">סוג הדג *</Label>
            <Input 
              id="fishType" 
              placeholder="לדוגמה: לוקוס, דניס, פלמידה..." 
              value={fishType}
              onChange={(e) => setFishType(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">משקל (אופציונלי)</Label>
              <Input 
                id="weight" 
                placeholder="לדוגמה: 1.5 ק״ג" 
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">מיקום *</Label>
              <Input 
                id="location" 
                placeholder="איפה תפסת?" 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="mt-6 sm:justify-start">
            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl text-md" 
              disabled={isReporting || !imageFile || !fishType || !location}
            >
              {isReporting ? "שולח דיווח..." : "שתף תפיסה (+10 נק׳)"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
