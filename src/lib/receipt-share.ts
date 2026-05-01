import html2pdf from 'html2pdf.js';
import { formatCurrency, formatDate, getHebrewDate } from '@/lib/hebrew-utils';
import { supabase } from '@/integrations/supabase/client';

const pdfCache = new Map<string, File>();
const imageCache = new Map<string, File>();
const linkCache = new Map<string, string>();

/**
 * Returns a short, public web URL for the receipt that anyone can open.
 * Format: https://<host>/r/<receipt_number>
 * The page itself fetches the receipt from the public DB view.
 */
export function getReceiptShareLink(receipt: any): string {
  const num = receipt?.receipt_number;
  if (!num) return '';
  const cached = linkCache.get(String(num));
  if (cached) return cached;
  // Use published domain when accessed from there; otherwise use current origin.
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const link = `${origin}/r/${num}`;
  linkCache.set(String(num), link);
  return link;
}

/**
 * Uploads receipt PDF to public storage bucket and returns its public URL.
 * Useful when you want a direct PDF link instead of the view page.
 */
export async function uploadReceiptPdfToStorage(receipt: any): Promise<string | null> {
  try {
    const file = await buildReceiptPdfFile(receipt);
    const path = `receipt-${receipt.receipt_number}.pdf`;
    const { error: upErr } = await supabase.storage
      .from('receipt-pdfs')
      .upload(path, file, { upsert: true, contentType: 'application/pdf' });
    if (upErr) {
      console.warn('Receipt PDF upload failed', upErr);
      return null;
    }
    const { data } = supabase.storage.from('receipt-pdfs').getPublicUrl(path);
    return data?.publicUrl || null;
  } catch (e) {
    console.warn('uploadReceiptPdfToStorage error', e);
    return null;
  }
}

// Debug log for share attempts
export interface ShareDebugEntry {
  timestamp: string;
  receiptNumber: string | number;
  platform: string;
  method: string;
  fileType: string;
  cached: boolean;
  result: string;
}

const shareDebugLog: ShareDebugEntry[] = [];
const MAX_DEBUG_LOG = 20;

function debugLog(entry: Omit<ShareDebugEntry, 'timestamp'>): void {
  const full: ShareDebugEntry = { ...entry, timestamp: new Date().toLocaleTimeString('he-IL') };
  shareDebugLog.unshift(full);
  if (shareDebugLog.length > MAX_DEBUG_LOG) shareDebugLog.pop();
  console.log(`[ShareDebug] ${full.timestamp} | #${full.receiptNumber} | ${full.platform} | ${full.method} | ${full.fileType} | cached=${full.cached} | ${full.result}`);
}

export function getShareDebugLog(): ShareDebugEntry[] {
  return [...shareDebugLog];
}

export function clearShareDebugLog(): void {
  shareDebugLog.length = 0;
}

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
  const cleanup = () => document.querySelectorAll('.html2pdf__overlay, .html2pdf__container').forEach((node) => node.remove());
  cleanup();
  setTimeout(cleanup, 100);
  setTimeout(cleanup, 500);
}

function getCachedShareFile(receipt: any): File | undefined {
  const cacheKey = getReceiptCacheKey(receipt);

  if (isIOSDevice()) {
    return pdfCache.get(cacheKey) || imageCache.get(cacheKey);
  }

  return imageCache.get(cacheKey) || pdfCache.get(cacheKey);
}

function getPaymentMethodLabel(method?: string): string {
  const map: Record<string, string> = {
    cash: 'מזומן',
    bit: 'ביט',
    check: 'צ׳ק',
    bank_transfer: 'העברה בנקאית',
  };
  return method ? (map[method] || method) : '';
}

