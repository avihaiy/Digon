// Remote printing via PrintNode – sends the rendered receipt HTML
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate, getHebrewDate, PAYMENT_METHOD } from '@/lib/hebrew-utils';

interface ReceiptData {
  receipt_number: number | null;
  created_at: string;
  total_amount: number;
  description?: string | null;
  member?: { full_name: string } | null;
  payment?: { method: string } | null;
}

function buildReceiptHTMLSnippet(receipt: ReceiptData): string {
  const memberName  = receipt.member?.full_name || '-';
  const description = receipt.description || 'תרומה';
  const method      = PAYMENT_METHOD[receipt.payment?.method as keyof typeof PAYMENT_METHOD] || receipt.payment?.method || '-';
  const amount      = formatCurrency(Number(receipt.total_amount));
  const gregDate    = formatDate(receipt.created_at);
  const hebrewDate  = getHebrewDate(new Date(receipt.created_at));

  return `
<div style="
  width: 80mm;
  max-width: 280px;
  padding: 4mm 2mm;
  font-family: 'Heebo', Arial, sans-serif;
  font-weight: 700;
  color: #000;
  background: #fff;
  direction: rtl;
  text-align: center;
">
  <div style="font-size:10px;font-weight:900;margin-bottom:2mm;">בס&quot;ד</div>
  <div style="font-size:14px;font-weight:900;">בית כנסת &quot;ברית שלום&quot; עכו</div>
  <div style="font-size:10px;font-weight:800;margin-bottom:3mm;">רח' קדושי קהיר 18, עכו</div>
  <div style="font-size:13px;font-weight:900;margin-bottom:1mm;">קבלה מספר: ${receipt.receipt_number || ''}</div>
  <div style="font-size:10px;font-weight:800;margin-bottom:3mm;">${gregDate} &bull; ${hebrewDate}</div>
  <div style="border-top:2px dashed #000;margin:2mm 0;"></div>
  <div style="font-size:11px;font-weight:800;padding:1mm 0;">התקבל מאת: ${memberName}</div>
  <div style="font-size:11px;font-weight:800;padding:1mm 0;">עבור: ${description}</div>
  <div style="font-size:11px;font-weight:800;padding:1mm 0;">אמצעי תשלום: ${method}</div>
  <div style="border-top:2px dashed #000;margin:2mm 0;"></div>
  <div style="font-size:12px;font-weight:900;margin-top:2mm;">סה&quot;כ שולם</div>
  <div style="font-size:22px;font-weight:900;margin-bottom:2mm;">${amount}</div>
  <div style="border-top:2px dashed #000;margin:2mm 0;"></div>
  <div style="font-size:12px;font-weight:900;margin-bottom:1mm;">תודה על תרומתכם!</div>
  <div style="font-size:10px;font-weight:800;">בית כנסת &quot;ברית שלום&quot; עכו</div>
  <div style="font-size:10px;font-weight:800;">רח' קדושי קהיר 18 עכו</div>
  <div style="font-size:10px;font-weight:800;">טלפון: 050-5768723</div>
</div>`;
}

export async function remotePrintReceipt(receipt: ReceiptData): Promise<void> {
  const renderedReceiptHTML = buildReceiptHTMLSnippet(receipt);

  const { data, error } = await supabase.functions.invoke('printnode-print', {
    body: {
      renderedReceiptHTML,
      receiptNumber: receipt.receipt_number,
    },
  });

  if (error) {
    console.error('Remote print error:', error);
    throw new Error(error.message || 'שגיאה בהדפסה מרחוק');
  }

  if (data && !data.success) {
    throw new Error(data.error || 'שגיאה בהדפסה מרחוק');
  }
}
