import { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X, FileDown, Loader2, Wifi, Share2 } from 'lucide-react';
import { formatCurrency, formatDate, getHebrewDate, PAYMENT_METHOD } from '@/lib/hebrew-utils';
import { silentPrintReceipt } from '@/lib/thermal-print';
import { remotePrintReceipt } from '@/lib/remote-print';

import html2pdf from 'html2pdf.js';
import { toast } from 'sonner';

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
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isRemotePrinting, setIsRemotePrinting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  if (!receipt) return null;

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await silentPrintReceipt(receipt);
      toast.success('הקבלה נשלחה להדפסה');
    } catch (error) {
      console.error('Print error:', error);
      toast.error('שגיאה בהדפסה');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSavePdf = async () => {
    if (!receiptRef.current) return;
    
    setIsSavingPdf(true);
    try {
      const element = receiptRef.current;
      const opt = {
        margin: 0,
        filename: `קבלה-${receipt.receipt_number}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          letterRendering: true,
        },
        jsPDF: { 
          unit: 'mm', 
          format: [80, 120], 
          orientation: 'portrait' as const
        }
      };

      await html2pdf().set(opt).from(element).save();
      toast.success('הקבלה נשמרה כ-PDF');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('שגיאה בשמירת הקבלה כ-PDF');
    } finally {
      setIsSavingPdf(false);
    }
  };

  const handleSharePdf = async () => {
    if (!receiptRef.current) return;

    setIsSharing(true);
    try {
      const element = receiptRef.current;
      const opt = {
        margin: 0,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: [80, 120], orientation: 'portrait' as const },
      };

      const pdfBlob: Blob = await html2pdf().set(opt).from(element).toPdf().output('blob');
      const pdfFile = new Blob([pdfBlob], { type: 'application/pdf' });
      const fileName = `receipt-${receipt.receipt_number}.pdf`;
      const file = new File([pdfFile], fileName, { type: 'application/pdf' });

      // Try native share with PDF file
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          text: `קבלה מס׳ ${receipt.receipt_number} | ${receipt.member?.full_name || ''}\nתודה, בית כנסת ברית שלום עכו`,
        });
        toast.success('הקבלה שותפה בהצלחה');
      } else {
        // Fallback: download the PDF file
        const url = URL.createObjectURL(pdfFile);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        toast.success('הקבלה הורדה בהצלחה');
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Share error:', error);
        toast.error('שגיאה בשיתוף הקבלה');
      }
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-center">תצוגה מקדימה</DialogTitle>
        </DialogHeader>
        
        {/* Receipt Preview - styled like thermal receipt 80×120mm */}
        <div className="bg-white mx-4 mb-4 rounded-lg border shadow-inner">
          <div 
            ref={receiptRef}
            className="p-3 text-black bg-white"
            style={{ 
              fontFamily: "'Heebo', Arial, sans-serif",
              fontSize: '11px',
              lineHeight: '1.3',
              width: '80mm',
              minHeight: '120mm',
              maxHeight: '120mm',
              overflow: 'hidden',
              fontWeight: 700,
            }}
          >
            {/* Header with בס"ד */}
            <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 900, marginBottom: '2mm' }}>בס"ד</div>
            
            {/* Synagogue Name and Address */}
            <div style={{ textAlign: 'center', marginBottom: '2mm' }}>
              <div style={{ fontSize: '14px', fontWeight: 900 }}>בית כנסת "ברית שלום" עכו</div>
              <div style={{ fontSize: '10px', fontWeight: 800 }}>רח' קדושי קהיר 18, עכו</div>
            </div>

            {/* Receipt Number */}
            <div style={{ textAlign: 'center', marginBottom: '1mm' }}>
              <div style={{ fontSize: '13px', fontWeight: 900 }}>קבלה מספר: {receipt.receipt_number}</div>
            </div>

            {/* Dates */}
            <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: 800, marginBottom: '2mm' }}>
              <span>{formatDate(receipt.created_at)}</span>
              <span> • </span>
              <span>{getHebrewDate(new Date(receipt.created_at))}</span>
            </div>

            {/* Separator */}
            <div style={{ borderTop: '2px dashed #000', margin: '1.5mm 0' }} />

            {/* Details */}
            <div style={{ marginBottom: '2mm' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '11px', fontWeight: 800, padding: '0.5mm 0' }}>
                <span>התקבל מאת:</span>
                <span>{receipt.member?.full_name || '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '11px', fontWeight: 800, padding: '0.5mm 0' }}>
                <span>עבור:</span>
                <span>{receipt.description || 'תרומה'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', fontSize: '11px', fontWeight: 800, padding: '0.5mm 0' }}>
                <span>אמצעי תשלום:</span>
                <span>{PAYMENT_METHOD[receipt.payment?.method as keyof typeof PAYMENT_METHOD] || receipt.payment?.method || '-'}</span>
              </div>
            </div>

            {/* Separator */}
            <div style={{ borderTop: '2px dashed #000', margin: '1.5mm 0' }} />

            {/* Total */}
            <div style={{ textAlign: 'center', padding: '2mm 0' }}>
              <div style={{ fontSize: '12px', fontWeight: 900 }}>סה״כ שולם</div>
              <div style={{ fontSize: '22px', fontWeight: 900 }}>
                {formatCurrency(Number(receipt.total_amount))}
              </div>
            </div>

            {/* Separator */}
            <div style={{ borderTop: '2px dashed #000', margin: '1.5mm 0' }} />

            {/* Footer */}
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '12px', fontWeight: 900, marginBottom: '1mm' }}>תודה על תרומתכם!</p>
              <p style={{ fontSize: '10px', fontWeight: 800 }}>בית כנסת "ברית שלום" עכו</p>
              <p style={{ fontSize: '10px', fontWeight: 800 }}>רח' קדושי קהיר 18 עכו</p>
              <p style={{ fontSize: '10px', fontWeight: 800 }}>טלפון: 050-5768723</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 pt-0 flex flex-col gap-2">
          <div className="flex gap-2 justify-center flex-wrap">
            <Button
              size="sm"
              onClick={handlePrint}
              disabled={isPrinting}
              className="px-4"
            >
              {isPrinting ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <Printer className="w-4 h-4 ml-2" />
              )}
              הדפס
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                setIsRemotePrinting(true);
                try {
                  await remotePrintReceipt(receipt);
                  toast.success('הקבלה נשלחה להדפסה מרחוק');
                } catch (error: any) {
                  console.error('Remote print error:', error);
                  toast.error('שגיאה בהדפסה מרחוק', { description: error.message });
                } finally {
                  setIsRemotePrinting(false);
                }
              }}
              disabled={isRemotePrinting}
              className="px-4 gap-2"
            >
              {isRemotePrinting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wifi className="w-4 h-4" />
              )}
              הדפס קבלה מרחוק
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSavePdf}
              disabled={isSavingPdf}
              className="px-4"
            >
              {isSavingPdf ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4 ml-2" />
              )}
              שמור PDF
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSharePdf}
              disabled={isSharing}
              className="px-4"
            >
              {isSharing ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4 ml-2" />
              )}
              שתף קבלה
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            <X className="w-4 h-4 ml-2" />
            סגור
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
