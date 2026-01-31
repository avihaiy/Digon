import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  Filter,
  TrendingUp,
  AlertCircle,
  Receipt,
  Edit,
  Trash2,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  formatCurrency,
  formatShortDate,
  getHebrewDate,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  getCurrentParasha,
  PARASHA_LIST,
  HOLIDAY_LIST,
  OCCASION_TYPES,
  ALIYA_TYPES,
  type OccasionType,
} from '@/lib/hebrew-utils';

type FilterType = 'all' | 'pending' | 'confirmed' | 'bit' | 'cash' | 'this_month';

export default function Payments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bit' | 'cash'>('cash');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  const [occasionType, setOccasionType] = useState<OccasionType>('parasha');

  const [formData, setFormData] = useState({
    member_id: '',
    amount: '',
    reference: '',
    notes: '',
    occasion: getCurrentParasha(),
    aliya_id: '',
  });

  // Fetch payments
  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          member:members(full_name),
          receipt:receipts(receipt_number)
        `)
        .order('created_at', { ascending: false });

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

  // Fetch unpaid aliyot for linking
  const { data: unpaidAliyot } = useQuery({
    queryKey: ['unpaid-aliyot'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aliyot')
        .select(`
          *,
          member:members(id, full_name)
        `)
        .in('status', ['pending', 'waived'])
        .order('shabbat_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Create/Update payment
  const savePayment = useMutation({
    mutationFn: async () => {
      if (editingPayment) {
        // Update existing payment
        const { error } = await supabase
          .from('payments')
          .update({
            member_id: formData.member_id,
            amount: Number(formData.amount),
            method: paymentMethod,
            reference: paymentMethod === 'bit' ? formData.reference : null,
            notes: formData.notes || null,
          })
          .eq('id', editingPayment.id);
        if (error) throw error;
        
        // Update related receipt if exists
        const { error: receiptError } = await supabase
          .from('receipts')
          .update({ 
            member_id: formData.member_id,
            total_amount: Number(formData.amount) 
          })
          .eq('payment_id', editingPayment.id);
        
        if (receiptError) console.warn('Could not update receipt:', receiptError);
        return editingPayment;
      } else {
        // Create new payment
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
            aliya_id: formData.aliya_id || null,
          })
          .select()
          .single();

        if (paymentError) throw paymentError;

        // Get aliya details for receipt description
        let receiptDescription = occasionType === 'parasha' 
          ? `תשלום - פרשת ${formData.occasion}` 
          : `תשלום - ${formData.occasion}`;
        
        if (formData.aliya_id) {
          const selectedAliya = unpaidAliyot?.find((a: any) => a.id === formData.aliya_id);
          if (selectedAliya) {
            const aliyaTypeName = ALIYA_TYPES[selectedAliya.aliya_type as keyof typeof ALIYA_TYPES] || selectedAliya.aliya_type;
            receiptDescription = `תשלום עלייה - ${aliyaTypeName} - פרשת ${selectedAliya.parasha}`;
          }
        }

        const { data: receiptData, error: receiptError } = await supabase.from('receipts').insert({
          member_id: formData.member_id,
          payment_id: payment.id,
          total_amount: Number(formData.amount),
          description: receiptDescription,
        }).select().single();

        if (receiptError) throw receiptError;

        // Update aliya status to paid if linked
        if (formData.aliya_id) {
          await supabase
            .from('aliyot')
            .update({ status: 'paid' })
            .eq('id', formData.aliya_id);
        }

        // Send receipt via email
        if (receiptData) {
          try {
            await supabase.functions.invoke('send-receipt-email', {
              body: { receiptId: receiptData.id }
            });
          } catch (emailError) {
            console.warn('Failed to send receipt email:', emailError);
          }
        }

        return payment;
      }
    },
    onSuccess: () => {
      toast.success(editingPayment ? 'התשלום עודכן בהצלחה' : 'התשלום נקלט והקבלה הונפקה');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['unpaid-aliyot'] });
      queryClient.invalidateQueries({ queryKey: ['aliyot'] });
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error('שגיאה בשמירת התשלום', { description: error.message });
    },
  });

  // Delete payment
  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      // First delete related receipts
      await supabase.from('receipts').delete().eq('payment_id', id);
      // Then delete the payment
      const { error } = await supabase.from('payments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('התשלום נמחק בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      setDeletePaymentId(null);
    },
    onError: (error) => {
      toast.error('שגיאה במחיקת התשלום', { description: error.message });
    },
  });

  // Confirm single payment
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

  // Bulk confirm payments
  const bulkConfirmPayments = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'confirmed' })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${selectedPayments.size} תשלומים אושרו בהצלחה`);
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setSelectedPayments(new Set());
    },
    onError: (error) => {
      toast.error('שגיאה באישור התשלומים', { description: error.message });
    },
  });

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPayment(null);
    setFormData({ member_id: '', amount: '', reference: '', notes: '', occasion: getCurrentParasha(), aliya_id: '' });
    setPaymentMethod('cash');
    setOccasionType('parasha');
  };

  const handleEditPayment = (payment: any) => {
    setEditingPayment(payment);
    setFormData({
      member_id: payment.member_id,
      amount: String(payment.amount),
      reference: payment.reference || '',
      notes: payment.notes || '',
      occasion: getCurrentParasha(),
      aliya_id: payment.aliya_id || '',
    });
    setPaymentMethod(payment.method);
    setOccasionType('parasha');
    setDialogOpen(true);
  };

  // Handle aliya selection - auto-fill member and amount
  const handleAliyaSelect = (aliyaId: string) => {
    if (!aliyaId) {
      setFormData({ ...formData, aliya_id: '' });
      return;
    }
    
    const selectedAliya = unpaidAliyot?.find((a: any) => a.id === aliyaId);
    if (selectedAliya) {
      setFormData({
        ...formData,
        aliya_id: aliyaId,
        member_id: selectedAliya.member?.id || formData.member_id,
        amount: selectedAliya.price ? String(selectedAliya.price) : formData.amount,
        occasion: selectedAliya.parasha || formData.occasion,
      });
      setOccasionType('parasha');
    }
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
    savePayment.mutate();
  };

  const togglePaymentSelection = (paymentId: string) => {
    const newSelected = new Set(selectedPayments);
    if (newSelected.has(paymentId)) {
      newSelected.delete(paymentId);
    } else {
      newSelected.add(paymentId);
    }
    setSelectedPayments(newSelected);
  };

  const selectAllPending = () => {
    const pendingIds = payments?.filter(p => p.status === 'pending').map(p => p.id) || [];
    setSelectedPayments(new Set(pendingIds));
  };

  const handleBulkConfirm = () => {
    const pendingSelected = Array.from(selectedPayments).filter(id => 
      payments?.find(p => p.id === id && p.status === 'pending')
    );
    if (pendingSelected.length === 0) {
      toast.error('אין תשלומים ממתינים שנבחרו');
      return;
    }
    bulkConfirmPayments.mutate(pendingSelected);
  };

  // Filter payments
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const filteredPayments = payments?.filter((p: any) => {
    // Search filter
    if (searchQuery && !p.member?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Quick filters
    switch (activeFilter) {
      case 'pending':
        return p.status === 'pending';
      case 'confirmed':
        return p.status === 'confirmed';
      case 'bit':
        return p.method === 'bit';
      case 'cash':
        return p.method === 'cash';
      case 'this_month':
        return new Date(p.created_at) >= startOfMonth;
      default:
        return true;
    }
  });

  // Stats
  const totalConfirmed = payments?.filter((p: any) => p.status === 'confirmed')
    .reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
  const pendingCount = payments?.filter((p: any) => p.status === 'pending').length || 0;
  const pendingAmount = payments?.filter((p: any) => p.status === 'pending')
    .reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
  const thisMonthAmount = payments?.filter((p: any) => new Date(p.created_at) >= startOfMonth && p.status === 'confirmed')
    .reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
  const bitTotal = payments?.filter((p: any) => p.method === 'bit' && p.status === 'confirmed')
    .reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
  const cashTotal = payments?.filter((p: any) => p.method === 'cash' && p.status === 'confirmed')
    .reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;

  const quickFilters: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all', label: 'הכל' },
    { key: 'pending', label: 'ממתינים', count: pendingCount },
    { key: 'confirmed', label: 'אושרו' },
    { key: 'this_month', label: 'החודש' },
    { key: 'bit', label: 'ביט' },
    { key: 'cash', label: 'מזומן' },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header with Enhanced Stats */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CreditCard className="w-6 h-6" />
              ניהול תשלומים
            </h1>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="btn-primary-gradient gap-2">
            <Plus className="w-4 h-4" />
            קבל תשלום
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">סה״כ הכנסות</p>
                  <p className="text-lg font-bold hebrew-number">{formatCurrency(totalConfirmed)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">הכנסות החודש</p>
                  <p className="text-lg font-bold hebrew-number">{formatCurrency(thisMonthAmount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">חובות שטרם נגבו</p>
                  <p className="text-lg font-bold hebrew-number">{formatCurrency(pendingAmount)}</p>
                  {pendingCount > 0 && (
                    <p className="text-xs text-muted-foreground">{pendingCount} תשלומים</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-purple-600" />
                    <span className="text-muted-foreground">ביט:</span>
                    <span className="font-bold hebrew-number">{formatCurrency(bitTotal)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-green-600" />
                    <span className="text-muted-foreground">מזומן:</span>
                    <span className="font-bold hebrew-number">{formatCurrency(cashTotal)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search and Quick Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם חבר..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        
        {/* Quick Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {quickFilters.map((filter) => (
            <Button
              key={filter.key}
              variant={activeFilter === filter.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter(filter.key)}
              className="gap-1"
            >
              {filter.label}
              {filter.count !== undefined && filter.count > 0 && (
                <Badge variant="secondary" className="mr-1 h-5 px-1.5 text-xs">
                  {filter.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedPayments.size > 0 && (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
          <span className="font-medium">{selectedPayments.size} תשלומים נבחרו</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleBulkConfirm}
              disabled={bulkConfirmPayments.isPending}
              className="gap-1"
            >
              {bulkConfirmPayments.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              אשר נבחרים
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedPayments(new Set())}
            >
              בטל בחירה
            </Button>
          </div>
        </div>
      )}

      {/* Select All Pending */}
      {pendingCount > 0 && selectedPayments.size === 0 && (
        <Button variant="outline" size="sm" onClick={selectAllPending} className="gap-2">
          <Checkbox className="w-4 h-4" />
          בחר את כל הממתינים ({pendingCount})
        </Button>
      )}

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
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 table-row-hover"
                >
                  {/* Top row on mobile: checkbox + member info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Checkbox for pending payments */}
                    {payment.status === 'pending' && (
                      <Checkbox
                        checked={selectedPayments.has(payment.id)}
                        onCheckedChange={() => togglePaymentSelection(payment.id)}
                        className="shrink-0"
                      />
                    )}
                    
                    <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${
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
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{payment.member?.full_name}</p>
                      <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                        <span>{formatShortDate(payment.created_at)}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">{PAYMENT_METHOD[payment.method as keyof typeof PAYMENT_METHOD]}</span>
                        {payment.reference && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline">אסמכתא: {payment.reference}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Bottom row on mobile: amount + badges + actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 mr-0 sm:mr-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base sm:text-lg font-bold hebrew-number">
                        {formatCurrency(Number(payment.amount))}
                      </span>
                      <Badge
                        className={`text-xs ${
                          payment.status === 'confirmed'
                            ? 'status-paid'
                            : 'status-pending'
                        }`}
                      >
                        <span className="hidden sm:inline-flex items-center">
                          {payment.status === 'confirmed' ? (
                            <CheckCircle2 className="w-3 h-3 ml-1" />
                          ) : (
                            <Clock className="w-3 h-3 ml-1" />
                          )}
                        </span>
                        {PAYMENT_STATUS[payment.status as keyof typeof PAYMENT_STATUS]}
                      </Badge>
                      {payment.receipt?.[0]?.receipt_number && (
                        <Badge variant="outline" className="hidden sm:inline-flex text-xs">
                          קבלה #{payment.receipt[0].receipt_number}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {payment.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => confirmPayment.mutate(payment.id)}
                          className="h-8 px-2 sm:px-3"
                        >
                          <span className="hidden sm:inline">אשר</span>
                          <CheckCircle2 className="w-4 h-4 sm:hidden" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditPayment(payment)}
                        title="עריכה"
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeletePaymentId(payment.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="מחיקה"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
              {editingPayment ? 'עריכת תשלום' : 'קבלת תשלום חדש'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Link to Aliya (optional) */}
            {!editingPayment && unpaidAliyot && unpaidAliyot.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  קשר לעלייה (אופציונלי)
                </Label>
                <Select
                  value={formData.aliya_id}
                  onValueChange={handleAliyaSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר עלייה לקישור" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="">ללא קישור לעלייה</SelectItem>
                    {unpaidAliyot.map((aliya: any) => (
                      <SelectItem key={aliya.id} value={aliya.id}>
                        <span className="flex items-center gap-2">
                          <span className="font-medium">
                            {ALIYA_TYPES[aliya.aliya_type as keyof typeof ALIYA_TYPES]}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span>{aliya.parasha}</span>
                          {aliya.member?.full_name && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-muted-foreground">{aliya.member.full_name}</span>
                            </>
                          )}
                          {aliya.price > 0 && (
                            <>
                              <span className="text-muted-foreground">•</span>
                              <span className="font-medium">{formatCurrency(aliya.price)}</span>
                            </>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.aliya_id && (
                  <p className="text-xs text-muted-foreground">
                    בחירת עלייה תמלא אוטומטית את החבר, הסכום והפרשה
                  </p>
                )}
              </div>
            )}

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

            {/* Occasion Type Selection */}
            <div className="space-y-2">
              <Label>סוג אירוע</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOccasionType('parasha');
                    setFormData({ ...formData, occasion: getCurrentParasha() });
                  }}
                  className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                    occasionType === 'parasha'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  פרשה
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOccasionType('holiday');
                    setFormData({ ...formData, occasion: HOLIDAY_LIST[0] });
                  }}
                  className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                    occasionType === 'holiday'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  חג / אירוע
                </button>
              </div>
            </div>

            {/* Parasha or Holiday Selection */}
            <div className="space-y-2">
              <Label>{occasionType === 'parasha' ? 'פרשה לקבלה' : 'חג / אירוע לקבלה'}</Label>
              <Select
                value={formData.occasion}
                onValueChange={(value) => setFormData({ ...formData, occasion: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={occasionType === 'parasha' ? 'בחר פרשה' : 'בחר חג / אירוע'} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {occasionType === 'parasha' 
                    ? PARASHA_LIST.map((parasha) => (
                        <SelectItem key={parasha} value={parasha}>
                          {parasha}
                        </SelectItem>
                      ))
                    : HOLIDAY_LIST.map((holiday) => (
                        <SelectItem key={holiday} value={holiday}>
                          {holiday}
                        </SelectItem>
                      ))
                  }
                </SelectContent>
              </Select>
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
                disabled={savePayment.isPending}
              >
                {savePayment.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    מעבד...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                    {editingPayment ? 'עדכן תשלום' : 'קבל תשלום והנפק קבלה'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePaymentId} onOpenChange={(open) => !open && setDeletePaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת תשלום</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק תשלום זה? פעולה זו תמחק גם את הקבלה המשויכת ולא ניתן לבטלה.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletePaymentId && deletePayment.mutate(deletePaymentId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletePayment.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'מחק'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
