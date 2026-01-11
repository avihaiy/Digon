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
  Download,
  MessageCircle,
  Mail,
} from 'lucide-react';
import { formatCurrency, formatShortDate, formatDate } from '@/lib/hebrew-utils';
import { toast } from 'sonner';

export default function Receipts() {
  const [searchQuery, setSearchQuery] = useState('');

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
    // Create printable receipt
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <title>קבלה מספר ${receipt.receipt_number}</title>
        <style>
          body {
            font-family: 'Heebo', Arial, sans-serif;
            padding: 40px;
            max-width: 600px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #722F37;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #722F37;
          }
          .receipt-number {
            font-size: 18px;
            margin-top: 10px;
          }
          .details {
            margin: 20px 0;
          }
          .row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
          }
          .total {
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background: #f5f5f5;
            border-radius: 10px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            color: #666;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">בית הכנסת</div>
          <div class="receipt-number">קבלה מספר: ${receipt.receipt_number}</div>
        </div>
        <div class="details">
          <div class="row">
            <span>תאריך:</span>
            <span>${formatDate(receipt.created_at)}</span>
          </div>
          <div class="row">
            <span>התקבל מאת:</span>
            <span>${receipt.member?.full_name}</span>
          </div>
          <div class="row">
            <span>עבור:</span>
            <span>${receipt.description || 'תרומה'}</span>
          </div>
          <div class="row">
            <span>אמצעי תשלום:</span>
            <span>${receipt.payment?.method === 'bit' ? 'ביט' : 'מזומן'}</span>
          </div>
        </div>
        <div class="total">
          סה"כ: ₪${Number(receipt.total_amount).toLocaleString()}
        </div>
        <div class="footer">
          <p>תודה על תרומתכם!</p>
          <p>מערכת ניהול גבאות</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
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
                        onClick={() => handlePrint(receipt)}
                        title="הדפסה"
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
    </div>
  );
}
