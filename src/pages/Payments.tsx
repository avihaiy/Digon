import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  CreditCard,
  Plus,
  Search,
  Loader2,
  Smartphone,
  Banknote,
  CheckCircle2,
  Clock,
  QrCode,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  formatCurrency,
  formatShortDate,
  getHebrewDate,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  getCurrentParasha,
} from '@/lib/hebrew-utils';

export default function Payments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bit' | 'cash'>('cash');

  // Form state
  const [formData, setFormData] = useState({
    member_id: '',
    amount: '',
    reference: '',
    notes: '',
  });

  // Fetch payments
  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select(`
          *,
          member:members(full_name),
          receipt:receipts(receipt_number)
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch members for dropdown
  const { data: members } = useQuery({
    queryKey: ['members-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('id, full_name')
        .eq('active', true)
        .order('full_name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Create payment
  const createPayment = useMutation({
    mutationFn: async () => {
      // Create payment
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          member_id: formData.member_id,
          amount: Number(formData.amount),
          method: paymentMethod,
          reference: paymentMethod === 'bit' ? formData.reference : null,
          received_by: user?.id,
          status: 'confirmed',
          notes: formData.notes || null,
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Create receipt
      const { error: receiptError } = await supabase.from('receipts').insert({
        member_id: formData.member_id,
        payment_id: payment.id,
        total_amount: Number(formData.amount),
        description: `תשלום - פרשת ${getCurrentParasha()}`,
      });

      if (receiptError) throw receiptError;

      return payment;
    },
    onSuccess: () => {
      toast.success('התשלום נקלט והקבלה הונפקה');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('שגיאה בקליטת התשלום', { description: error.message });
    },
  });

  // Confirm pending payment
  const confirmPayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'confirmed' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('התשלום אושר');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
    },
  });

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setFormData({ member_id: '', amount: '', reference: '', notes: '' });
    setPaymentMethod('cash');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.member_id) {
      toast.error('יש לבחור חבר');
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error('יש להזין סכום תקין');
      return;
    }
    if (paymentMethod === 'bit' && !formData.reference) {
      toast.error('יש להזין מספר אסמכתא מביט');
      return;
    }
    createPayment.mutate();
  };

  // Filter payments by search
  const filteredPayments = payments?.filter((p: any) =>
    p.member?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Summary stats
  const totalConfirmed = payments?.filter((p: any) => p.status === 'confirmed')
    .reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
  const pendingCount = payments?.filter((p: any) => p.status === 'pending').length || 0;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="w-6 h-6" />
            ניהול תשלומים
          </h1>
          <p className="text-muted-foreground">
            סה״כ הכנסות: {formatCurrency(totalConfirmed)}
            {pendingCount > 0 && ` • ${pendingCount} ממתינים לאישור`}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="btn-primary-gradient gap-2">
          <Plus className="w-4 h-4" />
          קבל תשלום
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="חיפוש לפי שם חבר..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Payments List */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredPayments?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">אין תשלומים להצגה</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredPayments?.map((payment: any) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 table-row-hover"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      payment.method === 'bit'
                        ? 'bg-purple-100 text-purple-600'
                        : 'bg-green-100 text-green-600'
                    }`}>
                      {payment.method === 'bit' ? (
                        <Smartphone className="w-5 h-5" />
                      ) : (
                        <Banknote className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{payment.member?.full_name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                        <span>{formatShortDate(payment.created_at)} ({getHebrewDate(new Date(payment.created_at))})</span>
                        <span>•</span>
                        <span>{PAYMENT_METHOD[payment.method as keyof typeof PAYMENT_METHOD]}</span>
                        {payment.reference && (
                          <>
                            <span>•</span>
                            <span>אסמכתא: {payment.reference}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold hebrew-number">
                      {formatCurrency(Number(payment.amount))}
                    </span>
                    <Badge
                      className={
                        payment.status === 'confirmed'
                          ? 'status-paid'
                          : 'status-pending'
                      }
                    >
                      {payment.status === 'confirmed' ? (
                        <CheckCircle2 className="w-3 h-3 ml-1" />
                      ) : (
                        <Clock className="w-3 h-3 ml-1" />
                      )}
                      {PAYMENT_STATUS[payment.status as keyof typeof PAYMENT_STATUS]}
                    </Badge>
                    {payment.receipt?.[0]?.receipt_number && (
                      <Badge variant="outline">
                        קבלה #{payment.receipt[0].receipt_number}
                      </Badge>
                    )}
                    {payment.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => confirmPayment.mutate(payment.id)}
                      >
                        אשר
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              קבלת תשלום חדש
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>בחר חבר *</Label>
              <Select
                value={formData.member_id}
                onValueChange={(value) => setFormData({ ...formData, member_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר חבר" />
                </SelectTrigger>
                <SelectContent>
                  {members?.map((member: any) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>סכום לתשלום *</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
                dir="ltr"
                className="text-left text-xl font-bold"
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-3">
              <Label>אמצעי תשלום</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
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
                  type="button"
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

            {/* Bit Reference */}
            {paymentMethod === 'bit' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                  <div className="flex items-center gap-3 mb-2">
                    <QrCode className="w-10 h-10 text-purple-600" />
                    <div>
                      <p className="font-medium text-purple-900">הצג QR או שלח לינק</p>
                      <p className="text-sm text-purple-700">לאחר התשלום הזן את האסמכתא</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>מספר אסמכתא מביט *</Label>
                  <Input
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="הזן את מספר האסמכתא"
                    dir="ltr"
                    className="text-center"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1">
                ביטול
              </Button>
              <Button
                type="submit"
                className="flex-1 btn-primary-gradient"
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
                    קבל תשלום והנפק קבלה
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
