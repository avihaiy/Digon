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

    if (!apiKey || !printerId) {
      throw new Error("Missing PrintNode configuration");
    }

    const { receipt } = await req.json();

    // ===============================
    // HTML קבלה – עברית תקינה
    // ===============================
    const html = `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
  body {
    width: 576px; /* מותאם למדפסת 80mm */
    margin: 0;
    padding: 20px;
    font-family: Arial, sans-serif;
    direction: rtl;
    text-align: center;
    background: white;
  }
  .sep {
    border-top: 2px solid black;
    margin: 10px 0;
  }
  .details {
    text-align: right;
    font-size: 16px;
    line-height: 1.6;
  }
  .amount {
    font-size: 28px;
    font-weight: bold;
    border: 2px solid black;
    padding: 8px;
    margin: 10px 0;
  }
</style>
</head>
<body>

<div style="font-size:14px;">בס"ד</div>
<div style="font-size:22px; font-weight:bold;">בית כנסת "ברית שלום" עכו</div>
<div style="font-size:14px;">רח' קדושי קהיר 18, עכו</div>

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

<div style="font-size:18px;">סה"כ שולם:</div>
<div class="amount">₪ ${receipt.total_amount ?? "0"}</div>

<div class="sep"></div>

<div style="font-size:14px;">
תודה על תרומתכם!<br/>
050-5768723
</div>

</body>
</html>
`;

    // ===============================
    // Puppeteer – יצירת PNG תקין
    // ===============================
    const puppeteer = await import("npm:puppeteer@21.3.8");

    const browser = await puppeteer.default.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.setViewport({
      width: 576,
      height: 1000,
      deviceScaleFactor: 2,
    });

    await page.setContent(html, { waitUntil: "networkidle0" });

    // לחכות לפונטים
    await page.evaluateHandle("document.fonts.ready");

    // גובה דינמי
    const height = await page.evaluate(() => document.body.scrollHeight);

    const pngBuffer = await page.screenshot({
      type: "png",
      clip: {
        x: 0,
        y: 0,
        width: 576,
        height: Math.ceil(height),
      },
    });

    await browser.close();

    const base64Png = pngBuffer.toString("base64");

    // ===============================
    // שליחה ל-PrintNode
    // ===============================
    const printResponse = await fetch("https://api.printnode.com/printjobs", {
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

    if (!printResponse.ok) {
      const errorText = await printResponse.text();
      throw new Error(errorText);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