function getReceiptHtml(receipt: any): string {
  const paymentMethod = receipt.payment?.method;
  const methodLabel = getPaymentMethodLabel(paymentMethod);
  const reference = receipt.payment?.reference;
  const methodLine = methodLabel
    ? `<div style="display:flex;justify-content:center;gap:8px;font-size:11px;font-weight:800;padding:0.5mm 0"><span>אופן תשלום:</span><span>${methodLabel}${reference ? ` (${reference})` : ''}</span></div>`
    : '';

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
      ${methodLine}
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

/**
 * Sends receipt directly to a specific WhatsApp number.
 * Always opens a direct chat with the given phone (no share sheet).
 * The PDF/JPEG is downloaded so the user can attach it in one tap.
 * Works on iOS, Android and Desktop.
 */
export async function sendReceiptToWhatsAppDirect(receipt: any, phoneNumber: string): Promise<void> {
  if (!phoneNumber) throw new Error('missing_phone');
  const text = getShareText(receipt);
  const isIOS = isIOSDevice();
  const platform = isIOS ? 'iOS' : isMobileDevice() ? 'Android' : 'Desktop';

  // The text now includes a public link to the receipt page (/r/<num>),
  // so the recipient can open it with one tap inside WhatsApp — no file
  // attachment needed.

  if (isIOS) {
    // iOS: must navigate synchronously inside the user gesture
    const waPlaceholder = window.open('about:blank', '_blank');
    copyTextToClipboard(text).catch(() => {});
    const waUrl = getWhatsAppUrl(text, phoneNumber);
    if (waPlaceholder) {
      waPlaceholder.location.href = waUrl;
    } else {
      window.location.href = waUrl;
    }
    debugLog({
      receiptNumber: receipt.receipt_number,
      platform,
      method: 'direct_to_member_with_link',
      fileType: 'link',
      cached: false,
      result: 'opened_chat_with_link',
    });
    return;
  }

  // Android / Desktop
  await copyTextToClipboard(text);
  openWhatsAppDirect(text, phoneNumber);

  debugLog({
    receiptNumber: receipt.receipt_number,
    platform,
    method: 'direct_to_member_with_link',
    fileType: 'link',
    cached: false,
    result: 'opened_chat_with_link',
  });
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
  const methodLabel = getPaymentMethodLabel(receipt.payment?.method);
  const reference = receipt.payment?.reference;
  const methodStr = methodLabel
    ? `💳 אופן תשלום: ${methodLabel}${reference ? ` (${reference})` : ''}`
    : '';
  const link = getReceiptShareLink(receipt);
  const linkLine = link ? `🔗 לצפייה והורדת הקבלה:\n${link}` : '';

  return [
    `🧾 קבלה מס׳ ${receipt.receipt_number}`,
    `👤 ${receipt.member?.full_name || ''}`,
    `💰 סכום: ${formatCurrency(Number(receipt.total_amount))}`,
    `📅 תאריך: ${formatDate(receipt.created_at)}`,
    `${receipt.description ? `📝 עבור: ${receipt.description}` : ''}`,
    methodStr,
    '',
    linkLine,
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
  const platform = isIOS ? 'iOS' : isMobileDevice() ? 'Android' : 'Desktop';
  const wasCached = isReceiptPdfCached(receipt);
  const file = await getShareFile(receipt);
  const fileType = file.type.includes('pdf') ? 'PDF' : 'JPEG';
  const nativeFileShareSupported = canShareFile(file);

  if (canUseNativeShare()) {
    try {
      if (isIOS) {
        const copied = await copyTextToClipboard(shareText);
        await navigator.share({
          files: [file],
          title: `קבלה מס׳ ${receipt.receipt_number}`,
        });
        const result = copied ? 'shared_with_file_clipboard' : 'shared_with_file';
        debugLog({ receiptNumber: receipt.receipt_number, platform, method: nativeFileShareSupported ? 'native_share_ios' : 'native_share_ios_forced', fileType, cached: wasCached, result });
        return result;
      }

      await navigator.share({
        files: [file],
        title: `קבלה מס׳ ${receipt.receipt_number}`,
        text: shareText,
      });
      debugLog({ receiptNumber: receipt.receipt_number, platform, method: nativeFileShareSupported ? 'native_share' : 'native_share_forced', fileType, cached: wasCached, result: 'shared_with_file' });
      return 'shared_with_file';
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        debugLog({ receiptNumber: receipt.receipt_number, platform, method: nativeFileShareSupported ? 'native_share' : 'native_share_forced', fileType, cached: wasCached, result: 'aborted' });
        throw error;
      }
      console.warn('File share failed:', error);
      debugLog({ receiptNumber: receipt.receipt_number, platform, method: nativeFileShareSupported ? 'native_share' : 'native_share_forced', fileType, cached: wasCached, result: `failed: ${error?.message || 'unknown'}` });
    }
  }

  const phone = phoneNumber || receipt.member?.phone;

  if (isIOS) {
    await copyTextToClipboard(shareText);
  }

  downloadPdfFile(file);
  openWhatsAppDirect(shareText, phone);
  debugLog({ receiptNumber: receipt.receipt_number, platform, method: 'whatsapp_direct', fileType, cached: wasCached, result: 'whatsapp_with_download' });
  return 'whatsapp_with_download';
}

export async function shareReceipt(receipt: any): Promise<string> {
  const shareText = getShareText(receipt);
  const isIOS = isIOSDevice();
  const platform = isIOS ? 'iOS' : isMobileDevice() ? 'Android' : 'Desktop';
  const wasCached = isReceiptPdfCached(receipt);
  const file = await getShareFile(receipt);
  const fileType = file.type.includes('pdf') ? 'PDF' : 'JPEG';

  if (canUseNativeShare()) {
    try {
      if (isIOS) {
        const copied = await copyTextToClipboard(shareText);
        await navigator.share({
          files: [file],
          title: `קבלה מס׳ ${receipt.receipt_number}`,
        });
        debugLog({ receiptNumber: receipt.receipt_number, platform, method: 'general_share_ios', fileType, cached: wasCached, result: copied ? 'shared_with_file_clipboard' : 'shared_with_file' });
        return copied ? 'shared_with_file_clipboard' : 'shared_with_file';
      }

      await navigator.share({
        files: [file],
        title: `קבלה מס׳ ${receipt.receipt_number}`,
        text: shareText,
      });
      debugLog({ receiptNumber: receipt.receipt_number, platform, method: 'general_share', fileType, cached: wasCached, result: 'shared_with_file' });
      return 'shared_with_file';
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        debugLog({ receiptNumber: receipt.receipt_number, platform, method: 'general_share', fileType, cached: wasCached, result: 'aborted' });
        throw error;
      }
      console.warn('General share with file failed:', error);
      debugLog({ receiptNumber: receipt.receipt_number, platform, method: 'general_share', fileType, cached: wasCached, result: `failed: ${error?.message || 'unknown'}` });
    }
  }

  // Fallback: download file + open WhatsApp
  if (isIOS) {
    await copyTextToClipboard(shareText);
  }
  downloadPdfFile(file);
  openWhatsAppDirect(shareText);
  debugLog({ receiptNumber: receipt.receipt_number, platform, method: 'general_share_fallback', fileType, cached: wasCached, result: 'whatsapp_with_download' });
  return 'whatsapp_with_download';
}

