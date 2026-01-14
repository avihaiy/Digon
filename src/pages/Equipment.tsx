import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Package,
  Plus,
  Search,
  Loader2,
  Calendar as CalendarIcon,
  User,
  ArrowLeftRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { formatShortDate, getHebrewDate } from '@/lib/hebrew-utils';

// Category labels in Hebrew
const CATEGORY_LABELS = {
  hall: 'אולם בית כנסת',
  furniture: 'ריהוט',
  books: 'ספרים',
  events: 'ציוד לאירועים',
  other: 'אחר',
} as const;

// Status labels in Hebrew
const EQUIPMENT_STATUS_LABELS = {
  available: 'זמין',
  loaned: 'מושאל',
  maintenance: 'בתחזוקה',
  retired: 'לא פעיל',
} as const;

const LOAN_STATUS_LABELS = {
  active: 'פעיל',
  returned: 'הוחזר',
  overdue: 'באיחור',
} as const;

export default function Equipment() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('equipment');
  const [equipmentDialogOpen, setEquipmentDialogOpen] = useState(false);
  const [loanDialogOpen, setLoanDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [expectedReturnDate, setExpectedReturnDate] = useState<Date | undefined>();

  // Equipment form state
  const [equipmentForm, setEquipmentForm] = useState({
    name: '',
    description: '',
    category: 'hall' as string,
    quantity: '1',
    notes: '',
  });

  // Loan form state
  const [loanForm, setLoanForm] = useState({
    equipment_id: '',
    member_id: '',
    quantity: '1',
    purpose: '',
    notes: '',
  });

  // Fetch equipment
  const { data: equipment, isLoading: equipmentLoading } = useQuery({
    queryKey: ['equipment', searchQuery],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch active loans
  const { data: loans, isLoading: loansLoading } = useQuery({
    queryKey: ['equipment-loans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_loans')
        .select(`
          *,
          equipment:equipment(name, category),
          member:members(full_name, phone)
        `)
        .order('loan_date', { ascending: false });
      
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

  // Create equipment
  const createEquipment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('equipment').insert({
        name: equipmentForm.name,
        description: equipmentForm.description || null,
        category: equipmentForm.category as any,
        quantity: Number(equipmentForm.quantity),
        available_quantity: Number(equipmentForm.quantity),
        notes: equipmentForm.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('הציוד נוסף בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      setEquipmentDialogOpen(false);
      setEquipmentForm({ name: '', description: '', category: 'hall', quantity: '1', notes: '' });
    },
    onError: (error) => {
      toast.error('שגיאה בהוספת הציוד', { description: error.message });
    },
  });

  // Create loan
  const createLoan = useMutation({
    mutationFn: async () => {
      // Create the loan
      const { error: loanError } = await supabase.from('equipment_loans').insert({
        equipment_id: loanForm.equipment_id,
        member_id: loanForm.member_id,
        quantity: Number(loanForm.quantity),
        expected_return_date: expectedReturnDate?.toISOString().split('T')[0] || null,
        purpose: loanForm.purpose || null,
        notes: loanForm.notes || null,
        status: 'active',
      });
      if (loanError) throw loanError;

      // Update equipment available quantity
      const equipmentItem = equipment?.find(e => e.id === loanForm.equipment_id);
      if (equipmentItem) {
        const newAvailable = equipmentItem.available_quantity - Number(loanForm.quantity);
        const { error: updateError } = await supabase
          .from('equipment')
          .update({ 
            available_quantity: newAvailable,
            status: newAvailable <= 0 ? 'loaned' : 'available',
          })
          .eq('id', loanForm.equipment_id);
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      toast.success('ההשאלה נרשמה בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-loans'] });
      setLoanDialogOpen(false);
      setLoanForm({ equipment_id: '', member_id: '', quantity: '1', purpose: '', notes: '' });
      setExpectedReturnDate(undefined);
    },
    onError: (error) => {
      toast.error('שגיאה ברישום ההשאלה', { description: error.message });
    },
  });

  // Return loan
  const returnLoan = useMutation({
    mutationFn: async (loan: any) => {
      // Update the loan
      const { error: loanError } = await supabase
        .from('equipment_loans')
        .update({ 
          status: 'returned',
          actual_return_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', loan.id);
      if (loanError) throw loanError;

      // Update equipment available quantity
      const equipmentItem = equipment?.find(e => e.id === loan.equipment_id);
      if (equipmentItem) {
        const newAvailable = equipmentItem.available_quantity + loan.quantity;
        const { error: updateError } = await supabase
          .from('equipment')
          .update({ 
            available_quantity: newAvailable,
            status: 'available',
          })
          .eq('id', loan.equipment_id);
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      toast.success('ההחזרה נרשמה בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      queryClient.invalidateQueries({ queryKey: ['equipment-loans'] });
      setReturnDialogOpen(false);
      setSelectedLoan(null);
    },
    onError: (error) => {
      toast.error('שגיאה ברישום ההחזרה', { description: error.message });
    },
  });

  // Filter equipment
  const filteredEquipment = equipment?.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter loans
  const activeLoans = loans?.filter(l => l.status === 'active') || [];
  const overdueLoans = activeLoans.filter(l => {
    if (!l.expected_return_date) return false;
    return new Date(l.expected_return_date) < new Date();
  });

  // Stats
  const totalEquipment = equipment?.length || 0;
  const availableEquipment = equipment?.filter(e => e.status === 'available').length || 0;

  const handleEquipmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentForm.name) {
      toast.error('יש להזין שם לציוד');
      return;
    }
    createEquipment.mutate();
  };

  const handleLoanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanForm.equipment_id || !loanForm.member_id) {
      toast.error('יש לבחור ציוד וחבר');
      return;
    }
    createLoan.mutate();
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            גמ"ח וציוד
          </h1>
          <p className="text-muted-foreground">
            {totalEquipment} פריטים • {availableEquipment} זמינים • {activeLoans.length} השאלות פעילות
            {overdueLoans.length > 0 && (
              <span className="text-destructive"> • {overdueLoans.length} באיחור</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setLoanDialogOpen(true)} variant="outline" className="gap-2">
            <ArrowLeftRight className="w-4 h-4" />
            השאלה חדשה
          </Button>
          <Button onClick={() => setEquipmentDialogOpen(true)} className="btn-primary-gradient gap-2">
            <Plus className="w-4 h-4" />
            הוסף ציוד
          </Button>
        </div>
      </div>

      {/* Overdue Alert */}
      {overdueLoans.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="w-6 h-6 text-destructive" />
          <div>
            <p className="font-medium">השאלות באיחור</p>
            <p className="text-sm text-muted-foreground">
              יש {overdueLoans.length} השאלות שטרם הוחזרו במועד
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="חיפוש ציוד..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="equipment" className="gap-2">
            <Package className="w-4 h-4" />
            רשימת ציוד
          </TabsTrigger>
          <TabsTrigger value="loans" className="gap-2">
            <ArrowLeftRight className="w-4 h-4" />
            השאלות
            {activeLoans.length > 0 && (
              <Badge variant="secondary" className="mr-1">
                {activeLoans.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Equipment Tab */}
        <TabsContent value="equipment">
          <Card className="glass-card">
            <CardContent className="p-0">
              {equipmentLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredEquipment?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">אין ציוד להצגה</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setEquipmentDialogOpen(true)}
                  >
                    הוסף ציוד ראשון
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredEquipment?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 table-row-hover"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          item.status === 'available' 
                            ? 'bg-success/10 text-success' 
                            : item.status === 'loaned'
                            ? 'bg-warning/10 text-warning'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          <Package className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {CATEGORY_LABELS[item.category as keyof typeof CATEGORY_LABELS]}
                            </Badge>
                            {item.description && <span>• {item.description}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <p className="text-sm text-muted-foreground">זמין</p>
                          <p className="font-bold">
                            {item.available_quantity} / {item.quantity}
                          </p>
                        </div>
                        <Badge
                          className={
                            item.status === 'available'
                              ? 'status-paid'
                              : item.status === 'loaned'
                              ? 'status-pending'
                              : 'bg-muted'
                          }
                        >
                          {EQUIPMENT_STATUS_LABELS[item.status as keyof typeof EQUIPMENT_STATUS_LABELS]}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Loans Tab */}
        <TabsContent value="loans">
          <Card className="glass-card">
            <CardContent className="p-0">
              {loansLoading ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : loans?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ArrowLeftRight className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">אין השאלות</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {loans?.map((loan) => {
                    const isOverdue = loan.status === 'active' && 
                      loan.expected_return_date && 
                      new Date(loan.expected_return_date) < new Date();
                    
                    return (
                      <div
                        key={loan.id}
                        className={`flex items-center justify-between p-4 table-row-hover ${
                          isOverdue ? 'bg-destructive/5' : ''
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            loan.status === 'returned'
                              ? 'bg-success/10 text-success'
                              : isOverdue
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-warning/10 text-warning'
                          }`}>
                            {loan.status === 'returned' ? (
                              <CheckCircle2 className="w-6 h-6" />
                            ) : isOverdue ? (
                              <AlertTriangle className="w-6 h-6" />
                            ) : (
                              <Clock className="w-6 h-6" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{loan.equipment?.name}</p>
                              {loan.quantity > 1 && (
                                <Badge variant="secondary">x{loan.quantity}</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="w-3 h-3" />
                              <span>{loan.member?.full_name}</span>
                              <span>•</span>
                              <span>{formatShortDate(loan.loan_date)} ({getHebrewDate(new Date(loan.loan_date))})</span>
                              {loan.purpose && (
                                <>
                                  <span>•</span>
                                  <span>{loan.purpose}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {loan.expected_return_date && (
                            <div className="text-left">
                              <p className="text-xs text-muted-foreground">תאריך החזרה</p>
                              <p className={`text-sm font-medium ${isOverdue ? 'text-destructive' : ''}`}>
                                {formatShortDate(loan.expected_return_date)}
                              </p>
                            </div>
                          )}
                          <Badge
                            className={
                              loan.status === 'returned'
                                ? 'status-paid'
                                : isOverdue
                                ? 'bg-destructive text-destructive-foreground'
                                : 'status-pending'
                            }
                          >
                            {isOverdue ? 'באיחור' : LOAN_STATUS_LABELS[loan.status as keyof typeof LOAN_STATUS_LABELS]}
                          </Badge>
                          {loan.status === 'active' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedLoan(loan);
                                setReturnDialogOpen(true);
                              }}
                            >
                              <CheckCircle2 className="w-4 h-4 ml-1" />
                              החזר
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Equipment Dialog */}
      <Dialog open={equipmentDialogOpen} onOpenChange={setEquipmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              הוספת ציוד חדש
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEquipmentSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>שם הציוד *</Label>
              <Input
                value={equipmentForm.name}
                onChange={(e) => setEquipmentForm({ ...equipmentForm, name: e.target.value })}
                placeholder="לדוגמה: אולם בית הכנסת"
              />
            </div>

            <div className="space-y-2">
              <Label>קטגוריה</Label>
              <Select
                value={equipmentForm.category}
                onValueChange={(value) => setEquipmentForm({ ...equipmentForm, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>תיאור</Label>
              <Input
                value={equipmentForm.description}
                onChange={(e) => setEquipmentForm({ ...equipmentForm, description: e.target.value })}
                placeholder="תיאור קצר (אופציונלי)"
              />
            </div>

            <div className="space-y-2">
              <Label>כמות</Label>
              <Input
                type="number"
                min="1"
                value={equipmentForm.quantity}
                onChange={(e) => setEquipmentForm({ ...equipmentForm, quantity: e.target.value })}
                dir="ltr"
                className="text-left"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEquipmentDialogOpen(false)}
                className="flex-1"
              >
                ביטול
              </Button>
              <Button
                type="submit"
                className="flex-1 btn-primary-gradient"
                disabled={createEquipment.isPending}
              >
                {createEquipment.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'הוסף ציוד'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* New Loan Dialog */}
      <Dialog open={loanDialogOpen} onOpenChange={setLoanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5" />
              השאלה חדשה
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleLoanSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>ציוד *</Label>
              <Select
                value={loanForm.equipment_id}
                onValueChange={(value) => setLoanForm({ ...loanForm, equipment_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר ציוד" />
                </SelectTrigger>
                <SelectContent>
                  {equipment?.filter(e => e.available_quantity > 0).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} ({item.available_quantity} זמינים)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>שואל *</Label>
              <Select
                value={loanForm.member_id}
                onValueChange={(value) => setLoanForm({ ...loanForm, member_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר חבר" />
                </SelectTrigger>
                <SelectContent>
                  {members?.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>כמות</Label>
              <Input
                type="number"
                min="1"
                value={loanForm.quantity}
                onChange={(e) => setLoanForm({ ...loanForm, quantity: e.target.value })}
                dir="ltr"
                className="text-left"
              />
            </div>

            <div className="space-y-2">
              <Label>תאריך החזרה צפוי</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    {expectedReturnDate
                      ? format(expectedReturnDate, 'dd/MM/yyyy', { locale: he })
                      : 'בחר תאריך'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expectedReturnDate}
                    onSelect={setExpectedReturnDate}
                    locale={he}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>מטרה</Label>
              <Input
                value={loanForm.purpose}
                onChange={(e) => setLoanForm({ ...loanForm, purpose: e.target.value })}
                placeholder="לדוגמה: שבע ברכות"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLoanDialogOpen(false)}
                className="flex-1"
              >
                ביטול
              </Button>
              <Button
                type="submit"
                className="flex-1 btn-primary-gradient"
                disabled={createLoan.isPending}
              >
                {createLoan.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'רשום השאלה'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              אישור החזרה
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-secondary">
              <p className="font-medium">{selectedLoan?.equipment?.name}</p>
              <p className="text-sm text-muted-foreground">
                שואל: {selectedLoan?.member?.full_name}
              </p>
              <p className="text-sm text-muted-foreground">
                תאריך השאלה: {selectedLoan && formatShortDate(selectedLoan.loan_date)}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setReturnDialogOpen(false)}
                className="flex-1"
              >
                ביטול
              </Button>
              <Button
                onClick={() => returnLoan.mutate(selectedLoan)}
                className="flex-1 btn-primary-gradient"
                disabled={returnLoan.isPending}
              >
                {returnLoan.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                    אשר החזרה
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
