import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, ExternalLink } from 'lucide-react';

interface ExpenseAttachment {
  id: string;
  expense_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number | null;
}

interface ExpenseAttachmentPreviewProps {
  attachment: ExpenseAttachment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ExpenseAttachmentPreview({
  attachment,
  open,
  onOpenChange,
}: ExpenseAttachmentPreviewProps) {
  if (!attachment) return null;

  const isPdf = attachment.file_type === 'application/pdf';
  const isImage = attachment.file_type.startsWith('image/');

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{attachment.file_name}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(attachment.file_url, '_blank')}
              >
                <ExternalLink className="ml-2 h-4 w-4" />
                פתח בחלון חדש
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href={attachment.file_url} download={attachment.file_name}>
                  <Download className="ml-2 h-4 w-4" />
                  הורדה
                </a>
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {isPdf ? (
            <iframe
              src={attachment.file_url}
              className="w-full h-[60vh] rounded-lg border"
              title={attachment.file_name}
            />
          ) : isImage ? (
            <div className="flex justify-center">
              <img
                src={attachment.file_url}
                alt={attachment.file_name}
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
              />
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>לא ניתן להציג תצוגה מקדימה לסוג קובץ זה</p>
              <Button
                variant="link"
                onClick={() => window.open(attachment.file_url, '_blank')}
              >
                לחץ כאן להורדה
              </Button>
            </div>
          )}
        </div>

        {attachment.file_size && (
          <p className="text-sm text-muted-foreground text-center mt-2">
            גודל קובץ: {formatFileSize(attachment.file_size)}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
