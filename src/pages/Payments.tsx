import { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReceiptPreviewDialog } from "@/components/ReceiptPreviewDialog";
import { DeleteCodeDialog } from "@/components/DeleteCodeDialog";
import { silentPrintReceipt } from "@/lib/thermal-print";
import { remotePrintReceipt } from "@/lib/remote-print";
import { shareReceiptWithPdf, shareReceipt, shareViaWhatsApp } from "@/lib/receipt-share";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
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
  Building2,
  FileCheck,
  Share2,
  MessageCircle,
} from "lucide-react";
import { toast } from "sonner";
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
  type OccasionType,
} from "@/lib/hebrew-utils";

type FilterType = "all" | "pending" | "confirmed" | "bit" | "cash" | "check" | "bank_transfer" | "this_month";
type PaymentCategory = "regular" | "hall";
type HallEventType = "simcha" | "azkara";

export default function Payments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"bit" | "cash" | "check" | "bank_transfer">("cash");
  const [receiptPreviewData, setReceiptPreviewData] = useState<any>(null);
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  const [occasionType, setOccasionType] = useState<OccasionType>("parasha");
  const [paymentCategory, setPaymentCategory] = useState<PaymentCategory>("regular");
  const [hallEventType, setHallEventType] = useState<HallEventType>("simcha");
  const [totalInstallments, setTotalInstallments] = useState("1");
  const [installmentNumber, setInstallmentNumber] = useState("1");
  const [installmentTotalAmount, setInstallmentTotalAmount] = useState("");
  const [memberComboOpen, setMemberComboOpen] = useState(false);
  const [useCustomName, setUseCustomName] = useState(false);
  const [customName, setCustomName] = useState("");
  const [debtsDialogOpen, setDebtsDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    member_id: "",
    amount: "",
    reference: "",
    notes: "",
    occasion: getCurrentParasha(),
  });

  // Fetch payments
  const { data: payments, isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(
          `
          *,
          member:members(full_name, phone),
          receipt:receipts(receipt_number)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch members for dropdown
  const { data: members } = useQuery({
    queryKey: ["members-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name")
        .eq("active", true)
        .order("full_name");

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch outstanding member debts
  const { data: memberDebts } = useQuery({
    queryKey: ["member-debts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_charges")
        .select("member_id, remaining_balance, description, member:members(full_name)")
        .gt("remaining_balance", 0);

      if (error) throw error;

      // Group by member
      const grouped: Record<string, { full_name: string; total: number; charges: { description: string | null; amount: number }[] }> = {};
      for (const row of data || []) {
        const mid = row.member_id;
        if (!grouped[mid]) {
          grouped[mid] = {
            full_name: (row.member as any)?.full_name || "לא ידוע",
            total: 0,
            charges: [],
          };
        }
        grouped[mid].total += Number(row.remaining_balance);
        grouped[mid].charges.push({ description: row.description, amount: Number(row.remaining_balance) });
      }

      return Object.values(grouped).sort((a, b) => b.total - a.total);
    },
  });

  const totalMemberDebts = memberDebts?.reduce((sum, m) => sum + m.total, 0) || 0;
  const debtMemberCount = memberDebts?.length || 0;

  // Realtime: auto-refresh debts when member_charges changes
  useEffect(() => {
    const channel = supabase
      .channel('member-charges-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'member_charges' }, () => {
        queryClient.invalidateQueries({ queryKey: ["member-debts"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Create/Update payment
  const savePayment = useMutation({
    mutationFn: async () => {
      if (editingPayment) {
        // Update existing payment
        const { error } = await supabase
          .from("payments")
          .update({
            member_id: formData.member_id,
            amount: Number(formData.amount),
            method: paymentMethod,
            reference:
              paymentMethod === "bit" || paymentMethod === "check" || paymentMethod === "bank_transfer"
                ? formData.reference
                : null,
            notes: formData.notes || null,
          })
          .eq("id", editingPayment.id);
        if (error) throw error;

        // Update related receipt if exists
        const { error: receiptError } = await supabase
          .from("receipts")
          .update({
            member_id: formData.member_id,
            total_amount: Number(formData.amount),
          })
          .eq("payment_id", editingPayment.id);

        if (receiptError) console.warn("Could not update receipt:", receiptError);
        return editingPayment;
      } else {
        // Create new payment
        const isHall = paymentCategory === "hall";
        const groupId = isHall ? crypto.randomUUID() : null;

        const { data: payment, error: paymentError } = await supabase
          .from("payments")
          .insert({
            member_id: formData.member_id,
            amount: Number(formData.amount),
            method: paymentMethod,
            reference:
              paymentMethod === "bit" || paymentMethod === "check" || paymentMethod === "bank_transfer"
                ? formData.reference
                : null,
            received_by: user?.id,
            status: "confirmed",
            notes: formData.notes || null,
            aliya_id: null,
            payment_type: isHall ? "hall" : "donation",
            hall_event_type: isHall ? hallEventType : null,
            total_installments: isHall ? Number(totalInstallments) : null,
            installment_number: isHall ? Number(installmentNumber) : null,
            installment_total_amount: isHall ? Number(installmentTotalAmount || formData.amount) : null,
            installment_group_id: groupId,
          } as any)
          .select()
          .single();

        if (paymentError) throw paymentError;

        // Get aliya details for receipt description
        let receiptDescription = "";
        if (paymentCategory === "hall") {
          const eventLabel = hallEventType === "simcha" ? "שמחה" : "אזכרה";
          receiptDescription = `תשלום אולם - ${eventLabel} — תשלום ${installmentNumber} מתוך ${totalInstallments}`;
        } else if (occasionType === "parasha") {
          receiptDescription = `תשלום - פרשת ${formData.occasion}`;
        } else {
          receiptDescription = `תשלום - ${formData.occasion}`;
        }

        const { data: receiptData, error: receiptError } = await supabase
          .from("receipts")
          .insert({
            member_id: formData.member_id,
            payment_id: payment.id,
            total_amount: Number(formData.amount),
            description: receiptDescription,
          })
          .select()
          .single();

        if (receiptError) throw receiptError;

        // Send receipt via email
        if (receiptData) {
          try {
            await supabase.functions.invoke("send-receipt-email", {
              body: { receiptId: receiptData.id },
            });
          } catch (emailError) {
            console.warn("Failed to send receipt email:", emailError);
          }
        }

        return payment;
      }
    },
    onSuccess: async (payment) => {
      toast.success(editingPayment ? "התשלום עודכן בהצלחה" : "התשלום נקלט והקבלה הונפקה");
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      handleCloseDialog();

      // Auto-print receipt for new payments
      if (!editingPayment && payment?.id) {
        try {
          const { data: receipt } = await supabase
            .from("receipts")
            .select("*, member:members(full_name, phone), payment:payments(method, reference)")
            .eq("payment_id", payment.id)
            .single();
          if (receipt) {
            // Silent auto-print immediately (local)
            silentPrintReceipt(receipt).catch((err) => console.warn("Auto-print failed:", err));
            // Also remote print via PrintNode
            remotePrintReceipt(receipt).catch((err) => console.warn("Remote auto-print failed:", err));
            // Also store for manual re-print
            setReceiptPreviewData(receipt);
            setReceiptPreviewOpen(true);
          }
        } catch (e) {
          console.warn("Could not load receipt for printing:", e);
        }
      }
    },
    onError: (error) => {
      toast.error("שגיאה בשמירת התשלום", { description: error.message });
    },
  });

  // Delete payment
  const deletePayment = useMutation({
    mutationFn: async (id: string) => {
      // First delete related receipts
      await supabase.from("receipts").delete().eq("payment_id", id);
      // Then delete the payment
      const { error } = await supabase.from("payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("התשלום נמחק בהצלחה");
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      setDeletePaymentId(null);
    },
    onError: (error) => {
      toast.error("שגיאה במחיקת התשלום", { description: error.message });
    },
  });

  // Confirm single payment
  const confirmPayment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payments").update({ status: "confirmed" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("התשלום אושר");
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });

  // Bulk confirm payments
  const bulkConfirmPayments = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("payments").update({ status: "confirmed" }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${selectedPayments.size} תשלומים אושרו בהצלחה`);
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      setSelectedPayments(new Set());
    },
    onError: (error) => {
      toast.error("שגיאה באישור התשלומים", { description: error.message });
    },
  });

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingPayment(null);
    setFormData({ member_id: "", amount: "", reference: "", notes: "", occasion: getCurrentParasha() });
    setPaymentMethod("cash");
    setOccasionType("parasha");
    setPaymentCategory("regular");
    setHallEventType("simcha");
    setTotalInstallments("1");
    setInstallmentNumber("1");
    setInstallmentTotalAmount("");
    setUseCustomName(false);
    setCustomName("");
  };

  const handleEditPayment = (payment: any) => {
    setEditingPayment(payment);
    setFormData({
      member_id: payment.member_id,
      amount: String(payment.amount),
      reference: payment.reference || "",
      notes: payment.notes || "",
      occasion: getCurrentParasha(),
    });
    setPaymentMethod(payment.method);
    setOccasionType("parasha");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If using custom name for hall, create a member first
    if (useCustomName) {
      if (!customName.trim()) {
        toast.error("יש להזין שם");
        return;
      }
      if (!formData.amount || Number(formData.amount) <= 0) {
        toast.error("יש להזין סכום תקין");
        return;
      }
      if (paymentMethod === "bit" && !formData.reference) {
        toast.error("יש להזין מספר אסמכתא מביט");
        return;
      }
      if (paymentMethod === "check" && !formData.reference) {
        toast.error("יש להזין מספר צ׳ק");
        return;
      }
      if (paymentMethod === "bank_transfer" && !formData.reference) {
        toast.error("יש להזין מספר אסמכתא להעברה");
        return;
      }

      // Check if member with this name already exists
      const { data: existing } = await supabase
        .from("members")
        .select("id")
        .eq("full_name", customName.trim())
        .maybeSingle();

      if (existing) {
        setFormData((prev) => ({ ...prev, member_id: existing.id }));
        // Wait for state to settle, then submit
        setTimeout(() => savePayment.mutate(), 50);
      } else {
        // Create new member
        const { data: newMember, error } = await supabase
          .from("members")
          .insert({ full_name: customName.trim(), active: false, notes: "נוצר אוטומטית - תשלום" })
          .select("id")
          .single();

        if (error) {
          toast.error("שגיאה ביצירת רשומת לקוח", { description: error.message });
          return;
        }
        setFormData((prev) => ({ ...prev, member_id: newMember.id }));
        setTimeout(() => savePayment.mutate(), 50);
      }
      return;
    }

    if (!formData.member_id) {
      toast.error("יש לבחור חבר");
      return;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      toast.error("יש להזין סכום תקין");
      return;
    }
    if (paymentMethod === "bit" && !formData.reference) {
      toast.error("יש להזין מספר אסמכתא מביט");
      return;
    }
    if (paymentMethod === "check" && !formData.reference) {
      toast.error("יש להזין מספר צ׳ק");
      return;
    }
    if (paymentMethod === "bank_transfer" && !formData.reference) {
      toast.error("יש להזין מספר אסמכתא להעברה");
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
    const pendingIds = payments?.filter((p) => p.status === "pending").map((p) => p.id) || [];
    setSelectedPayments(new Set(pendingIds));
  };

  const handleBulkConfirm = () => {
    const pendingSelected = Array.from(selectedPayments).filter((id) =>
      payments?.find((p) => p.id === id && p.status === "pending"),
    );
    if (pendingSelected.length === 0) {
      toast.error("אין תשלומים ממתינים שנבחרו");
      return;
    }
    bulkConfirmPayments.mutate(pendingSelected);
  };

  const [sharingPaymentId, setSharingPaymentId] = useState<string | null>(null);

  const handleSharePaymentReceipt = useCallback(async (payment: any) => {
    setSharingPaymentId(payment.id);
    try {
      // Fetch the receipt for this payment
      const { data: receipt } = await supabase
        .from("receipts")
        .select("*, member:members(full_name, phone), payment:payments(method, reference)")
        .eq("payment_id", payment.id)
        .single();

      if (!receipt) {
        toast.error("לא נמצאה קבלה לתשלום זה");
        return;
      }

      const result = await shareReceiptWithPdf(receipt);
      if (result === "shared_with_file") toast.success("הקבלה שותפה בהצלחה");
      else if (result === "shared_with_file_clipboard") toast.success("הקבלה שותפה! הטקסט הועתק - הדבק בצ׳אט");
      else if (result === "whatsapp_with_download") toast.success("הקבלה הורדה ונשלחה לווצאפ");
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        console.error("Share error:", error);
        toast.error("שגיאה בשיתוף הקבלה");
      }
    } finally {
      setSharingPaymentId(null);
    }
  }, []);

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
      case "pending":
        return p.status === "pending";
      case "confirmed":
        return p.status === "confirmed";
      case "bit":
        return p.method === "bit";
      case "cash":
        return p.method === "cash";
      case "check":
        return p.method === "check";
      case "bank_transfer":
        return p.method === "bank_transfer";
      case "this_month":
        return new Date(p.created_at) >= startOfMonth;
      default:
        return true;
    }
  });

  // Stats
  const totalConfirmed =
    payments?.filter((p: any) => p.status === "confirmed").reduce((sum: number, p: any) => sum + Number(p.amount), 0) ||
    0;
  const pendingCount = payments?.filter((p: any) => p.status === "pending").length || 0;
  const pendingAmount =
    payments?.filter((p: any) => p.status === "pending").reduce((sum: number, p: any) => sum + Number(p.amount), 0) ||
    0;
  const thisMonthAmount =
    payments
      ?.filter((p: any) => new Date(p.created_at) >= startOfMonth && p.status === "confirmed")
      .reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
  const bitTotal =
    payments
      ?.filter((p: any) => p.method === "bit" && p.status === "confirmed")
      .reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
  const cashTotal =
    payments
      ?.filter((p: any) => p.method === "cash" && p.status === "confirmed")
      .reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
  const checkTotal =
    payments
      ?.filter((p: any) => p.method === "check" && p.status === "confirmed")
      .reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;
  const bankTransferTotal =
    payments
      ?.filter((p: any) => p.method === "bank_transfer" && p.status === "confirmed")
      .reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0;

  const quickFilters: { key: FilterType; label: string; count?: number }[] = [
    { key: "all", label: "הכל" },
    { key: "pending", label: "ממתינים", count: pendingCount },
    { key: "confirmed", label: "אושרו" },
    { key: "this_month", label: "החודש" },
    { key: "bit", label: "ביט" },
    { key: "cash", label: "מזומן" },
    { key: "check", label: "צ׳ק" },
    { key: "bank_transfer", label: "העברה" },
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

          <Card className="glass-card cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDebtsDialogOpen(true)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">חובות שטרם נגבו</p>
                  <p className="text-lg font-bold hebrew-number">{formatCurrency(totalMemberDebts)}</p>
                  {debtMemberCount > 0 && <p className="text-xs text-muted-foreground">{debtMemberCount} חברים</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-green-600" />
                    <span className="text-muted-foreground">מזומן:</span>
                    <span className="font-bold hebrew-number">{formatCurrency(cashTotal)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-purple-600" />
                    <span className="text-muted-foreground">ביט:</span>
                    <span className="font-bold hebrew-number">{formatCurrency(bitTotal)}</span>
                  </div>
                  {checkTotal > 0 && (
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-blue-600" />
                      <span className="text-muted-foreground">צ׳ק:</span>
                      <span className="font-bold hebrew-number">{formatCurrency(checkTotal)}</span>
                    </div>
                  )}
                  {bankTransferTotal > 0 && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-orange-600" />
                      <span className="text-muted-foreground">העברה:</span>
                      <span className="font-bold hebrew-number">{formatCurrency(bankTransferTotal)}</span>
                    </div>
                  )}
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
              variant={activeFilter === filter.key ? "default" : "outline"}
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
            <Button size="sm" onClick={handleBulkConfirm} disabled={bulkConfirmPayments.isPending} className="gap-1">
              {bulkConfirmPayments.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              אשר נבחרים
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelectedPayments(new Set())}>
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
                    {payment.status === "pending" && (
                      <Checkbox
                        checked={selectedPayments.has(payment.id)}
                        onCheckedChange={() => togglePaymentSelection(payment.id)}
                        className="shrink-0"
                      />
                    )}

                    <div
                      className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${
                        payment.method === "bit"
                          ? "bg-purple-100 text-purple-600"
                          : payment.method === "check"
                            ? "bg-blue-100 text-blue-600"
                            : payment.method === "bank_transfer"
                              ? "bg-orange-100 text-orange-600"
                              : "bg-green-100 text-green-600"
                      }`}
                    >
                      {payment.method === "bit" ? (
                        <Smartphone className="w-5 h-5" />
                      ) : payment.method === "check" ? (
                        <FileCheck className="w-5 h-5" />
                      ) : payment.method === "bank_transfer" ? (
                        <Building2 className="w-5 h-5" />
                      ) : (
                        <Banknote className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{payment.member?.full_name}</p>
                      <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground flex-wrap">
                        <span>{formatShortDate(payment.created_at)}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">
                          {PAYMENT_METHOD[payment.method as keyof typeof PAYMENT_METHOD]}
                        </span>
                        {payment.payment_type === "hall" && (
                          <>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs h-5">
                              {(payment as any).hall_event_type === "simcha" ? "🎉 שמחה" : "🕯️ אזכרה"} — אולם
                            </Badge>
                            {(payment as any).total_installments > 1 && (
                              <span className="text-xs">
                                ({(payment as any).installment_number === 1 ? "מקדמה" : "תשלום מלא"})
                              </span>
                            )}
                          </>
                        )}
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
                      <Badge className={`text-xs ${payment.status === "confirmed" ? "status-paid" : "status-pending"}`}>
                        <span className="hidden sm:inline-flex items-center">
                          {payment.status === "confirmed" ? (
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
                      {payment.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => confirmPayment.mutate(payment.id)}
                          className="h-8 px-2 sm:px-3"
                        >
                          <span className="hidden sm:inline">אשר</span>
                          <CheckCircle2 className="w-4 h-4 sm:hidden" />
                        </Button>
                      )}
                      {payment.receipt?.[0]?.receipt_number && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSharePaymentReceipt(payment)}
                            disabled={sharingPaymentId === payment.id}
                            title="שתף לווצאפ"
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                          >
                            {sharingPaymentId === payment.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <MessageCircle className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              const receipt = {
                                receipt_number: payment.receipt?.[0]?.receipt_number,
                                total_amount: payment.amount,
                                created_at: payment.created_at,
                                description: payment.notes || payment.payment_type,
                                member: payment.member,
                                payment: { method: payment.method, reference: payment.reference },
                              };
                              try {
                                const result = await shareReceipt(receipt);
                                if (result === "shared_with_file") toast.success("הקבלה שותפה עם קובץ");
                                else if (result === "shared_with_file_clipboard")
                                  toast.success("הקבלה שותפה! הטקסט הועתק - הדבק בצ׳אט");
                                else if (result === "whatsapp_with_download")
                                  toast.success("הקבלה הורדה ונשלחה לווצאפ");
                                else toast.success("הקבלה שותפה בהצלחה");
                              } catch (error: any) {
                                if (error?.name !== "AbortError") {
                                  console.error("General share error:", error);
                                  toast.error("שגיאה בשיתוף");
                                }
                              }
                            }}
                            title="שתף כללי"
                            className="h-8 w-8 p-0"
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                        </>
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
        <DialogContent className="max-w-md w-[calc(100vw-1.5rem)] max-h-[90dvh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              {editingPayment ? "עריכת תשלום" : "קבלת תשלום חדש"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pb-20">
            {/* Payment Category Selection */}
            {!editingPayment && (
              <div className="space-y-2">
                <Label>סוג תשלום</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentCategory("regular")}
                    className={`px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium flex items-center justify-center gap-2 ${
                      paymentCategory === "regular"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    תשלום רגיל
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentCategory("hall")}
                    className={`px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium flex items-center justify-center gap-2 ${
                      paymentCategory === "hall"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    תשלום אולם
                  </button>
                </div>
              </div>
            )}

            {/* Hall Event Type */}
            {paymentCategory === "hall" && (
              <div className="space-y-3 p-4 rounded-xl bg-muted/50 border border-border">
                <Label className="font-semibold">סוג אירוע באולם</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHallEventType("simcha")}
                    className={`px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium ${
                      hallEventType === "simcha"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    🎉 שמחה
                  </button>
                  <button
                    type="button"
                    onClick={() => setHallEventType("azkara")}
                    className={`px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium ${
                      hallEventType === "azkara"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    🕯️ אזכרה
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="space-y-1">
                    <Label className="text-xs">סכום כולל לכל התשלומים</Label>
                    <Input
                      type="number"
                      value={installmentTotalAmount}
                      onChange={(e) => {
                        setInstallmentTotalAmount(e.target.value);
                        const total = Number(totalInstallments) || 1;
                        if (e.target.value) {
                          setFormData((prev) => ({
                            ...prev,
                            amount: String(Math.round(Number(e.target.value) / total)),
                          }));
                        }
                      }}
                      placeholder="סכום כולל"
                      dir="ltr"
                      className="text-left"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">מספר תשלומים</Label>
                    <Input
                      type="number"
                      min="1"
                      max="36"
                      value={totalInstallments}
                      onChange={(e) => {
                        setTotalInstallments(e.target.value);
                        const total = Number(e.target.value) || 1;
                        if (installmentTotalAmount) {
                          setFormData((prev) => ({
                            ...prev,
                            amount: String(Math.round(Number(installmentTotalAmount) / total)),
                          }));
                        }
                      }}
                      dir="ltr"
                      className="text-left"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">סוג תשלום</Label>
                  <Select value={installmentNumber} onValueChange={setInstallmentNumber}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">מקדמה</SelectItem>
                      <SelectItem value="2">תשלום מלא</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {installmentTotalAmount && Number(totalInstallments) > 1 && (
                  <p className="text-xs text-muted-foreground text-center">
                    סכום לתשלום:{" "}
                    {formatCurrency(Math.round(Number(installmentTotalAmount) / Number(totalInstallments)))} ×{" "}
                    {totalInstallments} תשלומים = {formatCurrency(Number(installmentTotalAmount))}
                  </p>
                )}
              </div>
            )}

            {/* Member Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{useCustomName ? "שם *" : "בחר חבר *"}</Label>
                {!editingPayment && (
                  <button
                    type="button"
                    onClick={() => {
                      setUseCustomName(!useCustomName);
                      setFormData((prev) => ({ ...prev, member_id: "" }));
                      setCustomName("");
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    {useCustomName ? "בחר מרשימת חברים" : "הקלד שם חופשי"}
                  </button>
                )}
              </div>

              {useCustomName ? (
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="הקלד שם מלא..."
                  className="text-right"
                />
              ) : (
                <Popover open={memberComboOpen} onOpenChange={setMemberComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={memberComboOpen}
                      className="w-full justify-between font-normal"
                    >
                      {formData.member_id
                        ? members?.find((m: any) => m.id === formData.member_id)?.full_name || "בחר חבר"
                        : "חפש ובחר חבר..."}
                      <ChevronsUpDown className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="הקלד שם חבר לחיפוש..." className="text-right" />
                      <CommandList className="max-h-[200px]">
                        <CommandEmpty>לא נמצא חבר</CommandEmpty>
                        <CommandGroup>
                          {members?.map((member: any) => (
                            <CommandItem
                              key={member.id}
                              value={member.full_name}
                              onSelect={() => {
                                setFormData({ ...formData, member_id: member.id });
                                setMemberComboOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "ml-2 h-4 w-4",
                                  formData.member_id === member.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              {member.full_name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
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
                    setOccasionType("parasha");
                    setFormData({ ...formData, occasion: getCurrentParasha() });
                  }}
                  className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                    occasionType === "parasha"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  פרשה
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOccasionType("holiday");
                    setFormData({ ...formData, occasion: HOLIDAY_LIST[0] });
                  }}
                  className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
                    occasionType === "holiday"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  חג / אירוע
                </button>
              </div>
            </div>

            {/* Parasha or Holiday Selection */}
            <div className="space-y-2">
              <Label>{occasionType === "parasha" ? "פרשה לקבלה" : "חג / אירוע לקבלה"}</Label>
              <Select
                value={formData.occasion}
                onValueChange={(value) => setFormData({ ...formData, occasion: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={occasionType === "parasha" ? "בחר פרשה" : "בחר חג / אירוע"} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {occasionType === "parasha"
                    ? PARASHA_LIST.map((parasha) => (
                        <SelectItem key={parasha} value={parasha}>
                          {parasha}
                        </SelectItem>
                      ))
                    : HOLIDAY_LIST.map((holiday) => (
                        <SelectItem key={holiday} value={holiday}>
                          {holiday}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div className="space-y-3">
              <Label>אמצעי תשלום</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cash")}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === "cash" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <Banknote className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <p className="font-medium">מזומן</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("bit")}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === "bit" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <Smartphone className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                  <p className="font-medium">ביט</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("check")}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === "check" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <FileCheck className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <p className="font-medium">צ׳ק</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("bank_transfer")}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    paymentMethod === "bank_transfer"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Building2 className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                  <p className="font-medium">העברה בנקאית</p>
                </button>
              </div>
            </div>

            {/* Bit Reference */}
            {paymentMethod === "bit" && (
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

            {/* Check Reference */}
            {paymentMethod === "check" && (
              <div className="space-y-2">
                <Label>מספר צ׳ק *</Label>
                <Input
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="הזן את מספר הצ׳ק"
                  dir="ltr"
                  className="text-center"
                />
              </div>
            )}

            {/* Bank Transfer Reference */}
            {paymentMethod === "bank_transfer" && (
              <div className="space-y-2">
                <Label>מספר אסמכתא להעברה *</Label>
                <Input
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="הזן מספר אסמכתא"
                  dir="ltr"
                  className="text-center"
                />
              </div>
            )}

            <div className="sticky bottom-0 bg-background/95 backdrop-blur pt-4 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] flex gap-3">
              <Button type="button" variant="outline" onClick={handleCloseDialog} className="flex-1">
                ביטול
              </Button>
              <Button type="submit" className="flex-1 btn-primary-gradient" disabled={savePayment.isPending}>
                {savePayment.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    מעבד...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                    {editingPayment ? "עדכן תשלום" : "קבל תשלום והנפק קבלה"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog with Code Protection */}
      <DeleteCodeDialog
        open={!!deletePaymentId}
        onOpenChange={(open) => !open && setDeletePaymentId(null)}
        title="מחיקת תשלום"
        description="האם אתה בטוח שברצונך למחוק תשלום זה? פעולה זו תמחק גם את הקבלה המשויכת ולא ניתן לבטלה."
        onConfirm={() => deletePaymentId && deletePayment.mutate(deletePaymentId)}
        isPending={deletePayment.isPending}
      />

      {/* Receipt Preview Dialog */}
      <ReceiptPreviewDialog
        receipt={receiptPreviewData}
        open={receiptPreviewOpen}
        onOpenChange={setReceiptPreviewOpen}
        onPrint={(receipt) => {
          // Trigger print via window.print for the receipt
          const printContent = document.querySelector("[data-receipt-preview]");
          if (printContent) {
            const printWindow = window.open("", "_blank");
            if (printWindow) {
              printWindow.document.write(`
                <html dir="rtl"><head><title>קבלה ${receipt.receipt_number}</title>
                <style>body{font-family:Arial,sans-serif;margin:0;padding:20px;}</style>
                </head><body>${printContent.innerHTML}</body></html>
              `);
              printWindow.document.close();
              printWindow.print();
            }
          }
        }}
      />
      {/* Debts Breakdown Dialog */}
      <Dialog open={debtsDialogOpen} onOpenChange={setDebtsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">פירוט חובות שטרם נגבו</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {memberDebts && memberDebts.length > 0 ? (
              <>
                {memberDebts.map((member, idx) => (
                  <Card key={idx} className="glass-card">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">{member.full_name}</span>
                        <Badge variant="destructive" className="hebrew-number">{formatCurrency(member.total)}</Badge>
                      </div>
                      <div className="space-y-1">
                        {member.charges.map((charge, ci) => (
                          <div key={ci} className="flex justify-between text-sm text-muted-foreground">
                            <span>{charge.description || "חיוב"}</span>
                            <span className="hebrew-number">{formatCurrency(charge.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <div className="border-t pt-3 flex justify-between items-center font-bold text-lg">
                  <span>סה״כ חובות</span>
                  <span className="hebrew-number text-destructive">{formatCurrency(totalMemberDebts)}</span>
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8">אין חובות פתוחים 🎉</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
