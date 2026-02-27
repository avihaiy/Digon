import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import fontkit from "https://esm.sh/@pdf-lib/fontkit@1.1.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Visual RTL for pdf-lib: reverse the entire string, then un-reverse
 * any LTR runs (digits, latin, punctuation, currency symbols).
 * This makes Hebrew read correctly in a left-to-right PDF renderer
 * while keeping numbers / dates / ₪ in their natural order.
 */
function prepareRtlLine(text: string): string {
  if (!text) return "";

  // Full reverse
  const reversed = [...text].reverse().join("");

  // Restore every LTR run back to its original order
  // Matches: digits, latin letters, and common punctuation/symbols that should stay LTR
  return reversed.replace(
    /([a-zA-Z0-9₪:/.,\-+%() ]+)/g,
    (_match) => [..._match].reverse().join("")
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const receipt = body.receipt ?? null;

    const receiptNumber = receipt?.receipt_number ?? body.orderNumber ?? "---";
    const totalAmount  = receipt?.total_amount  ?? body.totalAmount ?? 0;
    const memberName   = receipt?.member_name   ?? "---";
    const description  = receipt?.description   ?? "תרומה";
    const paymentMethod = receipt?.payment_method ?? "---";
    const gregDate     = receipt?.greg_date     ?? "";
    const hebrewDate   = receipt?.hebrew_date   ?? "";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let fontBytes: Uint8Array;
    try {
      const { data: fontData, error: fontError } = await supabase.storage
        .from("expense-receipts")
        .download("fonts/Alef-Regular.ttf");
      if (fontError || !fontData) throw new Error("Font not found");
      fontBytes = new Uint8Array(await fontData.arrayBuffer());
    } catch (_fontErr) {
      fontBytes = null as any;
    }

    /* ── Build PDF ── */
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const pageWidth  = 226.8; // 80 mm
    const pageHeight = 567.0; // 200 mm – thermal printer stops at content end
    const margin     = 14.17; // 5 mm side margins

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    let font;
    if (fontBytes) {
      font = await pdfDoc.embedFont(fontBytes, { subset: false });
    } else {
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    /** Draw a line of text right-aligned within the margins */
    const drawRtl = (text: string, y: number, size: number, color = rgb(0, 0, 0)) => {
      const prepared = prepareRtlLine(text);
      const w = font.widthOfTextAtSize(prepared, size);
      page.drawText(prepared, {
        x: pageWidth - margin - w,
        y,
        size,
        font,
        color,
      });
    };

    let y = pageHeight - 30;

    // ── Header ──
    drawRtl("בית כנסת - ברית שלום עכו", y, 12);
    y -= 15;
    drawRtl("רח' קדושי קהיר 18, עכו", y, 9, rgb(0.4, 0.4, 0.4));
    y -= 20;

    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.5 });
    y -= 20;

    // ── Receipt number ──
    drawRtl(`קבלה מס' ${receiptNumber}`, y, 11);
    y -= 18;

    // ── Dates ──
    if (gregDate) {
      drawRtl(gregDate, y, 9, rgb(0.3, 0.3, 0.3));
      y -= 14;
    }
    if (hebrewDate) {
      drawRtl(hebrewDate, y, 9, rgb(0.3, 0.3, 0.3));
      y -= 14;
    }

    y -= 10;

    // ── Details ──
    drawRtl(`התקבל מאת: ${memberName}`, y, 10);
    y -= 18;
    drawRtl(`עבור: ${description}`, y, 10);
    y -= 18;
    drawRtl(`אמצעי תשלום: ${paymentMethod}`, y, 10);
    y -= 25;

    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1 });
    y -= 25;

    // ── Total ──
    drawRtl(`סה"כ: ${totalAmount} ₪`, y, 16);
    y -= 30;
    drawRtl("תודה רבה!", y, 10, rgb(0.4, 0.4, 0.4));

    /* ── Send to PrintNode ── */
    const pdfBytes = await pdfDoc.save();
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < pdfBytes.length; i += chunkSize) {
      binary += String.fromCharCode(...pdfBytes.subarray(i, i + chunkSize));
    }
    const base64Pdf = btoa(binary);

    const apiKey   = Deno.env.get("PRINTNODE_API_KEY")!;
    const printerId = Deno.env.get("PRINTNODE_PRINTER_ID")!;

    const pnResponse = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId),
        title: `receipt_${receiptNumber}`,
        contentType: "pdf_base64",
        content: base64Pdf,
      }),
    });

    const result = await pnResponse.json();
    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
