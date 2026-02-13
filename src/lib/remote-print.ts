// Remote printing via PrintNode for thermal printers
import { supabase } from '@/integrations/supabase/client';
import { formatDate, getHebrewDate, PAYMENT_METHOD } from '@/lib/hebrew-utils';

interface ReceiptData {
  receipt_number: number | null;
  created_at: string;
  total_amount: number;
  description?: string | null;
  member?: { full_name: string } | null;
  payment?: { method: string } | null;
}

export async function remotePrintReceipt(receipt: ReceiptData): Promise<void> {
  const gregDate = formatDate(receipt.created_at);
  const hebrewDate = getHebrewDate(new Date(receipt.created_at));
  const methodKey = receipt.payment?.method as keyof typeof PAYMENT_METHOD;

  const payload = {
    receipt: {
      receipt_number: receipt.receipt_number,
      created_at: receipt.created_at,
      total_amount: Number(receipt.total_amount),
      description: receipt.description || 'תרומה',
      member_name: receipt.member?.full_name || '-',
      payment_method: receipt.payment?.method || '-',
      greg_date: gregDate,
      hebrew_date: hebrewDate,
    },
  };

  const { data, error } = await supabase.functions.invoke('printnode-print', {
    body: payload,
  });

  if (error) {
    console.error('Remote print error:', error);
    throw new Error(error.message || 'שגיאה בהדפסה מרחוק');
  }

  if (data && !data.success) {
    throw new Error(data.error || 'שגיאה בהדפסה מרחוק');
  }
}
