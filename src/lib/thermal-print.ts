// Thermal receipt silent printing utility
// Prints receipt content via a hidden iframe for auto-print behavior

import { formatCurrency, formatDate, getHebrewDate, PAYMENT_METHOD } from '@/lib/hebrew-utils';

interface ReceiptData {
  receipt_number: number | null;
  created_at: string;
  total_amount: number;
  description?: string | null;
  member?: { full_name: string } | null;
  payment?: { method: string } | null;
}

function buildReceiptHTML(receipt: ReceiptData, logoBase64?: string): string {
  const memberName = receipt.member?.full_name || '-';
  const description = receipt.description || 'תרומה';
  const method = PAYMENT_METHOD[receipt.payment?.method as keyof typeof PAYMENT_METHOD] || receipt.payment?.method || '-';
  const amount = formatCurrency(Number(receipt.total_amount));
  const gregDate = formatDate(receipt.created_at);
  const hebrewDate = getHebrewDate(new Date(receipt.created_at));

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@700;800&display=swap');
  
  @page {
    size: 80mm 120mm;
    margin: 0;
  }
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: 'Heebo', Arial, sans-serif;
    font-weight: 700;
    color: #000;
  }
  
  html, body {
    width: 80mm;
    height: 120mm;
    background: #fff;
    overflow: hidden;
  }
  
  .receipt {
    width: 80mm;
    height: 120mm;
    padding: 2mm;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .bsd {
    text-align: center;
    font-size: 10px;
    font-weight: 900;
    margin-bottom: 1mm;
  }
  
  .logo {
    height: 10mm;
    margin-bottom: 1mm;
  }
  
  .synagogue-name {
    font-size: 14px;
    font-weight: 900;
    text-align: center;
  }
  
  .address {
    font-size: 10px;
    font-weight: 800;
    text-align: center;
    margin-bottom: 2mm;
  }
  
  .receipt-number {
    font-size: 13px;
    font-weight: 900;
    text-align: center;
    margin-bottom: 1mm;
  }
  
  .dates {
    font-size: 10px;
    font-weight: 800;
    text-align: center;
    margin-bottom: 2mm;
  }
  
  .separator {
    width: 100%;
    border-top: 2px dashed #000;
    margin: 1.5mm 0;
  }
  
  .detail-row {
    width: 100%;
    display: flex;
    justify-content: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 800;
    padding: 0.5mm 1mm;
  }
  
  .total-section {
    text-align: center;
    padding: 2mm 0;
  }
  
  .total-label {
    font-size: 12px;
    font-weight: 900;
  }
  
  .total-amount {
    font-size: 22px;
    font-weight: 900;
  }
  
  .footer {
    text-align: center;
    margin-top: auto;
  }
  
  .footer .thanks {
    font-size: 12px;
    font-weight: 900;
    margin-bottom: 1mm;
  }
  
  .footer .info {
    font-size: 10px;
    font-weight: 800;
  }
</style>
</head>
<body>
<div class="receipt">
  <div class="bsd">בס"ד</div>
  <div class="synagogue-name">בית כנסת "ברית שלום" עכו</div>
  <div class="address">רח' קדושי קהיר 18, עכו</div>
  <div class="receipt-number">קבלה מספר: ${receipt.receipt_number || ''}</div>
  <div class="dates">${gregDate} • ${hebrewDate}</div>
  <div class="separator"></div>
  <div class="detail-row"><span>התקבל מאת:</span><span>${memberName}</span></div>
  <div class="detail-row"><span>עבור:</span><span>${description}</span></div>
  <div class="detail-row"><span>אמצעי תשלום:</span><span>${method}</span></div>
  <div class="separator"></div>
  <div class="total-section">
    <div class="total-label">סה״כ שולם</div>
    <div class="total-amount">${amount}</div>
  </div>
  <div class="separator"></div>
  <div class="footer">
    <div class="thanks">תודה על תרומתכם!</div>
    <div class="info">בית כנסת "ברית שלום" עכו</div>
    <div class="info">רח' קדושי קהיר 18 עכו</div>
    <div class="info">טלפון: 050-5768723</div>
  </div>
</div>
</body>
</html>`;
}

let logoBase64Cache: string | null = null;

async function getLogoBase64(): Promise<string | null> {
  if (logoBase64Cache) return logoBase64Cache;
  try {
    const response = await fetch('/brit-shalom-logo.jpeg');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        logoBase64Cache = reader.result as string;
        resolve(logoBase64Cache);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function silentPrintReceipt(receipt: ReceiptData): Promise<void> {
  const logo = await getLogoBase64();
  const html = buildReceiptHTML(receipt, logo || undefined);

  return new Promise((resolve) => {
    // Create hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-10000px';
    iframe.style.left = '-10000px';
    iframe.style.width = '80mm';
    iframe.style.height = '120mm';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(iframe);
      resolve();
      return;
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Wait for fonts and images to load, then print
    iframe.onload = () => {
      setTimeout(() => {
        try {
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn('Silent print failed, falling back:', e);
          window.print();
        }
        // Clean up after print dialog closes
        setTimeout(() => {
          document.body.removeChild(iframe);
          resolve();
        }, 1000);
      }, 500);
    };
  });
}
