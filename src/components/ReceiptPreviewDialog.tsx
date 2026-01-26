import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { formatCurrency, formatDate, getHebrewDate } from '@/lib/hebrew-utils';

interface ReceiptPreviewDialogProps {
  receipt: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrint: (receipt: any) => void;
}

export function ReceiptPreviewDialog({
  receipt,
  open,
  onOpenChange,
  onPrint,
}: ReceiptPreviewDialogProps) {
  if (!receipt) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-center">תצוגה מקדימה</DialogTitle>
        </DialogHeader>
        
        {/* Receipt Preview - styled like thermal receipt */}
        <div className="bg-white mx-4 mb-4 rounded-lg border shadow-inner">
          <div 
            className="p-4 text-black"
            style={{ 
              fontFamily: "'Heebo', Arial, sans-serif",
              fontSize: '12px',
              lineHeight: '1.4',
            }}
          >
            {/* Header with בס"ד */}
            <div className="text-left text-xs font-bold mb-2">בס"ד</div>
            
            {/* Synagogue Name and Address */}
            <div className="text-center mb-3">
              <div className="text-base font-bold">בית כנסת "ברית שלום" עכו</div>
              <div className="text-xs text-gray-600 mt-1">רח' קדושי קהיר 16, עכו</div>
            </div>

            {/* Dates */}
            <div className="flex justify-center gap-3 text-xs text-gray-700 mb-3">
              <span>{formatDate(receipt.created_at)}</span>
              <span>•</span>
              <span>{getHebrewDate(new Date(receipt.created_at))}</span>
            </div>

            {/* Separator */}
            <div className="border-t border-dashed border-gray-400 my-3" />

            {/* Details */}
            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-xs">
                <span className="font-medium">התקבל מאת:</span>
                <span>{receipt.member?.full_name || '-'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-medium">עבור:</span>
                <span>{receipt.description || 'תרומה'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-medium">אמצעי תשלום:</span>
                <span>{receipt.payment?.method === 'bit' ? 'ביט' : 'מזומן'}</span>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-dashed border-gray-400 my-3" />

            {/* Total */}
            <div className="text-center py-3">
              <div className="text-xs mb-1">סה״כ שולם</div>
              <div className="text-2xl font-bold">
                {formatCurrency(Number(receipt.total_amount))}
              </div>
            </div>

            {/* Separator */}
            <div className="border-t border-dashed border-gray-400 my-3" />

            {/* Print Button */}
            <div className="flex justify-center mb-3">
              <Button
                size="sm"
                onClick={() => {
                  onPrint(receipt);
                  onOpenChange(false);
                }}
                className="px-6"
              >
                <Printer className="w-4 h-4 ml-2" />
                הדפס קבלה
              </Button>
            </div>

            {/* Separator */}
            <div className="border-t border-dashed border-gray-400 my-3" />

            {/* Footer */}
            <div className="text-center">
              <p className="text-sm font-bold mb-2">תודה על תרומתכם!</p>
              <p className="text-xs font-medium">בית כנסת "ברית שלום" עכו</p>
              <p className="text-xs text-gray-600">רח' קדושי קהיר 16 עכו</p>
              <p className="text-xs text-gray-600">טלפון: 050-5768723</p>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="p-4 pt-0 flex justify-center">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-4 h-4 ml-2" />
            סגור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
