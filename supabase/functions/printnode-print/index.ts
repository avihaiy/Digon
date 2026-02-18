import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("PRINTNODE_API_KEY");
    const printerId = Deno.env.get("PRINTNODE_PRINTER_ID");
    const { receipt } = await req.json();

    // ─────────────────────────────────────────────
    // HTML עם פונט סטנדרטי וסיבוב
    // ─────────────────────────────────────────────
    const html = `
<html dir="rtl">
<head>
<meta charset="UTF-8">
<style>
  @page { size: 80mm 120mm; margin: 0; }
  body {
    width: 80mm; height: 120mm; margin: 0; padding: 0;
    font-family: "Arial", sans-serif; /* פונט מערכת בטוח */
    display: flex; justify-content: center; align-items: center;
    background: white;
  }
  .wrapper {
    width: 80mm; height: 120mm; padding: 8mm; box-sizing: border-box;
    transform: rotate(180deg); transform-origin: center center;
    display: flex; flex-direction: column; direction: rtl; text-align: right;
  }
  .center { text-align: center; }
  .sep { border-top: 1.5pt dashed black; margin: 10px 0; }
  .amount { font-size: 28pt; font-weight: bold; text-align: center; border: 2pt solid black; margin: 10px 0; padding: 5px; }
  .details { font-size: 14pt; line-height: 1.5; }
</style>
</head>
<body>
  <div class="wrapper">
    <div class="center">
      <div style="font-size: 10pt;">בס"ד</div>
      <div style="font-size: 18pt; font-weight: bold;">בית כנסת "ברית שלום" עכו</div>
      <div style="font-size: 12pt;">רח' קדושי קהיר 18, עכו</div>
    </div>
    <div class="sep"></div>
    <div class="details">
      <div><strong>קבלה:</strong> ${receipt.receipt_number ?? ""}</div>
      <div><strong>תאריך:</strong> ${receipt.greg_date ?? ""}</div>
      <div><strong>עברי:</strong> ${receipt.hebrew_date ?? ""}</div>
    </div>
    <div class="sep"></div>
    <div class="details">
      <div><strong>מאת:</strong> ${receipt.member_name ?? "-"}</div>
      <div><strong>עבור:</strong> ${receipt.description ?? ""}</div>
      <div><strong>תשלום:</strong> ${receipt.payment_method ?? ""}</div>
    </div>
    <div class="sep"></div>
    <div class="center" style="font-size: 14pt;">סה"כ שולם:</div>
    <div class="amount">₪ ${receipt.total_amount}</div>
    <div class="sep"></div>
    <div class="center" style="font-size: 11pt; margin-top: auto;">
      תודה על תרומתכם!<br/>050-5768723
    </div>
  </div>
</body>
</html>`;

    // ─────────────────────────────────────────────
    // רינדור כ-Image/PDF "כבד" למניעת ג'יבריש
    // ─────────────────────────────────────────────
    const puppeteer = await import("npm:puppeteer@21.3.8");
    const browser = await puppeteer.default.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();

    await page.setViewport({ width: 800, height: 1200, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle0" });

    // יצירת PDF שבו הטקסט מרונדר כגרפיקה
    const pdfBuffer = await page.pdf({
      width: "80mm",
      height: "120mm",
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    await browser.close();

    const base64Pdf = btoa(new Uint8Array(pdfBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ""));

    // שליחה ל-PrintNode
    const printResponse = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId),
        title: "Receipt",
        contentType: "pdf_base64",
        content: base64Pdf,
      }),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
