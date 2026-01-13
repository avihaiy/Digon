import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import {
  Receipt,
  Search,
  Printer,
  Eye,
  MessageCircle,
  Mail,
} from 'lucide-react';
import { formatCurrency, formatShortDate, formatDate } from '@/lib/hebrew-utils';
import { toast } from 'sonner';
import { ReceiptPreviewDialog } from '@/components/ReceiptPreviewDialog';

export default function Receipts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [previewReceipt, setPreviewReceipt] = useState<any>(null);

  // Fetch receipts
  const { data: receipts, isLoading } = useQuery({
    queryKey: ['receipts', searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select(`
          *,
          member:members(full_name, phone, email),
          payment:payments(method, reference)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const handlePrint = (receipt: any) => {
    // Create printable receipt optimized for 80mm thermal printer
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=80mm, initial-scale=1.0">
        <title>קבלה מספר ${receipt.receipt_number}</title>
        <style>
          /* Reset and base styles for thermal printing */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          /* Page settings for 80mm thermal printer */
          @page {
            size: 80mm auto;
            margin: 0;
          }
          
          @media print {
            html, body {
              width: 80mm !important;
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            .no-print {
              display: none !important;
            }
          }
          
          html {
            direction: rtl;
          }
          
          body {
            font-family: 'Heebo', 'Arial', sans-serif;
            width: 80mm;
            max-width: 80mm;
            margin: 0 auto;
            padding: 3mm;
            font-size: 12px;
            line-height: 1.4;
            background: white;
            color: #000;
          }
          
          .receipt-container {
            width: 100%;
          }
          
          .header {
            text-align: center;
            border-bottom: 1px dashed #000;
            padding-bottom: 3mm;
            margin-bottom: 3mm;
          }
          
          .logo {
            font-size: 16px;
            font-weight: bold;
          }
          
          .receipt-number {
            font-size: 14px;
            margin-top: 2mm;
            font-weight: bold;
          }
          
          .date {
            font-size: 11px;
            margin-top: 1mm;
            color: #333;
          }
          
          .divider {
            border-top: 1px dashed #000;
            margin: 3mm 0;
          }
          
          .details {
            margin: 3mm 0;
          }
          
          .row {
            display: flex;
            justify-content: space-between;
            padding: 1.5mm 0;
            font-size: 11px;
          }
          
          .row .label {
            font-weight: 500;
          }
          
          .row .value {
            text-align: left;
          }
          
          .total-section {
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            margin: 3mm 0;
            padding: 3mm 0;
            text-align: center;
          }
          
          .total-label {
            font-size: 12px;
            margin-bottom: 1mm;
          }
          
          .total-amount {
            font-size: 20px;
            font-weight: bold;
          }
          
          .footer {
            text-align: center;
            margin-top: 4mm;
            padding-top: 3mm;
            border-top: 1px dashed #000;
          }
          
          .footer p {
            font-size: 10px;
            margin: 1mm 0;
          }
          
          .thank-you {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 2mm;
          }
          
          /* Print button - only visible on screen */
          .print-btn {
            display: block;
            width: 100%;
            padding: 12px;
            margin: 4mm 0;
            background: #722F37;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            font-family: inherit;
          }
          
          .print-btn:hover {
            background: #5a252c;
          }
          
          @media print {
            .print-btn {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <div class="logo">בית הכנסת</div>
            <div class="receipt-number">קבלה מספר: ${receipt.receipt_number}</div>
            <div class="date">${formatDate(receipt.created_at)}</div>
          </div>
          
          <div class="details">
            <div class="row">
              <span class="label">התקבל מאת:</span>
              <span class="value">${receipt.member?.full_name || '-'}</span>
            </div>
            <div class="row">
              <span class="label">עבור:</span>
              <span class="value">${receipt.description || 'תרומה'}</span>
            </div>
            <div class="row">
              <span class="label">אמצעי תשלום:</span>
              <span class="value">${receipt.payment?.method === 'bit' ? 'ביט' : 'מזומן'}</span>
            </div>
          </div>
          
          <div class="total-section">
            <div class="total-label">סה״כ שולם</div>
            <div class="total-amount">₪${Number(receipt.total_amount).toLocaleString()}</div>
          </div>
          
          <button class="print-btn no-print" onclick="window.print()">🖨️ הדפס קבלה</button>
          
          <div class="footer">
            <p class="thank-you">תודה על תרומתכם!</p>
            <p>מערכת ניהול גבאות</p>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleWhatsApp = (receipt: any) => {
    if (!receipt.member?.phone) {
      toast.error('אין מספר טלפון לחבר זה');
      return;
    }
    
    const phone = receipt.member.phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `שלום ${receipt.member.full_name},\n\nקבלה מספר: ${receipt.receipt_number}\nסכום: ${formatCurrency(Number(receipt.total_amount))}\nתאריך: ${formatDate(receipt.created_at)}\n\nתודה רבה!\nבית הכנסת`
    );
    window.open(`https://wa.me/972${phone.startsWith('0') ? phone.slice(1) : phone}?text=${message}`, '_blank');
  };

  const handleEmail = (receipt: any) => {
    if (!receipt.member?.email) {
      toast.error('אין אימייל לחבר זה');
      return;
    }

    const subject = encodeURIComponent(`קבלה מספר ${receipt.receipt_number} - בית הכנסת`);
    const body = encodeURIComponent(
      `שלום ${receipt.member.full_name},\n\nמצורפת קבלה מספר ${receipt.receipt_number}\nסכום: ${formatCurrency(Number(receipt.total_amount))}\nתאריך: ${formatDate(receipt.created_at)}\n\nתודה רבה!\nבית הכנסת`
    );
    window.open(`mailto:${receipt.member.email}?subject=${subject}&body=${body}`, '_blank');
  };

  // Filter receipts
  const filteredReceipts = receipts?.filter((r: any) =>
    r.member?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(r.receipt_number).includes(searchQuery)
  );

  // Summary
  const totalAmount = receipts?.reduce((sum: number, r: any) => sum + Number(r.total_amount), 0) || 0;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="w-6 h-6" />
            קבלות
          </h1>
          <p className="text-muted-foreground">
            {receipts?.length || 0} קבלות • סה״כ {formatCurrency(totalAmount)}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="חיפוש לפי שם או מספר קבלה..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Receipts List */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredReceipts?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">אין קבלות להצגה</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredReceipts?.map((receipt: any) => (
                <div
                  key={receipt.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 table-row-hover"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Receipt className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          #{receipt.receipt_number}
                        </Badge>
                        <span className="font-medium">{receipt.member?.full_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span>{formatShortDate(receipt.created_at)}</span>
                        {receipt.description && (
                          <>
                            <span>•</span>
                            <span>{receipt.description}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xl font-bold hebrew-number">
                      {formatCurrency(Number(receipt.total_amount))}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewReceipt(receipt)}
                        title="תצוגה מקדימה"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePrint(receipt)}
                        title="הדפסה ישירה"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleWhatsApp(receipt)}
                        title="שלח בוואטסאפ"
                        className="text-green-600 hover:text-green-700"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEmail(receipt)}
                        title="שלח באימייל"
                      >
                        <Mail className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt Preview Modal */}
      <ReceiptPreviewDialog
        receipt={previewReceipt}
        open={!!previewReceipt}
        onOpenChange={(open) => !open && setPreviewReceipt(null)}
        onPrint={handlePrint}
      />
    </div>
  );
}
