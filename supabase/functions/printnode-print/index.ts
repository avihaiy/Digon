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
    // HTML הקבלה בעברית
    // ─────────────────────────────────────────────
    const html = `
<html dir="rtl">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=David+Libre&display=swap" rel="stylesheet">
<style>
  body {
    width: 800px; /* מותאם להדפסה 80mm */
    margin: 0; padding: 20px;
    font-family: 'David Libre', Arial, sans-serif;
    direction: rtl; text-align: center;
    background: white;
  }
  .wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .center { text-align: center; }
  .sep { border-top: 1.5pt dashed black; margin: 10px 0; width: 100%; }
  .amount { font-size: 28pt; font-weight: bold; text-align: center; border: 2pt solid black; margin: 10px 0; padding: 5px; }
  .details { font-size: 14pt; line-height: 1.5; text-align: right; width: 100%; }
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
    // Puppeteer – המרה ל-PNG עם גובה גמיש
    // ─────────────────────────────────────────────
    const puppeteer = await import("npm:puppeteer@21.3.8");
    const browser = await puppeteer.default.launch({ args: ["--no-sandbox"] });
    const page = await browser.newPage();

    // רוחב 800px מותאם ל-80mm; גובה מותאם לפי תוכן
    await page.setViewport({ width: 800, height: 1200, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: "networkidle0" });

    // הוצאת screenshot עם גובה מותאם אוטומטית לפי תוכן
    const bodyHandle = await page.$("body");
    const boundingBox = await bodyHandle!.boundingBox();
    const pngBuffer = await page.screenshot({
      type: "png",
      clip: {
        x: 0,
        y: 0,
        width: Math.ceil(boundingBox!.width),
        height: Math.ceil(boundingBox!.height),
      },
    });
    await browser.close();

    const base64Png = pngBuffer.toString("base64");

    // ─────────────────────────────────────────────
    // שליחה ל-PrintNode
    // ─────────────────────────────────────────────
    await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId),
        title: "Receipt",
        contentType: "image/png_base64",
        content: base64Png,
      }),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