export async function shareViaWhatsApp(receipt: any, phoneNumber?: string): Promise<void> {
  const text = getShareText(receipt);
  const isIOS = isIOSDevice();
  const platform = isIOS ? 'iOS' : isMobileDevice() ? 'Android' : 'Desktop';
  const phone = phoneNumber || receipt.member?.phone;
  const cachedFile = getCachedShareFile(receipt);
  const file = cachedFile || await getShareFile(receipt);
  const fileType = file.type.includes('pdf') ? 'PDF' : 'JPEG';
  const nativeFileShareSupported = canShareFile(file);

  if (canUseNativeShare()) {
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
      debugLog({ receiptNumber: receipt.receipt_number, platform, method: nativeFileShareSupported ? 'wa_native_share' : 'wa_native_share_forced', fileType, cached: Boolean(cachedFile), result: 'success' });
      return;
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        debugLog({ receiptNumber: receipt.receipt_number, platform, method: nativeFileShareSupported ? 'wa_native_share' : 'wa_native_share_forced', fileType, cached: Boolean(cachedFile), result: 'aborted' });
        return;
      }
      console.warn('WhatsApp native share failed:', error);
      debugLog({ receiptNumber: receipt.receipt_number, platform, method: nativeFileShareSupported ? 'wa_native_share' : 'wa_native_share_forced', fileType, cached: Boolean(cachedFile), result: `failed: ${error?.message || 'unknown'}` });
    }
  }

  if (isIOS) {
    await copyTextToClipboard(text);
  }

  downloadPdfFile(file);
  openWhatsAppDirect(text, phone);
  debugLog({ receiptNumber: receipt.receipt_number, platform, method: 'wa_direct_link', fileType, cached: Boolean(cachedFile), result: 'download_then_whatsapp_text' });
}
