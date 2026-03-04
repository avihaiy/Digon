import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar,
  Sun,
  Moon,
  CreditCard,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Smartphone,
  Banknote,
  QrCode,
  Loader2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  formatCurrency,
  formatDate,
  getNextShabbat,
  getCurrentParasha,
  getHebrewDate,
  ALIYA_TYPES,
  ALIYA_STATUS,
  PAYMENT_METHOD,
} from '@/lib/hebrew-utils';
import AshkavaBrachaBlock, { type AshkavaData, type BrachaData } from '@/components/payments/AshkavaBrachaBlock';

export default function FridayDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const nextShabbat = getNextShabbat();
  const shabbatDateStr = nextShabbat.toISOString().split('T')[0];
  const parasha = getCurrentParasha();

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedAliya, setSelectedAliya] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'bit' | 'cash'>('bit');
  const [bitReference, setBitReference] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [ashkava, setAshkava] = useState<AshkavaData>({ enabled: false, quantity: 1, unitPrice: 0, total: 0 });
  const [bracha, setBracha] = useState<BrachaData>({ enabled: false, type: 'single', price: 0 });

  const totalPayment = Number(paymentAmount || 0) + (ashkava.enabled ? ashkava.total : 0) + (bracha.enabled ? bracha.price : 0);

  // Fetch Shabbat aliyot
  const { data: aliyot, isLoading: aliyotLoading } = useQuery({
    queryKey: ['friday-aliyot', shabbatDateStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aliyot')
        .select(`
          *,
          member:members(id, full_name, phone)
        `)
        .eq('shabbat_date', shabbatDateStr)
        .order('created_at');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch weekly summary
  const { data: weeklySummary } = useQuery({
    queryKey: ['weekly-summary'],
    queryFn: async () => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      const { data: payments } = await supabase
        .from('payments')
        .select('amount, status')
        .gte('created_at', weekStart.toISOString())
        .eq('status', 'confirmed');

      const totalIncome = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      return {
        income: totalIncome,
        expenses: 0, // Would come from expenses table if implemented
        balance: totalIncome,
      };
    },
  });

  // Payment mutation
  const createPayment = useMutation({
    mutationFn: async ({
      memberId,
      aliyaId,
      amount,
      method,
      reference,
    }: {
      memberId: string;
      aliyaId: string;
      amount: number;
      method: 'bit' | 'cash';
      reference?: string;
    }) => {
      // Create payment
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          member_id: memberId,
          aliya_id: aliyaId,
          amount,
          method,
          reference,
          received_by: user?.id,
          status: 'confirmed',
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update aliya status
      const { error: aliyaError } = await supabase
        .from('aliyot')
        .update({ status: 'paid' })
        .eq('id', aliyaId);

      if (aliyaError) throw aliyaError;

      // Create receipt
      const { data: receipt, error: receiptError } = await supabase
        .from('receipts')
        .insert({
          member_id: memberId,
          payment_id: payment.id,
          total_amount: amount,
          description: `עלייה לתורה - פרשת ${parasha}`,
        })
        .select()
        .single();

      if (receiptError) throw receiptError;

      return { payment, receipt };
    },
    onSuccess: async (data) => {
      toast.success('התשלום נקלט בהצלחה!', {
        description: `קבלה מספר ${data.receipt.receipt_number} הונפקה`,
      });
      
      // Send receipt email automatically
      try {
        await supabase.functions.invoke('send-receipt-email', {
          body: { receiptId: data.receipt.id }
        });
        toast.success('הקבלה נשלחה למייל');
      } catch (emailError) {
        console.error('Failed to send receipt email:', emailError);
        // Don't show error to user - email is secondary
      }
      
      queryClient.invalidateQueries({ queryKey: ['friday-aliyot'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-summary'] });
      setPaymentDialogOpen(false);
      setSelectedAliya(null);
      setBitReference('');
      setPaymentAmount('');
    },
    onError: (error) => {
      toast.error('שגיאה בקליטת התשלום', {
        description: error.message,
      });
    },
  });

  const handleOpenPayment = (aliya: any) => {
    setSelectedAliya(aliya);
    setPaymentAmount(String(aliya.price || 0));
    setPaymentDialogOpen(true);
  };

  const handleConfirmPayment = () => {
    if (!selectedAliya?.member?.id) {
      toast.error('יש לשייך חבר לעלייה לפני קבלת תשלום');
      return;
    }

    if (paymentMethod === 'bit' && !bitReference) {
      toast.error('יש להזין מספר אסמכתא מביט');
      return;
    }

    createPayment.mutate({
      memberId: selectedAliya.member.id,
      aliyaId: selectedAliya.id,
      amount: Number(paymentAmount),
      method: paymentMethod,
      reference: paymentMethod === 'bit' ? bitReference : undefined,
    });
  };

  const pendingAliyot = aliyot?.filter((a) => a.status === 'pending') || [];
  const unassignedAliyot = aliyot?.filter((a) => !a.member_id) || [];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header with Date Info */}
      <div className="friday-panel gold-accent">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                <Calendar className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">מסך יום שישי</h1>
                <p className="text-muted-foreground">הכנה לשבת קודש</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary">
              <Sun className="w-5 h-5 text-warning" />
              <div>
                <p className="text-xs text-muted-foreground">תאריך לועזי</p>
                <p className="font-medium">{formatDate(nextShabbat)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary">
              <Moon className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">תאריך עברי</p>
                <p className="font-medium">{getHebrewDate(nextShabbat)}</p>
              </div>
            </div>
            <div className="px-4 py-2 rounded-xl bg-primary text-primary-foreground">
              <p className="text-xs opacity-80">פרשת השבוע</p>
              <p className="text-lg font-bold">{parasha}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(pendingAliyot.length > 0 || unassignedAliyot.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {pendingAliyot.length > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-warning/10 border border-warning/20">
              <AlertTriangle className="w-6 h-6 text-warning" />
              <div>
                <p className="font-medium">עליות ממתינות לתשלום</p>
                <p className="text-sm text-muted-foreground">
                  {pendingAliyot.length} עליות טרם שולמו
                </p>
              </div>
            </div>
          )}
          {unassignedAliyot.length > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-6 h-6 text-destructive" />
              <div>
                <p className="font-medium">עליות ללא שיוך</p>
                <p className="text-sm text-muted-foreground">
                  {unassignedAliyot.length} עליות ללא חבר משויך
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Weekly Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">הכנסות השבוע</p>
              <p className="text-xl font-bold hebrew-number">
                {formatCurrency(weeklySummary?.income || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">הוצאות השבוע</p>
              <p className="text-xl font-bold hebrew-number">
                {formatCurrency(weeklySummary?.expenses || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">מאזן</p>
              <p className="text-xl font-bold hebrew-number">
                {formatCurrency(weeklySummary?.balance || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aliyot Table */}
      <Card className="friday-panel">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            עליות לשבת - פרשת {parasha}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {aliyotLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : aliyot?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">אין עליות מתוכננות לשבת זו</p>
              <p className="text-sm">לחץ על "הוסף עלייה" ליצירת עליות חדשות</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 p-3 text-sm font-medium text-muted-foreground border-b">
                <div className="col-span-2">סוג עלייה</div>
                <div className="col-span-3">שם החבר</div>
                <div className="col-span-2 text-center">מחיר</div>
                <div className="col-span-2 text-center">סטטוס</div>
                <div className="col-span-3 text-center">פעולות</div>
              </div>

              {/* Table Body */}
              {aliyot?.map((aliya: any) => (
                <div
                  key={aliya.id}
                  className="grid grid-cols-12 gap-4 p-4 rounded-xl bg-secondary/30 items-center table-row-hover"
                >
                  <div className="col-span-2">
                    <Badge variant="outline" className="font-bold">
                      {ALIYA_TYPES[aliya.aliya_type as keyof typeof ALIYA_TYPES]}
                    </Badge>
                  </div>
                  <div className="col-span-3 font-medium">
                    {aliya.member?.full_name || (
                      <span className="text-muted-foreground italic">לא משויך</span>
                    )}
                  </div>
                  <div className="col-span-2 text-center font-bold hebrew-number">
                    {formatCurrency(Number(aliya.price))}
                  </div>
                  <div className="col-span-2 text-center">
                    <Badge
                      className={
                        aliya.status === 'paid'
                          ? 'status-paid'
                          : aliya.status === 'waived'
                          ? 'status-waived'
                          : 'status-pending'
                      }
                    >
                      {aliya.status === 'paid' && <CheckCircle2 className="w-3 h-3 ml-1" />}
                      {ALIYA_STATUS[aliya.status as keyof typeof ALIYA_STATUS]}
                    </Badge>
                  </div>
                  <div className="col-span-3 flex items-center justify-center gap-2">
                    {aliya.status === 'pending' && aliya.member_id && (
                      <Button
                        size="sm"
                        onClick={() => handleOpenPayment(aliya)}
                        className="btn-gold gap-1"
                      >
                        <CreditCard className="w-4 h-4" />
                        קבל תשלום
                      </Button>
                    )}
                    {aliya.status === 'paid' && (
                      <Button size="sm" variant="outline" className="gap-1">
                        <Receipt className="w-4 h-4" />
                        הצג קבלה
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              קבלת תשלום
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Member Info */}
            <div className="p-4 rounded-xl bg-secondary">
              <p className="text-sm text-muted-foreground">משלם</p>
              <p className="text-lg font-bold">{selectedAliya?.member?.full_name}</p>
              <p className="text-sm text-muted-foreground">
                {ALIYA_TYPES[selectedAliya?.aliya_type as keyof typeof ALIYA_TYPES]} - פרשת {parasha}
              </p>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label>סכום לתשלום</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="text-xl font-bold text-center hebrew-number"
                dir="ltr"
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-3">
              <Label>אמצעי תשלום</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPaymentMethod('bit')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === 'bit'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Smartphone className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                  <p className="font-medium">ביט</p>
                </button>
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === 'cash'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Banknote className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <p className="font-medium">מזומן</p>
                </button>
              </div>
            </div>

            {/* Bit Payment Flow */}
            {paymentMethod === 'bit' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                  <div className="flex items-center gap-3 mb-3">
                    <QrCode className="w-12 h-12 text-purple-600" />
                    <div>
                      <p className="font-medium text-purple-900">סרוק QR או שלח לינק</p>
                      <p className="text-sm text-purple-700">
                        סכום: {formatCurrency(Number(paymentAmount))}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>מספר אסמכתא מביט</Label>
                  <Input
                    value={bitReference}
                    onChange={(e) => setBitReference(e.target.value)}
                    placeholder="הזן את מספר האסמכתא מביט"
                    dir="ltr"
                    className="text-center"
                  />
                </div>
              </div>
            )}

            {/* Cash Payment Note */}
            {paymentMethod === 'cash' && (
              <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                <p className="text-sm text-green-800">
                  התשלום יירשם על שמך כגבאי מקבל
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPaymentDialogOpen(false)}
              >
                ביטול
              </Button>
              <Button
                className="flex-1 btn-primary-gradient"
                onClick={handleConfirmPayment}
                disabled={createPayment.isPending}
              >
                {createPayment.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    מעבד...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                    אשר תשלום והנפק קבלה
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
