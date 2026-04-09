import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Receipt,
  Search,
  Printer,
  Eye,
  MessageCircle,
  Mail,
  Edit,
  Trash2,
  Loader2,
  CalendarIcon,
  Filter,
  X,
  FileDown,
  FileSpreadsheet,
  Wifi,
  Share2,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatCurrency, formatShortDate, formatDate, getHebrewDate, PARASHA_LIST } from '@/lib/hebrew-utils';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ReceiptPreviewDialog } from '@/components/ReceiptPreviewDialog';
import { DeleteCodeDialog } from '@/components/DeleteCodeDialog';
import { shareReceiptWithPdf, shareReceipt, shareViaWhatsApp, buildReceiptPdfFile, downloadPdfFile, prebuildReceiptPdfs } from '@/lib/receipt-share';
import { ShareDebugPanel } from '@/components/ShareDebugPanel';

export default function Receipts() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterParasha, setFilterParasha] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>();
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>();
  const [previewReceipt, setPreviewReceipt] = useState<any>(null);
  const [editingReceipt, setEditingReceipt] = useState<any>(null);
  const [deleteReceiptId, setDeleteReceiptId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    member_id: '',
    total_amount: '',
    description: '',
    parasha: '',
  });

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

  // Pre-build PDFs in background for instant sharing
  useEffect(() => {
    if (receipts?.length) {
      prebuildReceiptPdfs(receipts.slice(0, 10));
    }
  }, [receipts]);

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

  // Update receipt
  const updateReceipt = useMutation({
    mutationFn: async () => {
      // Build description with parasha if selected
      let description = editFormData.description;
      if (editFormData.parasha && !description?.includes('פרשת')) {
        description = `פרשת ${editFormData.parasha}${description ? ' - ' + description : ''}`;
      } else if (editFormData.parasha && description?.includes('פרשת')) {
        // Replace existing parasha
        description = description.replace(/פרשת\s+\S+/, `פרשת ${editFormData.parasha}`);
      }
      
      const { error } = await supabase
        .from('receipts')
        .update({
          member_id: editFormData.member_id,
          total_amount: Number(editFormData.total_amount),
          description: description || null,
        })
        .eq('id', editingReceipt.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('הקבלה עודכנה בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      handleCloseEditDialog();
    },
    onError: (error) => {
      toast.error('שגיאה בעדכון הקבלה', { description: error.message });
    },
  });

  // Delete receipt
  const deleteReceipt = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('receipts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('הקבלה נמחקה בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      setDeleteReceiptId(null);
    },
    onError: (error) => {
      toast.error('שגיאה במחיקת הקבלה', { description: error.message });
    },
  });

  const handleEditReceipt = (receipt: any) => {
    setEditingReceipt(receipt);
    // Extract parasha from description if it contains format "פרשת X"
    const parashaMatch = receipt.description?.match(/פרשת\s+(.+)/);
    const parasha = parashaMatch ? parashaMatch[1] : '';
    setEditFormData({
      member_id: receipt.member_id,
      total_amount: String(receipt.total_amount),
      description: receipt.description || '',
      parasha: parasha,
    });
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingReceipt(null);
    setEditFormData({ member_id: '', total_amount: '', description: '', parasha: '' });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData.member_id || !editFormData.total_amount) {
      toast.error('יש למלא את כל השדות הנדרשים');
      return;
    }
    updateReceipt.mutate();
  };

  const handlePrint = async (receipt: any) => {
    try {
      const { silentPrintReceipt } = await import('@/lib/thermal-print');
      await silentPrintReceipt(receipt);
      toast.success('הקבלה נשלחה להדפסה');
    } catch (error) {
      console.error('Print error:', error);
      toast.error('שגיאה בהדפסה');
    }
  };

  const handleRemotePrint = async (receipt: any) => {
    try {
      const { remotePrintReceipt } = await import('@/lib/remote-print');
      await remotePrintReceipt(receipt);
      toast.success('הקבלה נשלחה להדפסה מרחוק');
    } catch (error: any) {
      console.error('Remote print error:', error);
      toast.error('שגיאה בהדפסה מרחוק', { description: error.message });
    }
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

  const handleShareReceipt = async (receipt: any) => {
    try {
      const result = await shareReceiptWithPdf(receipt);
      if (result === 'shared_with_file') toast.success('הקבלה שותפה בהצלחה');
      else if (result === 'shared_with_file_clipboard') toast.success('הקבלה שותפה! הטקסט הועתק - הדבק בצ׳אט');
      else if (result === 'whatsapp_with_download') toast.success('הקבלה הורדה ונשלחה לווצאפ');
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Share error:', error);
        toast.error(`שגיאה בשיתוף: ${error?.message || 'לא ידוע'}`);
      }
    }
  };

  const handleWhatsAppShare = (receipt: any) => {
    const phone = receipt.member?.phone;
    shareViaWhatsApp(receipt, phone);
  };

  // Filter receipts
  const filteredReceipts = receipts?.filter((r: any) => {
    // Text search
    const matchesSearch = searchQuery === '' || 
      r.member?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(r.receipt_number).includes(searchQuery);
    
    // Parasha filter
    const matchesParasha = filterParasha === '' || 
      r.description?.includes(filterParasha);
    
    // Date range filter
    const receiptDate = new Date(r.created_at);
    const matchesDateFrom = !filterDateFrom || receiptDate >= filterDateFrom;
    const matchesDateTo = !filterDateTo || receiptDate <= new Date(filterDateTo.getTime() + 24 * 60 * 60 * 1000);
    
    return matchesSearch && matchesParasha && matchesDateFrom && matchesDateTo;
  });

  const clearFilters = () => {
    setFilterParasha('');
    setFilterDateFrom(undefined);
    setFilterDateTo(undefined);
    setSearchQuery('');
  };

  const hasActiveFilters = filterParasha || filterDateFrom || filterDateTo;

  // Summary
  const totalAmount = filteredReceipts?.reduce((sum: number, r: any) => sum + Number(r.total_amount), 0) || 0;

  // Export to Excel (CSV)
  const handleExportExcel = () => {
    if (!filteredReceipts?.length) {
      toast.error('אין קבלות לייצוא');
      return;
    }

    const headers = ['מספר קבלה', 'תאריך', 'שם', 'סכום', 'תיאור', 'אמצעי תשלום'];
    const rows = filteredReceipts.map((r: any) => [
      r.receipt_number,
      formatDate(r.created_at),
      r.member?.full_name || '-',
      r.total_amount,
      r.description || '-',
      r.payment?.method === 'bit' ? 'ביט' : 'מזומן',
    ]);

    const csvContent = '\uFEFF' + [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `receipts_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('הקובץ יורד בהצלחה');
  };

  // Export to PDF
  const handleExportPDF = () => {
    if (!filteredReceipts?.length) {
      toast.error('אין קבלות לייצוא');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <title>דו״ח קבלות</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Heebo', Arial, sans-serif;
            padding: 20px;
            direction: rtl;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          .header h1 { font-size: 24px; margin-bottom: 5px; }
          .header p { color: #666; font-size: 14px; }
          .summary {
            display: flex;
            justify-content: space-between;
            background: #f5f5f5;
            padding: 10px 15px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px 10px;
            text-align: right;
          }
          th {
            background: #722F37;
            color: white;
          }
          tr:nth-child(even) { background: #f9f9f9; }
          .total-row {
            font-weight: bold;
            background: #f0f0f0 !important;
          }
          .print-btn {
            display: block;
            width: 200px;
            margin: 20px auto;
            padding: 12px;
            background: #722F37;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
          }
          @media print {
            .print-btn { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>דו״ח קבלות - בית הכנסת</h1>
          <p>תאריך הפקה: ${formatDate(new Date().toISOString())}</p>
          ${filterDateFrom || filterDateTo ? `<p>טווח תאריכים: ${filterDateFrom ? format(filterDateFrom, 'dd/MM/yyyy') : 'התחלה'} - ${filterDateTo ? format(filterDateTo, 'dd/MM/yyyy') : 'עכשיו'}</p>` : ''}
        </div>
        <div class="summary">
          <span>מספר קבלות: ${filteredReceipts.length}</span>
          <span>סה״כ: ${formatCurrency(totalAmount)}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>מס׳</th>
              <th>תאריך</th>
              <th>שם</th>
              <th>תיאור</th>
              <th>אמצעי תשלום</th>
              <th>סכום</th>
            </tr>
          </thead>
          <tbody>
            ${filteredReceipts.map((r: any) => `
              <tr>
                <td>${r.receipt_number}</td>
                <td>${formatShortDate(r.created_at)}</td>
                <td>${r.member?.full_name || '-'}</td>
                <td>${r.description || '-'}</td>
                <td>${r.payment?.method === 'bit' ? 'ביט' : 'מזומן'}</td>
                <td>${formatCurrency(Number(r.total_amount))}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="5">סה״כ</td>
              <td>${formatCurrency(totalAmount)}</td>
            </tr>
          </tbody>
        </table>
        <button class="print-btn" onclick="window.print()">🖨️ הדפס / שמור PDF</button>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            ייצוא אקסל
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2">
            <FileDown className="w-4 h-4" />
            ייצוא PDF
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3">
        {/* Search - Full width on mobile */}
        <div className="relative w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם או מספר קבלה..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Filters row - Scrollable on mobile */}
        <div className="flex gap-2 items-center overflow-x-auto pb-2 -mb-2">
          {/* Parasha Filter */}
          <Select value={filterParasha || "__all__"} onValueChange={(v) => setFilterParasha(v === "__all__" ? "" : v)}>
            <SelectTrigger className="w-[140px] sm:w-[180px] shrink-0">
              <SelectValue placeholder="פרשה" />
            </SelectTrigger>
            <SelectContent className="max-h-60 bg-background">
              <SelectItem value="__all__">כל הפרשיות</SelectItem>
              {PARASHA_LIST.map((parasha) => (
                <SelectItem key={parasha} value={parasha}>
                  {parasha}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date From */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-[110px] sm:w-[140px] shrink-0 justify-start text-right font-normal",
                  !filterDateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="ml-1 sm:ml-2 h-4 w-4" />
                {filterDateFrom ? format(filterDateFrom, "dd/MM/yy") : "מתאריך"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filterDateFrom}
                onSelect={setFilterDateFrom}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {/* Date To */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-[110px] sm:w-[140px] shrink-0 justify-start text-right font-normal",
                  !filterDateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="ml-1 sm:ml-2 h-4 w-4" />
                {filterDateTo ? format(filterDateTo, "dd/MM/yy") : "עד תאריך"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filterDateTo}
                onSelect={setFilterDateTo}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 shrink-0">
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">נקה</span>
            </Button>
          )}
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span>מציג {filteredReceipts?.length || 0} מתוך {receipts?.length || 0} קבלות</span>
          </div>
        )}
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
                  className="flex flex-col p-4 gap-3 table-row-hover"
                >
                  {/* Top row: Receipt info */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs">
                          #{receipt.receipt_number}
                        </Badge>
                        <span className="font-medium truncate">{receipt.member?.full_name}</span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground mt-1 flex-wrap">
                        <span>{formatShortDate(receipt.created_at)}</span>
                        {receipt.description && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline truncate max-w-[150px]">{receipt.description}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="text-lg sm:text-xl font-bold hebrew-number shrink-0">
                      {formatCurrency(Number(receipt.total_amount))}
                    </span>
                  </div>

                  {/* Bottom row: Actions */}
                  <div className="flex items-center justify-end gap-1 sm:gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewReceipt(receipt)}
                      title="תצוגה מקדימה"
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrint(receipt)}
                      title="הדפסה ישירה"
                      className="h-8 w-8 p-0"
                    >
                      <Printer className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemotePrint(receipt)}
                      title="הדפס קבלה מרחוק"
                      className="h-8 w-8 p-0"
                    >
                      <Wifi className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleShareReceipt(receipt)}
                      title="שתף לווצאפ"
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                       onClick={async () => {
                        try {
                          const result = await shareReceipt(receipt);
                          if (result === 'shared_with_file') toast.success('הקבלה שותפה עם קובץ');
                          else if (result === 'shared_with_file_clipboard') toast.success('הקבלה שותפה! הטקסט הועתק - הדבק בצ׳אט');
                          else if (result === 'whatsapp_with_download') toast.success('הקבלה הורדה ונשלחה לווצאפ');
                          else toast.success('הקבלה שותפה בהצלחה');
                        } catch (error: any) {
                          if (error?.name !== 'AbortError') {
                            console.error('General share error:', error);
                            toast.error('שגיאה בשיתוף');
                          }
                        }
                      }}
                      title="שתף כללי"
                      className="h-8 w-8 p-0"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEmail(receipt)}
                      title="שלח באימייל"
                      className="h-8 w-8 p-0 hidden sm:flex"
                    >
                      <Mail className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditReceipt(receipt)}
                      title="עריכה"
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteReceiptId(receipt.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      title="מחיקה"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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

      {/* Edit Receipt Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              עריכת קבלה #{editingReceipt?.receipt_number}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>שם המשלם *</Label>
              <Select
                value={editFormData.member_id}
                onValueChange={(value) => setEditFormData({ ...editFormData, member_id: value })}
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
              <Label>סכום *</Label>
              <Input
                type="number"
                value={editFormData.total_amount}
                onChange={(e) => setEditFormData({ ...editFormData, total_amount: e.target.value })}
                placeholder="0"
                dir="ltr"
                className="text-left"
              />
            </div>

            <div className="space-y-2">
              <Label>פרשה</Label>
              <Select
                value={editFormData.parasha}
                onValueChange={(value) => setEditFormData({ ...editFormData, parasha: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר פרשה" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {PARASHA_LIST.map((parasha) => (
                    <SelectItem key={parasha} value={parasha}>
                      {parasha}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>תיאור</Label>
              <Input
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="תיאור הקבלה"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseEditDialog} className="flex-1">
                ביטול
              </Button>
              <Button type="submit" className="flex-1 btn-primary-gradient" disabled={updateReceipt.isPending}>
                {updateReceipt.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                    שומר...
                  </>
                ) : (
                  'שמור'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog with Code Protection */}
      <DeleteCodeDialog
        open={!!deleteReceiptId}
        onOpenChange={(open) => !open && setDeleteReceiptId(null)}
        title="מחיקת קבלה"
        description="האם אתה בטוח שברצונך למחוק קבלה זו? פעולה זו לא ניתן לבטלה."
        onConfirm={() => deleteReceiptId && deleteReceipt.mutate(deleteReceiptId)}
        isPending={deleteReceipt.isPending}
      />
      <ShareDebugPanel />
    </div>
  );
}
