import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PDFDocument, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import fontkit from "https://esm.sh/@pdf-lib/fontkit@1.1.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

let cachedFontBytes: Uint8Array | null = null;

async function loadFont(): Promise<Uint8Array> {
  if (cachedFontBytes) return cachedFontBytes;
  const res = await fetch("https://fonts.gstatic.com/s/alef/v21/FeVQS0BTqb2d8FQRbhHiRRs.ttf");
  if (!res.ok) throw new Error("Failed to load font: " + res.status);
  cachedFontBytes = new Uint8Array(await res.arrayBuffer());
  return cachedFontBytes;
}

// Visual RTL: הופך את כל המחרוזת, ואז משחזר מספרים/אנגלית לסדר הנכון
function rtl(text: string): string {
  if (!text) return "";
  const reversed = [...text].reverse().join("");
  return reversed.replace(/([a-zA-Z0-9:/.,\-+%]+)/g, (m) => [...m].reverse().join(""));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const receipt = body.receipt ?? null;

    const receiptNumber = String(receipt?.receipt_number ?? body.orderNumber ?? "---");
    const totalAmount = String(receipt?.total_amount ?? body.totalAmount ?? "0");
    const memberName = String(receipt?.member_name ?? "---");
    const description = String(receipt?.description ?? "תרומה");
    const paymentMethod = String(receipt?.payment_method ?? "---");
    const gregDate = String(receipt?.greg_date ?? "");
    const hebrewDate = String(receipt?.hebrew_date ?? "");

    const apiKey = Deno.env.get("PRINTNODE_API_KEY")!;
    const printerId = Deno.env.get("PRINTNODE_PRINTER_ID")!;
    if (!apiKey || !printerId) throw new Error("Missing PRINTNODE_API_KEY or PRINTNODE_PRINTER_ID");

    const fontBytes = await loadFont();

    // ── חישוב גובה דינמי לפי תוכן ──
    const pageWidth = 226.8; // 80mm
    const margin = 12;

    // חישוב כמה שורות יש
    let estimatedHeight = 28; // padding עליון
    estimatedHeight += 18 + 15 + 20; // כותרת 3 שורות
    estimatedHeight += 2 + 18; // קו + קבלה
    estimatedHeight += 16; // מספר קבלה
    if (gregDate) estimatedHeight += 14;
    if (hebrewDate) estimatedHeight += 14;
    estimatedHeight += 6 + 2 + 18; // קו + פרטים
    estimatedHeight += 16 + 16 + 22; // 3 שורות פרטים
    estimatedHeight += 2 + 24; // קו + סכום
    estimatedHeight += 32; // סכום
    estimatedHeight += 2 + 20; // קו + תודה
    estimatedHeight += 30; // padding תחתון

    const pageHeight = estimatedHeight;

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    const font = await pdfDoc.embedFont(fontBytes, { subset: false });

    const BLACK = rgb(0, 0, 0);
    const GRAY = rgb(0.35, 0.35, 0.35);

    // RTL מיושר לימין - מודגש
    const drawRtl = (text: string, y: number, size: number, color = BLACK) => {
      if (!text) return;
      const t = rtl(text);
      const w = font.widthOfTextAtSize(t, size);
      const x = pageWidth - margin - w;
      page.drawText(t, { x: x + 0.3, y, size, font, color });
      page.drawText(t, { x, y, size, font, color });
    };

    // ממורכז - מודגש
    const drawCenter = (text: string, y: number, size: number, color = BLACK) => {
      if (!text) return;
      const t = rtl(text);
      const w = font.widthOfTextAtSize(t, size);
      const x = (pageWidth - w) / 2;
      page.drawText(t, { x: x + 0.3, y, size, font, color });
      page.drawText(t, { x, y, size, font, color });
    };

    const drawLine = (y: number, thickness = 0.5) => {
      page.drawLine({
        start: { x: margin, y },
        end: { x: pageWidth - margin, y },
        thickness,
        color: BLACK,
      });
    };

    let y = pageHeight - 28;

    // כותרת
    drawCenter("בית כנסת ברית שלום", y, 14);
    y -= 18;
    drawCenter("עכו", y, 12);
    y -= 15;
    drawCenter("רח קדושי קהיר 18", y, 8, GRAY);
    y -= 20;

    drawLine(y, 1);
    y -= 18;

    // פרטי קבלה
    drawRtl("קבלה מס " + receiptNumber, y, 11);
    y -= 16;
    if (gregDate) {
      drawRtl("תאריך: " + gregDate, y, 9, GRAY);
      y -= 14;
    }
    if (hebrewDate) {
      drawRtl(hebrewDate, y, 9, GRAY);
      y -= 14;
    }

    y -= 6;
    drawLine(y, 0.5);
    y -= 18;

    // פרטי תשלום
    drawRtl("התקבל מאת: " + memberName, y, 10);
    y -= 16;
    drawRtl("עבור: " + description, y, 10);
    y -= 16;
    drawRtl("אמצעי תשלום: " + paymentMethod, y, 10);
    y -= 22;

    drawLine(y, 1);
    y -= 24;

    // סכום
    drawRtl('סה"כ: ' + totalAmount + " ₪", y, 17);
    y -= 32;

    drawLine(y, 0.5);
    y -= 20;

    drawCenter("תודה רבה!", y, 11, GRAY);

    // המרה ל-Base64
    const pdfBytes = await pdfDoc.save();
    let binary = "";
    for (let i = 0; i < pdfBytes.length; i += 8192) {
      binary += String.fromCharCode(...pdfBytes.subarray(i, i + 8192));
    }
    const base64Pdf = btoa(binary);

    // שליחה ל-PrintNode
    const pnResponse = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(apiKey + ":"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId),
        title: "receipt_" + receiptNumber,
        contentType: "pdf_base64",
        content: base64Pdf,
      }),
    });

    if (!pnResponse.ok) {
      const errText = await pnResponse.text();
      throw new Error("PrintNode error: " + errText);
    }

    const result = await pnResponse.json();
    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error:", err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
