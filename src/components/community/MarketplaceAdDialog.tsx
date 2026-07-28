import React, { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, storage, APPWRITE_DB_ID, APPWRITE_ADS_ID, APPWRITE_CATCH_IMAGES_BUCKET_ID } from "@/lib/appwrite";
import { ID } from "appwrite";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus } from "lucide-react";

export function MarketplaceAdDialog({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    if (!newOpen) {
      setTitle("");
      setPrice("");
      setDescription("");
      setPhone("");
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

  const createAdMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("חובה להתחבר כדי לפרסם");
      if (!title || !price || !phone) throw new Error("חובה למלא כותרת, מחיר וטלפון");
      
      let imageUrl = "";
      if (imageFile) {
        const uploadedFile = await storage.createFile(
          APPWRITE_CATCH_IMAGES_BUCKET_ID,
          ID.unique(),
          imageFile
        );
        imageUrl = uploadedFile.$id;
      }

      await databases.createDocument(APPWRITE_DB_ID, APPWRITE_ADS_ID, ID.unique(), {
        user_id: user.$id,
        user_name: user.name,
        title,
        price,
        description,
        phone,
        image_url: imageUrl,
        status: 'pending' // Admin needs to approve
      });
    },
    onSuccess: () => {
      toast({ title: "מודעה נשלחה לאישור", description: "המודעה תפורסם לאחר אישור מנהל." });
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["marketplace-ads"] });
    },
    onError: (error: any) => {
      toast({ title: "שגיאה", description: error.message, variant: "destructive" });
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto w-[95vw] rounded-3xl p-6">
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">פרסם מודעה חדשה</h2>
            <p className="text-sm text-muted-foreground mt-1">מכירת ציוד דייג יד שנייה</p>
          </div>

          <div className="flex justify-center">
            <div 
              className="w-32 h-32 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors relative overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <>
                  <ImagePlus className="w-8 h-8 text-slate-400" />
                  <span className="text-xs text-slate-500 font-medium text-center">הוסף תמונה<br/>(רשות)</span>
                </>
              )}
            </div>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>כותרת המודעה</Label>
              <Input 
                placeholder="לדוגמה: חכת ז'רז'ור שימנו" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            <div className="flex gap-4">
              <div className="space-y-2 flex-1">
                <Label>מחיר (₪)</Label>
                <Input 
                  type="number"
                  placeholder="350" 
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label>מספר טלפון</Label>
                <Input 
                  type="tel"
                  placeholder="050-1234567" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>תיאור</Label>
              <Textarea 
                placeholder="פרט על מצב הציוד, סיבת המכירה וכו'..." 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none h-24"
              />
            </div>
          </div>

          <Button 
            className="w-full h-12 text-base font-bold rounded-2xl" 
            onClick={() => createAdMutation.mutate()}
            disabled={!title.trim() || !price.trim() || !phone.trim() || createAdMutation.isPending}
          >
            {createAdMutation.isPending ? "שולח..." : "פרסם מודעה"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
