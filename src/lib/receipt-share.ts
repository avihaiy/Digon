import html2pdf from 'html2pdf.js';
import { formatCurrency, formatDate, getHebrewDate } from '@/lib/hebrew-utils';

// Global cache for pre-built PDF files
const pdfCache = new Map<string, File>();
// Cache for image files (faster to generate, better for sharing)
const imageCache = new Map<string, File>();

function getReceiptHtml(receipt: any): string {
  return `
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
}

function createReceiptElement(receipt: any): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = "font-family:'Heebo',Arial,sans-serif;font-size:11px;line-height:1.3;width:80mm;min-height:120mm;padding:3mm;font-weight:700;color:#000;background:#fff;";
  el.innerHTML = getReceiptHtml(receipt);
  return el;
}

export async function buildReceiptPdfFile(receipt: any): Promise<File> {
  const cacheKey = receipt.id || String(receipt.receipt_number);
  const cached = pdfCache.get(cacheKey);
  if (cached) return cached;

  const el = createReceiptElement(receipt);
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

/** Build a JPEG image of the receipt (much faster than PDF, better for sharing) */
async function buildReceiptImageFile(receipt: any): Promise<File> {
  const cacheKey = receipt.id || String(receipt.receipt_number);
  const cached = imageCache.get(cacheKey);
  if (cached) return cached;

  const el = createReceiptElement(receipt);
  document.body.appendChild(el);

  try {
    const opt = {
      margin: 0,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: [80, 120], orientation: 'portrait' as const },
    };

    const worker = html2pdf().set(opt).from(el).toCanvas();
    const canvas: HTMLCanvasElement | undefined = await (worker as any).get('canvas');

    if (!canvas) {
      return await buildReceiptPdfFile(receipt);
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      if (typeof canvas.toBlob === 'function') {
        canvas.toBlob(
          (b) => b ? resolve(b) : reject(new Error('Canvas to blob failed')),
          'image/jpeg',
          0.95
        );
        return;
      }

      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const [meta, base64 = ''] = dataUrl.split(',');
        const mime = meta.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }

        resolve(new Blob([bytes], { type: mime }));
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Canvas export failed'));
      }
    });

    const fileName = `receipt-${receipt.receipt_number}.jpg`;
    const file = new File([blob], fileName, { type: 'image/jpeg' });
    imageCache.set(cacheKey, file);
    return file;
  } finally {
    if (document.body.contains(el)) {
      document.body.removeChild(el);
    }
    document.querySelectorAll('.html2pdf__overlay, .html2pdf__container').forEach((node) => node.remove());
  }
}

/** Pre-build receipt image in background */
export function prebuildReceiptPdf(receipt: any): void {
  const cacheKey = receipt.id || String(receipt.receipt_number);
  if (!imageCache.has(cacheKey)) {
    buildReceiptImageFile(receipt).catch(() => {});
  }
}

/** Pre-build images for a list of receipts */
export function prebuildReceiptPdfs(receipts: any[]): void {
  receipts.forEach((receipt, i) => {
    setTimeout(() => prebuildReceiptPdf(receipt), i * 300);
  });
}

export function isReceiptPdfCached(receipt: any): boolean {
  const cacheKey = receipt.id || String(receipt.receipt_number);
  return imageCache.has(cacheKey) || pdfCache.has(cacheKey);
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
 * Get the best file for sharing based on platform
 * iOS: PDF (better for document sharing)
 * Android: Image (better compatibility with share sheet)
 */
async function getShareFile(receipt: any): Promise<File> {
  const cacheKey = receipt.id || String(receipt.receipt_number);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (isIOS) {
    // iOS: prefer PDF
    const cachedPdf = pdfCache.get(cacheKey);
    if (cachedPdf) return cachedPdf;
    return await buildReceiptPdfFile(receipt);
  }

  // Android/other: prefer image
  const cachedImage = imageCache.get(cacheKey);
  if (cachedImage) return cachedImage;
  const cachedPdf = pdfCache.get(cacheKey);
  if (cachedPdf) return cachedPdf;
  return await buildReceiptImageFile(receipt);
}

/**
 * Share receipt with file + text.
 * 
 * iOS: Sends PDF only via share sheet, copies text to clipboard automatically.
 * Android: Sends file + text together via share sheet.
 * Fallback: Opens WhatsApp with text + downloads file.
 * 
 * Returns: 'shared_with_file' | 'shared_with_file_clipboard' | 'whatsapp_with_download'
 */
export async function shareReceiptWithPdf(receipt: any, phoneNumber?: string): Promise<string> {
  const shareText = getShareText(receipt);
  const file = await getShareFile(receipt);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  if (navigator.share) {
    const canShareFiles = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

    if (canShareFiles) {
      try {
        if (isIOS) {
          // iOS: copy text to clipboard, share PDF only (WhatsApp ignores text with files)
          try { await navigator.clipboard.writeText(shareText); } catch {}
          await navigator.share({
            files: [file],
            title: `קבלה מס׳ ${receipt.receipt_number}`,
          });
          return 'shared_with_file_clipboard';
        } else {
          // Android: share file + text together
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
      }
    }
  }

  // Fallback: Open WhatsApp with text + download file
  const phone = phoneNumber || receipt.member?.phone;
  const encoded = encodeURIComponent(shareText);
  if (phone) {
    const clean = cleanPhoneNumber(phone);
    window.open(`https://wa.me/${clean}?text=${encoded}`, '_blank');
  } else {
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }
  downloadPdfFile(file);
  return 'whatsapp_with_download';
}

/**
 * Share receipt text only
 */
export async function shareReceipt(receipt: any): Promise<void> {
  const shareText = getShareText(receipt);
  if (navigator.share) {
    await navigator.share({ title: `קבלה מס׳ ${receipt.receipt_number}`, text: shareText });
    return;
  }
  await navigator.clipboard.writeText(shareText);
}

/**
 * Share via WhatsApp with file + text
 */
export async function shareViaWhatsApp(receipt: any, phoneNumber?: string): Promise<void> {
  const text = getShareText(receipt);
  const cacheKey = receipt.id || String(receipt.receipt_number);
  const file = imageCache.get(cacheKey) || pdfCache.get(cacheKey);

  // Try native share with file (user picks WhatsApp)
  if (file && navigator.share) {
    try {
      const canShareFiles = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
      if (canShareFiles) {
        await navigator.share({
          files: [file],
          title: `קבלה מס׳ ${receipt.receipt_number}`,
          text: text,
        });
        return;
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
    }
  }

  // Fallback: wa.me link
  const encoded = encodeURIComponent(text);
  if (phoneNumber) {
    const clean = cleanPhoneNumber(phoneNumber);
    window.open(`https://wa.me/${clean}?text=${encoded}`, '_blank');
  } else {
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  }
}
