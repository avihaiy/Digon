import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Paperclip, FileText, CheckCircle2, Download } from "lucide-react";

interface WhatsAppAttachGuideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName?: string;
  fileName?: string;
  platform: "ios" | "android" | "desktop";
}

export function WhatsAppAttachGuide({
  open,
  onOpenChange,
  memberName,
  fileName,
  platform,
}: WhatsAppAttachGuideProps) {
  const fileLocationLabel =
    platform === "ios"
      ? 'אפליקציית "קבצים" (Files) → תיקיית הורדות'
      : platform === "android"
      ? 'אפליקציית "קבצים" / Downloads'
      : "תיקיית ההורדות שלך";

  const attachLabel = platform === "ios" ? "אטב 📎 או '+'" : "אטב 📎";

  const steps = [
    {
      icon: CheckCircle2,
      title: "הצ׳אט נפתח",
      desc: memberName ? `הצ׳אט עם ${memberName} נפתח בוואטסאפ.` : "הצ׳אט עם החבר נפתח בוואטסאפ.",
    },
    {
      icon: Download,
      title: "הקבלה ירדה למכשיר",
      desc: `הקובץ${fileName ? ` "${fileName}"` : ""} נשמר ב${fileLocationLabel}.`,
    },
    {
      icon: Paperclip,
      title: `לחץ על ${attachLabel}`,
      desc: "בתחתית מסך הצ׳אט בוואטסאפ — בחר 'מסמך' או 'תמונה וסרטון'.",
    },
    {
      icon: FileText,
      title: "בחר את הקבלה",
      desc: "היא תופיע ראשונה ברשימה (הקובץ האחרון שירד). לחיצה אחת — והקבלה מצורפת.",
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">איך לצרף את הקבלה בוואטסאפ?</DialogTitle>
          <DialogDescription className="text-right">
            הטקסט כבר מוכן בצ׳אט. נשאר רק לצרף את הקובץ — בלחיצה אחת.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-3 mt-2">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <li key={idx} className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  {idx + 1}
                </div>
                <div className="flex-1 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="font-semibold text-foreground">{step.title}</span>
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{step.desc}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground text-right mt-2">
          💡 וואטסאפ אינו מאפשר לאפליקציות חיצוניות לצרף קבצים אוטומטית — זו הגנה של המערכת.
          ההורדה האוטומטית מבטיחה שהקובץ יהיה ראשון ברשימה לצירוף מהיר.
        </div>

        <Button onClick={() => onOpenChange(false)} className="w-full mt-2">
          הבנתי, סגור
        </Button>
      </DialogContent>
    </Dialog>
  );
}
