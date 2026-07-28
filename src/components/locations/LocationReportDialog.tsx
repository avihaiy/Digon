import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { databases, APPWRITE_DB_ID, APPWRITE_LOCATIONS_ID } from "@/lib/appwrite";
import { ID } from "appwrite";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { MapPin } from "lucide-react";
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

  const reportLocationMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error("חובה להתחבר כדי לדווח");
      await databases.createDocument(APPWRITE_DB_ID, APPWRITE_LOCATIONS_ID, ID.unique(), {
        name,
        user_id: user.$id,
        added_by: user.$id,
        status: 'pending',
        latitude: 31.0,
        longitude: 35.0
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" dir="rtl">
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
            <Label htmlFor="name">שם המיקום</Label>
            <Input 
              id="name" 
              placeholder="לדוגמה: שובר גלים תל ברוך" 
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
            />
          </div>
          <Button 
            className="w-full" 
            onClick={() => reportLocationMutation.mutate(newLocationName)}
            disabled={!newLocationName.trim() || reportLocationMutation.isPending}
          >
            {reportLocationMutation.isPending ? "שולח..." : "שלח לאישור מנהל"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
