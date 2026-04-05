import html2pdf from 'html2pdf.js';
import { formatCurrency, formatDate, getHebrewDate } from '@/lib/hebrew-utils';

// Global cache for pre-built PDF files (persists across renders)
const pdfCache = new Map<string, File>();

export async function buildReceiptPdfFile(receipt: any): Promise<File> {
  const cacheKey = receipt.id || String(receipt.receipt_number);
  const cached = pdfCache.get(cacheKey);
  if (cached) return cached;

  const el = document.createElement('div');
  el.style.cssText = "font-family:'Heebo',Arial,sans-serif;font-size:11px;line-height:1.3;width:80mm;min-height:120mm;padding:3mm;font-weight:700;color:#000;background:#fff;";
  el.innerHTML = `
    <div style="text-align:center;font-size:10px;font-weight:900;margin-bottom:2mm">בס"ד</div>
    <div style="text-align:center;margin-bottom:2mm">
      <div style="font-size:14px;font-weight:900">בית כנסת "ברית שלום" עכו</div>
      <div style="font-size:10px;font-weight:800">רח' קדושי קהיר 18, עכו</div>
    </div>
    <div style="text-align:center;margin-bottom:1mm"><div style="font-size:13px;font-weight:900">קבלה מספר: ${receipt.receipt_number}</div></div>
    <div style="text-align:center;font-size:10px;font-weight:800;margin-bottom:2mm">${formatDate(receipt.created_at)} • ${getHebrewDate(new Date(receipt.created_at))}</div>
    <div style="border-top:2px dashed #000;margin:1.5mm 0"></div>
    <div style="margin-bottom:2mm">
      <div style="display:flex;justify-content:center;gap:8px;font-size:11px;font-weight:800;padding:0.5mm 0"><span>התקבל מאת:</span><span>${receipt.member?.full_name || '-'}</span></div>
      <div style="display:flex;justify-content:center;gap:8px;font-size:11px;font-weight:800;padding:0.5mm 0"><span>עבור:</span><span>${receipt.description || 'תרומה'}</span></div>
    </div>
    <div style="border-top:2px dashed #000;margin:1.5mm 0"></div>
    <div style="text-align:center;padding:2mm 0">
      <div style="font-size:12px;font-weight:900">סה״כ שולם</div>
      <div style="font-size:22px;font-weight:900">${formatCurrency(Number(receipt.total_amount))}</div>
    </div>
    <div style="border-top:2px dashed #000;margin:1.5mm 0"></div>
    <div style="text-align:center">
      <p style="font-size:12px;font-weight:900;margin-bottom:1mm">תודה על תרומתכם!</p>
      <p style="font-size:10px;font-weight:800">בית כנסת "ברית שלום" עכו</p>
      <p style="font-size:10px;font-weight:800">טלפון: 050-5768723</p>
    </div>
  `;

  document.body.appendChild(el);

  try {
    const opt = {
      margin: 0,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: [80, 120], orientation: 'portrait' as const },
    };

    const pdfBlob: Blob = await html2pdf().set(opt).from(el).toPdf().output('blob');
    const fileName = `receipt-${receipt.receipt_number}.pdf`;
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
    pdfCache.set(cacheKey, file);
    return file;
  } finally {
    if (document.body.contains(el)) {
      document.body.removeChild(el);
    }
  }
}

/** Pre-build PDF in background so it's ready for instant sharing */
export function prebuildReceiptPdf(receipt: any): void {
  const cacheKey = receipt.id || String(receipt.receipt_number);
  if (!pdfCache.has(cacheKey)) {
    buildReceiptPdfFile(receipt).catch(() => {});
  }
}

/** Check if PDF is already cached */
export function isReceiptPdfCached(receipt: any): boolean {
  const cacheKey = receipt.id || String(receipt.receipt_number);
  return pdfCache.has(cacheKey);
}

