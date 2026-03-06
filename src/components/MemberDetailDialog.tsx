import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  User,
  Phone,
  Mail,
  AlertCircle,
  CreditCard,
  Receipt,
  BookOpen,
  Share2,
  Loader2,
  CheckCircle2,
  Clock,
  FileDown,
} from 'lucide-react';
import {
  formatCurrency,
  formatShortDate,
  PAYMENT_METHOD,
  ALIYA_TYPES,
} from '@/lib/hebrew-utils';
import { shareReceiptWithPdf } from '@/lib/receipt-share';
import { toast } from 'sonner';
import html2pdf from 'html2pdf.js';

interface MemberDetailDialogProps {
  memberId: string | null;
  memberName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberDetailDialog({
  memberId,
  memberName,
  open,
  onOpenChange,
}: MemberDetailDialogProps) {
  const [isSharingText, setIsSharingText] = useState(false);
  const [isSharingPdf, setIsSharingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'payments' | 'aliyot' | 'receipts'>('summary');

  // Fetch payments with receipt descriptions
  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ['member-payments', memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, receipt:receipts(receipt_number, description)')
        .eq('member_id', memberId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!memberId && open,
  });

  // Fetch aliyot
  const { data: aliyot, isLoading: loadingAliyot } = useQuery({
    queryKey: ['member-aliyot', memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aliyot')
        .select('*')
        .eq('member_id', memberId!)
        .order('shabbat_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!memberId && open,
  });

  // Fetch receipts
  const { data: receipts, isLoading: loadingReceipts } = useQuery({
    queryKey: ['member-receipts', memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select('*, payment:payments(method)')
        .eq('member_id', memberId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!memberId && open,
  });

  const pendingPayments = payments?.filter(p => p.status === 'pending') || [];
  const confirmedPayments = payments?.filter(p => p.status === 'confirmed') || [];
  const totalDebt = pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPaid = confirmedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const pendingAliyot = aliyot?.filter(a => a.status === 'pending') || [];
  const aliyotDebt = pendingAliyot.reduce((sum, a) => sum + Number(a.price || 0), 0);
  const totalOwed = totalDebt + aliyotDebt;

  const isLoading = loadingPayments || loadingAliyot || loadingReceipts;

  const handleShareText = async () => {
    setIsSharingText(true);
    try {
      const lines = [
        `📋 סיכום חשבון - ${memberName}`,
        `בית כנסת "ברית שלום" עכו`,
        `────────────────`,
        `💰 סה״כ חוב פתוח: ${formatCurrency(totalOwed)}`,
      ];

      if (pendingPayments.length > 0) {
        lines.push(``, `📌 תשלומים ממתינים (${pendingPayments.length}):`);
        pendingPayments.forEach(p => {
          const desc = p.receipt?.[0]?.description || PAYMENT_METHOD[p.method as keyof typeof PAYMENT_METHOD] || p.method;
          lines.push(`  • ${desc} - ${formatCurrency(Number(p.amount))} (${formatShortDate(p.created_at)})`);
        });
      }

      if (pendingAliyot.length > 0) {
        lines.push(``, `📖 עליות ממתינות (${pendingAliyot.length}):`);
        pendingAliyot.forEach(a => {
          const typeName = ALIYA_TYPES[a.aliya_type as keyof typeof ALIYA_TYPES] || a.aliya_type;
          lines.push(`  • ${typeName} - פרשת ${a.parasha} - ${formatCurrency(Number(a.price || 0))}`);
        });
      }

      lines.push(``, `תודה, בית כנסת ברית שלום עכו`);

      const text = lines.join('\n');

      if (navigator.share) {
        await navigator.share({ text });
        toast.success('ההודעה שותפה בהצלחה');
      } else {
        await navigator.clipboard.writeText(text);
        toast.success('הטקסט הועתק ללוח');
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        toast.error('שגיאה בשיתוף');
      }
    } finally {
      setIsSharingText(false);
    }
  };

  const handleSharePdf = async () => {
    setIsSharingPdf(true);
    try {
      const el = document.createElement('div');
      el.style.cssText = "font-family:'Heebo',Arial,sans-serif;font-size:12px;line-height:1.4;width:80mm;padding:4mm;color:#000;background:#fff;direction:rtl;";
      
      let html = `
        <div style="text-align:center;font-size:10px;font-weight:900;margin-bottom:2mm">בס"ד</div>
        <div style="text-align:center;margin-bottom:3mm">
          <div style="font-size:14px;font-weight:900">בית כנסת "ברית שלום" עכו</div>
          <div style="font-size:10px;font-weight:800">רח' קדושי קהיר 18, עכו</div>
        </div>
        <div style="border-top:2px solid #000;margin:2mm 0"></div>
        <div style="text-align:center;margin-bottom:3mm">
          <div style="font-size:13px;font-weight:900">סיכום חשבון - ${memberName}</div>
        </div>
        <div style="text-align:center;font-size:20px;font-weight:900;margin-bottom:3mm;color:${totalOwed > 0 ? '#c00' : '#090'}">
          חוב פתוח: ${formatCurrency(totalOwed)}
        </div>
        <div style="border-top:2px dashed #000;margin:2mm 0"></div>
      `;

      if (pendingPayments.length > 0) {
        html += `<div style="font-size:11px;font-weight:900;margin-bottom:1mm">תשלומים ממתינים:</div>`;
        pendingPayments.forEach(p => {
          const desc = p.receipt?.[0]?.description || PAYMENT_METHOD[p.method as keyof typeof PAYMENT_METHOD] || p.method;
          html += `<div style="display:flex;justify-content:space-between;font-size:10px;font-weight:700;padding:0.5mm 0">
            <span>${desc}</span>
            <span>${formatCurrency(Number(p.amount))}</span>
          </div>`;
        });
        html += `<div style="border-top:1px dashed #999;margin:2mm 0"></div>`;
      }

      if (pendingAliyot.length > 0) {
        html += `<div style="font-size:11px;font-weight:900;margin-bottom:1mm">עליות ממתינות:</div>`;
        pendingAliyot.forEach(a => {
          const typeName = ALIYA_TYPES[a.aliya_type as keyof typeof ALIYA_TYPES] || a.aliya_type;
          html += `<div style="display:flex;justify-content:space-between;font-size:10px;font-weight:700;padding:0.5mm 0">
            <span>${typeName} - פרשת ${a.parasha}</span>
            <span>${formatCurrency(Number(a.price || 0))}</span>
          </div>`;
        });
        html += `<div style="border-top:1px dashed #999;margin:2mm 0"></div>`;
      }

      html += `
        <div style="text-align:center;margin-top:3mm">
          <div style="font-size:10px;font-weight:800">תודה, בית כנסת ברית שלום עכו</div>
          <div style="font-size:9px;font-weight:700">טלפון: 050-5768723</div>
        </div>
      `;

      el.innerHTML = html;
      document.body.appendChild(el);

      try {
        const opt = {
          margin: 0,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true },
          jsPDF: { unit: 'mm', format: [80, 150], orientation: 'portrait' as const },
        };

        const pdfBlob: Blob = await html2pdf().set(opt).from(el).toPdf().output('blob');
        const fileName = `account-${memberName.replace(/\s+/g, '-')}.pdf`;
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            text: `סיכום חשבון - ${memberName}\nחוב פתוח: ${formatCurrency(totalOwed)}\nתודה, בית כנסת ברית שלום עכו`,
          });
          toast.success('הדוח שותף בהצלחה');
        } else {
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 5000);
          toast.success('הדוח הורד כ-PDF');
        }
      } finally {
        if (document.body.contains(el)) {
          document.body.removeChild(el);
        }
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('PDF share error:', error);
        toast.error('שגיאה בשיתוף');
      }
    } finally {
      setIsSharingPdf(false);
    }
  };

  const tabs = [
    { key: 'summary' as const, label: 'סיכום', icon: AlertCircle },
    { key: 'payments' as const, label: 'תשלומים', icon: CreditCard },
    { key: 'aliyot' as const, label: 'עליות', icon: BookOpen },
    { key: 'receipts' as const, label: 'קבלות', icon: Receipt },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-[calc(100vw-1.5rem)] max-h-[90dvh] overflow-y-auto p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <User className="w-5 h-5" />
            {memberName}
          </DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 px-4 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4 pt-2 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <>
              {/* Summary Tab */}
              {activeTab === 'summary' && (
                <div className="space-y-3">
                  {/* Debt Card - only show when there's debt */}
                  {totalOwed > 0 && (
                    <Card className="border-2 border-destructive/30 bg-destructive/5">
                      <CardContent className="p-4 text-center">
                        <p className="text-sm text-muted-foreground mb-1">חוב פתוח</p>
                        <p className="text-3xl font-black text-destructive">
                          {formatCurrency(totalOwed)}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Detailed Debt Breakdown */}
                  {pendingPayments.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold mb-2 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4" />
                        תשלומים ממתינים ({pendingPayments.length})
                      </h4>
                      <div className="space-y-1">
                        {pendingPayments.map(p => (
                          <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-destructive/5 border border-destructive/10">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">
                                {p.receipt?.[0]?.description || PAYMENT_METHOD[p.method as keyof typeof PAYMENT_METHOD] || p.method}
                              </p>
                              <p className="text-xs text-muted-foreground">{formatShortDate(p.created_at)}</p>
                            </div>
                            <span className="font-bold text-destructive mr-2">{formatCurrency(Number(p.amount))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pendingAliyot.length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold mb-2 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4" />
                        עליות ממתינות ({pendingAliyot.length})
                      </h4>
                      <div className="space-y-1">
                        {pendingAliyot.map(a => {
                          const typeName = ALIYA_TYPES[a.aliya_type as keyof typeof ALIYA_TYPES] || a.aliya_type;
                          return (
                            <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border border-border">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm">{typeName}</p>
                                <p className="text-xs text-muted-foreground">פרשת {a.parasha} • {formatShortDate(a.shabbat_date)}</p>
                              </div>
                              <span className="font-bold mr-2">{formatCurrency(Number(a.price || 0))}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">סה״כ שולם</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(totalPaid)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">סה״כ קבלות</p>
                        <p className="text-lg font-bold">{receipts?.length || 0}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Share Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={handleShareText}
                      disabled={isSharingText}
                    >
                      {isSharingText ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                      שתף הודעה
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={handleSharePdf}
                      disabled={isSharingPdf}
                    >
                      {isSharingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                      שתף PDF
                    </Button>
                  </div>
                </div>
              )}

              {/* Payments Tab */}
              {activeTab === 'payments' && (
                <div className="space-y-2">
                  {payments?.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">אין תשלומים</p>
                  ) : (
                    payments?.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">
                            {p.receipt?.[0]?.description || PAYMENT_METHOD[p.method as keyof typeof PAYMENT_METHOD] || p.method}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {PAYMENT_METHOD[p.method as keyof typeof PAYMENT_METHOD] || p.method} • {formatShortDate(p.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{formatCurrency(Number(p.amount))}</span>
                          <Badge variant={p.status === 'confirmed' ? 'default' : 'secondary'} className="text-xs">
                            {p.status === 'confirmed' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Aliyot Tab */}
              {activeTab === 'aliyot' && (
                <div className="space-y-2">
                  {aliyot?.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">אין עליות</p>
                  ) : (
                    aliyot?.map(a => (
                      <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium text-sm">
                            {ALIYA_TYPES[a.aliya_type as keyof typeof ALIYA_TYPES] || a.aliya_type}
                          </p>
                          <p className="text-xs text-muted-foreground">{a.parasha} • {formatShortDate(a.shabbat_date)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{formatCurrency(Number(a.price || 0))}</span>
                          <Badge
                            variant={a.status === 'paid' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {a.status === 'paid' ? 'שולם' : a.status === 'waived' ? 'ויתור' : 'ממתין'}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Receipts Tab */}
              {activeTab === 'receipts' && (
                <div className="space-y-2">
                  {receipts?.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">אין קבלות</p>
                  ) : (
                    receipts?.map(r => (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium text-sm">קבלה #{r.receipt_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.description || 'תרומה'} • {formatShortDate(r.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{formatCurrency(Number(r.total_amount))}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={async () => {
                              try {
                                const receiptWithMember = { ...r, member: { full_name: memberName } };
                                await shareReceipt(receiptWithMember);
                                toast.success('הקבלה שותפה');
                              } catch (error: any) {
                                if (error?.message === 'DOWNLOAD_FALLBACK') {
                                  toast.success('הקבלה הורדה');
                                } else if (error?.name !== 'AbortError') {
                                  toast.error('שגיאה בשיתוף');
                                }
                              }
                            }}
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
