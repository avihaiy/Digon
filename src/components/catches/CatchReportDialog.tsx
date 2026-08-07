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
import { useTournaments } from "@/hooks/useTournaments";
import { Switch } from "@/components/ui/switch";
import { compressImage } from "@/lib/imageCompression";

interface CatchReportDialogProps {
  children: React.ReactNode;
}

export function CatchReportDialog({ children }: CatchReportDialogProps) {
  const { user, profileData } = useAuth();
  const navigate = useNavigate();
  const { reportCatch, isReporting } = useCatches();
  const [open, setOpen] = useState(false);
  
  const [fishType, setFishType] = useState("");
  const [weight, setWeight] = useState("");
  const [location, setLocation] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<string>("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [useFlare, setUseFlare] = useState(false);
  const { activeTournaments } = useTournaments();

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
      setSelectedTournament("");
      setMapUrl("");
      setIsPrivate(false);
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
      const compressed = await compressImage(imageFile, { maxWidth: 1920, quality: 0.85 });
      await reportCatch({
        fishType,
        weight,
        location: mapUrl.trim() ? `${location} ||| ${mapUrl.trim()}` : location,
        imageFile: compressed,
        tournamentId: selectedTournament || undefined,
        imageBase64: imagePreview || undefined,
        isPrivate,
        isFlared: useFlare
      });
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
          
          <div className="space-y-2">
            <Label htmlFor="mapUrl">קישור מפה מדויק (אופציונלי)</Label>
            <Input 
              id="mapUrl" 
              placeholder="Google Maps / Waze קישור" 
              value={mapUrl}
              onChange={(e) => setMapUrl(e.target.value)}
              className="text-left dir-ltr"
            />
          </div>

          {activeTournaments.filter(t => user && t.participants?.includes(user.$id)).length > 0 && (
            <div className="space-y-2 border border-yellow-500/30 bg-yellow-500/10 p-3 rounded-xl mt-4">
              <Label htmlFor="tournament" className="text-yellow-400 font-bold flex items-center gap-1">
                <span>🏆</span> שיוך לתחרות (אופציונלי)
              </Label>
              <select
                id="tournament"
                value={selectedTournament}
                onChange={(e) => setSelectedTournament(e.target.value)}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
              >
                <option value="">-- ללא תחרות --</option>
                {activeTournaments.filter(t => user && t.participants?.includes(user.$id)).map(t => (
                  <option key={t.$id} value={t.$id}>{t.title}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-between border border-border bg-slate-50 dark:bg-white/5 p-3 rounded-xl mt-4">
            <div className="space-y-0.5">
              <Label className="text-base font-bold flex items-center gap-2">
                יומן אישי (פרטי) 🔒
              </Label>
              <p className="text-xs text-muted-foreground">
                שמור את התפיסה רק ביומן האישי שלך. המיקום והתמונה לא יפורסמו בקהילה.
              </p>
            </div>
            <Switch 
              checked={isPrivate} 
              onCheckedChange={setIsPrivate} 
            />
          </div>

          {!isPrivate && (profileData?.flare || 0) > 0 && (
            <div className="flex items-center justify-between border border-yellow-500/30 bg-yellow-500/5 p-3 rounded-xl mt-4">
              <div className="space-y-0.5">
                <Label className="text-base font-bold text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                  השתמש בהדגשת פוסט ✨
                </Label>
                <p className="text-xs text-muted-foreground">
                  יש לך {profileData?.flare} הדגשות. הפוסט יזהר בפיד החברתי!
                </p>
              </div>
              <Switch 
                checked={useFlare} 
                onCheckedChange={setUseFlare} 
              />
            </div>
          )}

          <DialogFooter className="mt-6 sm:justify-start">
            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl text-md" 
              disabled={isReporting || !imageFile || !fishType || !location}
            >
              {isReporting ? "שולח דיווח..." : (isPrivate ? "שמור ליומן האישי 🔒" : "שתף תפיסה בקהילה (+10 נק׳)")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
