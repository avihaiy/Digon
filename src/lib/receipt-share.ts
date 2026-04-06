import html2pdf from 'html2pdf.js';
import { formatCurrency, formatDate, getHebrewDate } from '@/lib/hebrew-utils';

const pdfCache = new Map<string, File>();
const imageCache = new Map<string, File>();

function getReceiptCacheKey(receipt: any): string {
  return receipt.id || String(receipt.receipt_number);
}

function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function canUseNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

function canShareFile(file: File): boolean {
  if (!canUseNativeShare()) {
    return false;
  }

  if (typeof navigator.canShare !== 'function') {
    return true;
  }

  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function clearHtml2PdfArtifacts(): void {
  document.querySelectorAll('.html2pdf__overlay, .html2pdf__container').forEach((node) => node.remove());
}

function getCachedShareFile(receipt: any): File | undefined {
  const cacheKey = getReceiptCacheKey(receipt);

  if (isIOSDevice()) {
    return pdfCache.get(cacheKey) || imageCache.get(cacheKey);
  }

  return imageCache.get(cacheKey) || pdfCache.get(cacheKey);
}

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
  const cacheKey = getReceiptCacheKey(receipt);
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
    clearHtml2PdfArtifacts();
  }
}

async function buildReceiptImageFile(receipt: any): Promise<File> {
  const cacheKey = getReceiptCacheKey(receipt);
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
          0.95,
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
    clearHtml2PdfArtifacts();
  }
}

export function prebuildReceiptPdf(receipt: any): void {
  const cacheKey = getReceiptCacheKey(receipt);

  if (isIOSDevice()) {
    if (!pdfCache.has(cacheKey)) {
      buildReceiptPdfFile(receipt).catch(() => {});
    }
    return;
  }

  if (!imageCache.has(cacheKey)) {
    buildReceiptImageFile(receipt).catch(() => {});
  }
}

export function prebuildReceiptPdfs(receipts: any[]): void {
  receipts.forEach((receipt, i) => {
    setTimeout(() => prebuildReceiptPdf(receipt), i * 300);
  });
}

export function isReceiptPdfCached(receipt: any): boolean {
  const cacheKey = getReceiptCacheKey(receipt);
  return imageCache.has(cacheKey) || pdfCache.has(cacheKey);
}

export function downloadPdfFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function getShareText(receipt: any): string {
  return [
    `🧾 קבלה מס׳ ${receipt.receipt_number}`,
    `👤 ${receipt.member?.full_name || ''}`,
    `💰 סכום: ${formatCurrency(Number(receipt.total_amount))}`,
    `📅 תאריך: ${formatDate(receipt.created_at)}`,
    `${receipt.description ? `📝 עבור: ${receipt.description}` : ''}`,
    '',
    'תודה רבה! 🙏',
    'בית כנסת "ברית שלום" עכו',
    'טלפון: 050-5768723',
  ].filter(Boolean).join('\n');
}

function cleanPhoneNumber(phoneNumber: string): string {
  let clean = phoneNumber.replace(/[\s\-()]/g, '');
  if (clean.startsWith('0')) clean = `972${clean.substring(1)}`;
  if (!clean.startsWith('+') && !clean.startsWith('972')) clean = `972${clean}`;
  clean = clean.replace('+', '');
  return clean;
}

function getWhatsAppUrl(text: string, phoneNumber?: string, useAppScheme = false): string {
  const encoded = encodeURIComponent(text);
  const query = phoneNumber
    ? `phone=${cleanPhoneNumber(phoneNumber)}&text=${encoded}`
    : `text=${encoded}`;

  return useAppScheme ? `whatsapp://send?${query}` : `https://api.whatsapp.com/send?${query}`;
}

function openWhatsAppDirect(text: string, phoneNumber?: string): void {
  const webUrl = getWhatsAppUrl(text, phoneNumber);

  if (!isMobileDevice()) {
    window.open(webUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  const appUrl = getWhatsAppUrl(text, phoneNumber, true);
  let switchedToApp = false;

  const cleanup = () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pagehide', handlePageHide);
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      switchedToApp = true;
      cleanup();
    }
  };

  const handlePageHide = () => {
    switchedToApp = true;
    cleanup();
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', handlePageHide, { once: true });
  window.location.href = appUrl;

  window.setTimeout(() => {
    cleanup();

    if (!switchedToApp) {
      window.location.href = webUrl;
    }
  }, 1200);
}

async function getShareFile(receipt: any): Promise<File> {
  const cachedFile = getCachedShareFile(receipt);
  if (cachedFile) {
    return cachedFile;
  }

  if (isIOSDevice()) {
    return await buildReceiptPdfFile(receipt);
  }

  return await buildReceiptImageFile(receipt);
}

export async function shareReceiptWithPdf(receipt: any, phoneNumber?: string): Promise<string> {
  const shareText = getShareText(receipt);
  const isIOS = isIOSDevice();
  const file = await getShareFile(receipt);

  if (canShareFile(file)) {
    try {
      if (isIOS) {
        const copied = await copyTextToClipboard(shareText);
        await navigator.share({
          files: [file],
          title: `קבלה מס׳ ${receipt.receipt_number}`,
        });
        return copied ? 'shared_with_file_clipboard' : 'shared_with_file';
      }

      await navigator.share({
        files: [file],
        title: `קבלה מס׳ ${receipt.receipt_number}`,
        text: shareText,
      });
      return 'shared_with_file';
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw error;
      }
      console.warn('File share failed:', error);
    }
  }

  const phone = phoneNumber || receipt.member?.phone;

  if (isIOS) {
    await copyTextToClipboard(shareText);
  }

  downloadPdfFile(file);
  openWhatsAppDirect(shareText, phone);
  return 'whatsapp_with_download';
}

export async function shareReceipt(receipt: any): Promise<void> {
  const shareText = getShareText(receipt);
  if (navigator.share) {
    await navigator.share({ title: `קבלה מס׳ ${receipt.receipt_number}`, text: shareText });
    return;
  }
  await navigator.clipboard.writeText(shareText);
}

export async function shareViaWhatsApp(receipt: any, phoneNumber?: string): Promise<void> {
  const text = getShareText(receipt);
  const isIOS = isIOSDevice();
  const phone = phoneNumber || receipt.member?.phone;
  const file = getCachedShareFile(receipt);

  if (file && canShareFile(file)) {
    try {
      if (isIOS) {
        await copyTextToClipboard(text);
        await navigator.share({
          files: [file],
          title: `קבלה מס׳ ${receipt.receipt_number}`,
        });
      } else {
        await navigator.share({
          files: [file],
          title: `קבלה מס׳ ${receipt.receipt_number}`,
          text,
        });
      }
      return;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return;
      }
      console.warn('WhatsApp native share failed:', error);
    }
  }

  if (isIOS) {
    await copyTextToClipboard(text);
  }

  if (file) {
    downloadPdfFile(file);
  } else {
    prebuildReceiptPdf(receipt);
  }

  openWhatsAppDirect(text, phone);
}