export function downloadPdfFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function getShareText(receipt: any): string {
  return [
    `🧾 קבלה מס׳ ${receipt.receipt_number}`,
    `👤 ${receipt.member?.full_name || ''}`,
    `💰 סכום: ${formatCurrency(Number(receipt.total_amount))}`,
    `📅 תאריך: ${formatDate(receipt.created_at)}`,
    `${receipt.description ? `📝 עבור: ${receipt.description}` : ''}`,
    ``,
    `תודה רבה! 🙏`,
    `בית כנסת "ברית שלום" עכו`,
    `טלפון: 050-5768723`,
  ].filter(Boolean).join('\n');
}

function cleanPhoneNumber(phoneNumber: string): string {
  let clean = phoneNumber.replace(/[\s\-()]/g, '');
  if (clean.startsWith('0')) clean = '972' + clean.substring(1);
  if (!clean.startsWith('+') && !clean.startsWith('972')) clean = '972' + clean;
  clean = clean.replace('+', '');
  return clean;
}

/**
 * Share receipt with PDF file + text.
 * 
 * Strategy (optimized for iOS + Android):
 * 1. If PDF cached → native share with file + text (works in gesture)
 * 2. If PDF not cached → build it, then try native share
 * 3. If native file share fails → open WhatsApp with text + download PDF separately
 * 4. Last resort → download PDF
 * 
 * Returns: 'shared_with_file' | 'shared_text' | 'whatsapp_text' | 'downloaded'
 */
export async function shareReceiptWithPdf(receipt: any, phoneNumber?: string): Promise<string> {
  const shareText = getShareText(receipt);

  // Build or get cached PDF
  const file = await buildReceiptPdfFile(receipt);

  // Try native share with file + text (works on both iOS and Android)
  if (navigator.share) {
    try {
      const canShareFiles = navigator.canShare?.({ files: [file] });
      if (canShareFiles) {
        await navigator.share({
          files: [file],
          title: `קבלה מס׳ ${receipt.receipt_number}`,
          text: shareText,
        });
        return 'shared_with_file';
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') throw error;
      console.warn('File share failed:', error);
      
      // On gesture error, try text-only share
      try {
        await navigator.share({
          title: `קבלה מס׳ ${receipt.receipt_number}`,
          text: shareText,
        });
        // Also download the PDF so user has it
        downloadPdfFile(file);
        return 'shared_text';
      } catch (textError: any) {
        if (textError?.name === 'AbortError') throw textError;
        console.warn('Text share also failed:', textError);
      }
    }
  }

  // Fallback: Open WhatsApp directly with text + download PDF
  const phone = phoneNumber || receipt.member?.phone;
  if (phone) {
    const clean = cleanPhoneNumber(phone);
    const encoded = encodeURIComponent(shareText);
    window.open(`https://wa.me/${clean}?text=${encoded}`, '_blank');
  } else {
    const encoded = encodeURIComponent(shareText);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }
  downloadPdfFile(file);
  return 'whatsapp_text';
}

/**
 * Share receipt as text only
 */
export async function shareReceipt(receipt: any): Promise<void> {
  const shareText = getShareText(receipt);

  if (navigator.share) {
    await navigator.share({
      title: `קבלה מס׳ ${receipt.receipt_number}`,
      text: shareText,
    });
    return;
  }

  // Fallback: copy to clipboard
  await navigator.clipboard.writeText(shareText);
}

/**
 * Open WhatsApp with receipt text + PDF file.
 * Since WhatsApp web API doesn't support file attachments,
 * we download the PDF and open WhatsApp with text.
 */
export async function shareViaWhatsApp(receipt: any, phoneNumber?: string): Promise<void> {
  const text = getShareText(receipt);
  const encoded = encodeURIComponent(text);

  // Try native share with file targeting WhatsApp first
  try {
    const file = await buildReceiptPdfFile(receipt);
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `קבלה מס׳ ${receipt.receipt_number}`,
        text: text,
      });
      return;
    }
  } catch (error: any) {
    if (error?.name === 'AbortError') return;
    console.warn('WhatsApp file share failed, falling back to link:', error);
  }

  // Fallback: open WhatsApp link with text
  if (phoneNumber) {
    const clean = cleanPhoneNumber(phoneNumber);
    window.open(`https://wa.me/${clean}?text=${encoded}`, '_blank');
  } else {
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }
}
