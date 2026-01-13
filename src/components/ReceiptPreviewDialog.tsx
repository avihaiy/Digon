import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/hebrew-utils';

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
            {/* Header */}
            <div className="text-center border-b border-dashed border-gray-400 pb-3 mb-3">
              <div className="text-base font-bold">בית הכנסת</div>
              <div className="text-sm font-bold mt-1">
                קבלה מספר: {receipt.receipt_number}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {formatDate(receipt.created_at)}
              </div>
            </div>

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

            {/* Total */}
            <div className="border-t-2 border-b-2 border-black py-3 my-3 text-center">
              <div className="text-xs mb-1">סה״כ שולם</div>
              <div className="text-xl font-bold">
                {formatCurrency(Number(receipt.total_amount))}
              </div>
            </div>

            {/* Footer */}
            <div className="text-center border-t border-dashed border-gray-400 pt-3">
              <p className="text-xs font-bold mb-1">תודה על תרומתכם!</p>
              <p className="text-[10px] text-gray-600">מערכת ניהול גבאות</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 pt-0 flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-4 h-4 ml-2" />
            סגור
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              onPrint(receipt);
              onOpenChange(false);
            }}
          >
            <Printer className="w-4 h-4 ml-2" />
            הדפס
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
