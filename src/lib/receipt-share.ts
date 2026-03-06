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

/**
 * Share receipt text only (works reliably on all mobile platforms)
 */
export async function shareReceipt(receipt: any): Promise<void> {
  const shareText = getShareText(receipt);

  if (navigator.share) {
    try {
      await navigator.share({
        title: `קבלה מס׳ ${receipt.receipt_number}`,
        text: shareText,
      });
      return;
    } catch (error: any) {
      if (error?.name === 'AbortError') throw error;
      console.warn('Text share failed, falling back to download:', error);
    }
  }

  const file = await buildReceiptPdfFile(receipt);
  downloadPdfFile(file);
  throw new Error('DOWNLOAD_FALLBACK');
}

/**
 * Share receipt with PDF file via WhatsApp / native share.
 * Two-step approach for mobile gesture compliance:
 * - First call: builds PDF, caches it, shares from cache
 * - If gesture fails: returns 'RETRY' so UI can prompt user to tap again
 */
export async function shareReceiptWithPdf(receipt: any): Promise<void> {
  const cacheKey = receipt.id || String(receipt.receipt_number);
  let file = pdfCache.get(cacheKey);

  // If not cached, build it (this is async and may break gesture on first tap)
  if (!file) {
    file = await buildReceiptPdfFile(receipt);
    // file is now cached by buildReceiptPdfFile
  }

  const shareText = getShareText(receipt);

  // Try native share with file (works on Android & iOS if within gesture)
  if (navigator.share) {
    const canShareFiles = navigator.canShare?.({ files: [file] });
    
    if (canShareFiles) {
      try {
        await navigator.share({
          files: [file],
          title: `קבלה מס׳ ${receipt.receipt_number}`,
          text: shareText,
        });
        pdfCache.delete(cacheKey); // Clear cache after successful share
        return;
      } catch (error: any) {
        if (error?.name === 'AbortError') throw error;
        
        // Gesture error - file is cached, prompt retry
        const isGestureError =
          error?.name === 'NotAllowedError' ||
          String(error?.message || '').toLowerCase().includes('not allowed');
        
        if (isGestureError) {
          throw new Error('GESTURE_ERROR');
        }
        console.warn('File share failed:', error);
      }
    }
  }

  // Fallback: download PDF
  downloadPdfFile(file);
  throw new Error('DOWNLOAD_FALLBACK');
}

/**
 * Open WhatsApp with receipt text. Phone number optional.
 */
export function shareViaWhatsApp(receipt: any, phoneNumber?: string): void {
  const text = getShareText(receipt);
  const encoded = encodeURIComponent(text);
  
  if (phoneNumber) {
    // Clean phone number (remove spaces, dashes, leading 0)
    let clean = phoneNumber.replace(/[\s\-()]/g, '');
    if (clean.startsWith('0')) clean = '972' + clean.substring(1);
    if (!clean.startsWith('+') && !clean.startsWith('972')) clean = '972' + clean;
    clean = clean.replace('+', '');
    window.open(`https://wa.me/${clean}?text=${encoded}`, '_blank');
  } else {
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }
}
