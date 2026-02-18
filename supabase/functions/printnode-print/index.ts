import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { PDFDocument, rgb } from "npm:pdf-lib@1.17.1";
import fontkit from "npm:@pdf-lib/fontkit@1.1.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Hebrew font served from the published app's public folder
const HEBREW_FONT_URL = "https://brit-shlum.lovable.app/fonts/Alef-Regular.ttf";

// Pre-reversal strategy for Hebrew text in a LTR PDF renderer:
// 1. Reverse the entire string so Hebrew displays RTL.
// 2. Re-reverse number/currency sequences so they keep correct digit order.
function prepareRTL(text: string): string {
  const reversed = [...text].reverse().join("");
  // Re-reverse digits and the ₪ shekel sign so numbers stay intact
  return reversed.replace(/[\u20AA]?[0-9][0-9,.'\u20AA]*/g, (m) =>
    [...m].reverse().join("")
  );
}

function uint8ToBase64(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("PRINTNODE_API_KEY");
    const printerId = Deno.env.get("PRINTNODE_PRINTER_ID");

    if (!apiKey || !printerId) {
      return new Response(
        JSON.stringify({ error: "PrintNode credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const receipt = body.receipt;

    if (!receipt) {
      return new Response(
        JSON.stringify({ error: "receipt data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Fetch Hebrew font ────────────────────────────────────────────────────
    const fontRes = await fetch(HEBREW_FONT_URL);
    if (!fontRes.ok) throw new Error(`Could not fetch font: ${fontRes.status}`);
    const fontBytes = await fontRes.arrayBuffer();

    // ── Build PDF ────────────────────────────────────────────────────────────
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const font = await pdfDoc.embedFont(fontBytes);

    // 80 mm = 226.77pt, 120 mm = 340.16pt
    const PAGE_W = 227;
    const PAGE_H = 340;
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    const black = rgb(0, 0, 0);

    let y = PAGE_H - 8;

    const drawText = (raw: string, size: number, gap = 3) => {
      const text = prepareRTL(raw);
      const w = font.widthOfTextAtSize(text, size);
      const x = Math.max(4, (PAGE_W - w) / 2);
      page.drawText(text, { x, y, size, font, color: black });
      y -= size + gap;
    };

    // Plain text without RTL reversal (for dates, phone, amounts)
    const drawPlain = (text: string, size: number, gap = 3) => {
      const w = font.widthOfTextAtSize(text, size);
      const x = Math.max(4, (PAGE_W - w) / 2);
      page.drawText(text, { x, y, size, font, color: black });
      y -= size + gap;
    };

    const drawSep = () => {
      page.drawLine({
        start: { x: 6, y: y + 2 },
        end: { x: PAGE_W - 6, y: y + 2 },
        thickness: 0.5,
        color: black,
        dashArray: [3, 3],
      });
      y -= 8;
    };

    // ── Receipt content ──────────────────────────────────────────────────────
    drawText('בס"ד', 8, 2);
    drawText('בית כנסת "ברית שלום" עכו', 11, 2);
    drawText("רח' קדושי קהיר 18, עכו", 8, 4);

    drawText(`קבלה מספר: ${receipt.receipt_number ?? ""}`, 10, 2);

    if (receipt.greg_date || receipt.hebrew_date) {
      drawPlain(`${receipt.greg_date ?? ""}`, 8, 1);
      drawText(`${receipt.hebrew_date ?? ""}`, 8, 3);
    }

    drawSep();

    drawText(`התקבל מאת: ${receipt.member_name ?? "-"}`, 9, 2);
    drawText(`עבור: ${receipt.description ?? "תרומה"}`, 9, 2);

    const methodMap: Record<string, string> = {
      bit: "ביט",
      cash: "מזומן",
      check: "צ'ק",
      bank_transfer: "העברה בנקאית",
    };
    const method =
      methodMap[receipt.payment_method ?? ""] || receipt.payment_method || "-";
    drawText(`אמצעי תשלום: ${method}`, 9, 4);

    drawSep();

    drawText('סה"כ שולם:', 10, 2);

    const amount = new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(receipt.total_amount));
    drawPlain(amount, 20, 4);

    drawSep();

    drawText("תודה על תרומתכם!", 10, 2);
    drawText('בית כנסת "ברית שלום" עכו', 8, 1);
    drawText("רח' קדושי קהיר 18 עכו", 8, 1);
    drawPlain("050-5768723", 8);

    // ── Encode PDF → Base64 ──────────────────────────────────────────────────
    const pdfBytes = await pdfDoc.save();
    const base64Pdf = uint8ToBase64(pdfBytes);

    // ── Send to PrintNode ────────────────────────────────────────────────────
    const printResponse = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId, 10),
        title: `Receipt #${receipt.receipt_number ?? "N/A"}`,
        contentType: "pdf_base64",
        content: base64Pdf,
        source: "Brit Shalom Receipt System",
      }),
    });

    if (!printResponse.ok) {
      const errorText = await printResponse.text();
      return new Response(
        JSON.stringify({ error: "PrintNode API error", details: errorText }),
        { status: printResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const printResult = await printResponse.json();
    return new Response(
      JSON.stringify({ success: true, jobId: printResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
