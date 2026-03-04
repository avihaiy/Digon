import html2pdf from 'html2pdf.js';
import { formatCurrency, formatDate, getHebrewDate } from '@/lib/hebrew-utils';

// Cache for pre-built PDF files (to satisfy user-gesture requirement on mobile)
const shareFileCache: Record<string, File> = {};

export async function buildReceiptPdfFile(receipt: any): Promise<File> {
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
    return new File([pdfBlob], fileName, { type: 'application/pdf' });
  } finally {
    if (document.body.contains(el)) {
      document.body.removeChild(el);
    }
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
  return `קבלה מס׳ ${receipt.receipt_number} | ${receipt.member?.full_name || ''}\nתודה, בית כנסת ברית שלום עכו`;
}

export async function shareReceipt(receipt: any): Promise<void> {
  const cacheKey = receipt.id || String(receipt.receipt_number);

  // Check cache first (second tap after gesture error)
  const cachedFile = shareFileCache[cacheKey];
  if (cachedFile && navigator.share && navigator.canShare?.({ files: [cachedFile] })) {
    await navigator.share({
      files: [cachedFile],
      text: getShareText(receipt),
    });
    delete shareFileCache[cacheKey];
    return;
  }

  const file = await buildReceiptPdfFile(receipt);
  const canShareFiles = !!(navigator.share && navigator.canShare?.({ files: [file] }));

  if (canShareFiles) {
    try {
      await navigator.share({
        files: [file],
        text: getShareText(receipt),
      });
      return;
    } catch (error: any) {
      const isGestureError =
        error?.name === 'NotAllowedError' ||
        String(error?.message || '').toLowerCase().includes('not allowed by the user agent');

      if (isGestureError) {
        shareFileCache[cacheKey] = file;
        throw new Error('GESTURE_ERROR');
      }
      throw error;
    }
  }

  // Fallback: download
  downloadPdfFile(file);
  throw new Error('DOWNLOAD_FALLBACK');
}
