import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import fontkit from "https://esm.sh/@pdf-lib/fontkit@1.1.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* ── helpers ─────────────────────────────────────── */

/** Reverse only Hebrew character runs; leave digits, punctuation, latin as-is */
function smartRtl(text: string): string {
  // Match runs of Hebrew characters (including nikud) and reverse them
  return text.replace(/[\u0590-\u05FF\uFB1D-\uFB4F]+/g, (m) =>
    [...m].reverse().join("")
  );
}

/** Pre-reverse numbers/dates so they appear LTR inside the RTL PDF line */
function preReverseNumbers(text: string): string {
  // Reverse digit groups (including dots, slashes, dashes inside them) so they read LTR
  return text.replace(/[\d/.:-]+/g, (m) => [...m].reverse().join(""));
}

/** Prepare a line for RTL PDF rendering */
function prepareRtlLine(text: string): string {
  // 1. reverse numbers so they stay LTR after the whole-line reversal
  let t = preReverseNumbers(text);
  // 2. reverse the entire line (right-to-left display)
  t = [...t].reverse().join("");
  return t;
}

/* ── main ────────────────────────────────────────── */

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();

    // Support both formats: { receipt: {...} } from remote-print.ts
    // and legacy { orderItems, totalAmount, orderNumber }
    const receipt = body.receipt ?? null;

    const receiptNumber = receipt?.receipt_number ?? body.orderNumber ?? "---";
    const totalAmount = receipt?.total_amount ?? body.totalAmount ?? 0;
    const memberName = receipt?.member_name ?? "---";
    const description = receipt?.description ?? "תרומה";
    const paymentMethod = receipt?.payment_method ?? "---";
    const gregDate = receipt?.greg_date ?? "";
    const hebrewDate = receipt?.hebrew_date ?? "";

    /* ── Load Hebrew font from Storage ─────────── */
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let fontBytes: Uint8Array;
    try {
      const { data: fontData, error: fontError } = await supabase.storage
        .from("expense-receipts")
        .download("fonts/Alef-Regular.ttf");

      if (fontError || !fontData) {
        throw new Error(fontError?.message || "Font not found");
      }
      fontBytes = new Uint8Array(await fontData.arrayBuffer());
    } catch (fontErr) {
      console.warn("Could not load Alef font, falling back to Helvetica:", fontErr);
      fontBytes = null as any;
    }

    /* ── Build PDF ─────────────────────────────── */
    const pdfDoc = await PDFDocument.create();

    // 80mm × 120mm in points (1mm ≈ 2.835pt)
    const pageWidth = 226.8; // 80mm
    const pageHeight = 340.2; // 120mm
    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    let font;
    if (fontBytes) {
      font = await pdfDoc.embedFont(fontBytes, { subset: false });
    } else {
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    const black = rgb(0, 0, 0);
    const gray = rgb(0.4, 0.4, 0.4);

    const drawCenter = (text: string, y: number, size: number, color = black) => {
      const prepared = prepareRtlLine(text);
      const w = font.widthOfTextAtSize(prepared, size);
      page.drawText(prepared, {
        x: (pageWidth - w) / 2,
        y,
        size,
        font,
        color,
      });
    };

    const drawLine = (y: number) => {
      page.drawLine({
        start: { x: 10, y },
        end: { x: pageWidth - 10, y },
        thickness: 0.5,
        color: gray,
      });
    };

    /* ── Layout ────────────────────────────────── */
    let y = pageHeight - 25;

    // Header
    drawCenter("בית כנסת - ברית שלום עכו", y, 10);
    y -= 13;
    drawCenter("רח' קדושי קהיר 18, עכו", y, 7, gray);
    y -= 16;
    drawLine(y);
    y -= 14;

    // Receipt number
    drawCenter(`קבלה מס' ${receiptNumber}`, y, 11);
    y -= 16;

    // Dates
    if (gregDate) {
      drawCenter(gregDate, y, 8, gray);
      y -= 11;
    }
    if (hebrewDate) {
      drawCenter(hebrewDate, y, 8, gray);
      y -= 11;
    }
    y -= 4;
    drawLine(y);
    y -= 14;

    // Member
    drawCenter(`התקבל מאת: ${memberName}`, y, 9);
    y -= 14;

    // Description
    drawCenter(`עבור: ${description}`, y, 9);
    y -= 14;

    // Payment method
    drawCenter(`אמצעי תשלום: ${paymentMethod}`, y, 9);
    y -= 16;
    drawLine(y);
    y -= 18;

    // Total — big and bold-ish
    drawCenter(`סה"כ: ${totalAmount} ₪`, y, 14);
    y -= 20;
    drawLine(y);
    y -= 14;

    // Footer
    drawCenter("תודה רבה!", y, 9, gray);

    /* ── Serialize & send to PrintNode ────────── */
    const pdfBytes = await pdfDoc.save();
    // Chunk the conversion to avoid max call stack size errors
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < pdfBytes.length; i += chunkSize) {
      const chunk = pdfBytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64Pdf = btoa(binary);

    const apiKey = Deno.env.get("PRINTNODE_API_KEY")!;
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
        options: {
          paper: "Custom.80x120mm",
        },
      }),
    });

    const result = await pnResponse.json();
    console.log("PrintNode response:", JSON.stringify(result));

    return new Response(
      JSON.stringify({ success: true, printJobId: result }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("printnode-print error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
