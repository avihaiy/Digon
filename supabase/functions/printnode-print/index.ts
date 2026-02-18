import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("PRINTNODE_API_KEY");
    const printerId = Deno.env.get("PRINTNODE_PRINTER_ID");

    if (!apiKey || !printerId) {
      throw new Error("Missing PrintNode credentials");
    }

    const { receipt } = await req.json();

    if (!receipt) {
      return new Response(JSON.stringify({ error: "receipt data is required" }), { status: 400, headers: corsHeaders });
    }

    // ─────────────────────────────────────────────
    // HTML מותאם לסיבוב 180 מעלות עבור SAM4S
    // ─────────────────────────────────────────────
    const html = `
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<style>
/* הגדרת גודל דף פיזי התואם להגדרות הדרייבר שבתמונה */
@page {
size: 80mm 120mm;
margin: 0;
}

body {
width: 80mm;
height: 120mm;
margin: 0;
padding: 0;
font-family: Arial, sans-serif;
display: flex;
justify-content: center;
align-items: center;
background-color: white;
}

/* המכולה הראשית שמסובבת את הכל */
.rotate-container {
width: 80mm;
height: 120mm;
padding: 6mm;
box-sizing: border-box;
transform: rotate(180deg);
transform-origin: center center;
display: flex;
flex-direction: column;
direction: rtl;
text-align: right;
}

.center { text-align: center; }

.sep {
border-top: 1px dashed #000;
margin: 10px 0;
}

.amount-box {
font-size: 28px;
font-weight: bold;
text-align: center;
border: 2px solid #000;
margin: 15px 0;
padding: 10px;
}

.header-title {
font-size: 18px;
font-weight: bold;
margin-bottom: 2px;
}

.details {
font-size: 14px;
line-height: 1.4;
}

.footer {
margin-top: auto;
padding-bottom: 10mm; /* ריווח מהחיתוך */
font-size: 12px;
text-align: center;
}
</style>
</head>
<body>
<div class="rotate-container">
<div class="center">
<div>בס"ד</div>
<div class="header-title">בית כנסת "ברית שלום" עכו</div>
<div>רח' קדושי קהיר 18, עכו</div>
</div>

<div class="sep"></div>

<div class="details">
<div><strong>קבלה מספר:</strong> ${receipt.receipt_number ?? ""}</div>
<div><strong>תאריך:</strong> ${receipt.greg_date ?? ""}</div>
<div><strong>תאריך עברי:</strong> ${receipt.hebrew_date ?? ""}</div>
</div>

<div class="sep"></div>

<div class="details">
<div><strong>התקבל מאת:</strong> ${receipt.member_name ?? "-"}</div>
<div><strong>עבור:</strong> ${receipt.description ?? "תרומה"}</div>
<div><strong>אמצעי תשלום:</strong> ${receipt.payment_method ?? "-"}</div>
</div>

<div class="sep"></div>

<div class="center">סה"כ שולם:</div>
<div class="amount-box">
${new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 0,
}).format(Number(receipt.total_amount))}
</div>

<div class="sep"></div>

<div class="footer">
תודה על תרומתכם!<br/>
נציג: 050-5768723
</div>
</div>
</body>
</html>
`;

    // ─────────────────────────────────────────────
    // רינדור PDF דרך Puppeteer
    // ─────────────────────────────────────────────
    const puppeteer = await import("npm:puppeteer@21.3.8");
    const browser = await puppeteer.default.launch({
      args: ["--no-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      width: "80mm",
      height: "120mm",
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    await browser.close();

    const base64Pdf = btoa(new Uint8Array(pdfBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ""));

    // ─────────────────────────────────────────────
    // שליחה ל-PrintNode
    // ─────────────────────────────────────────────
    const printResponse = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId),
        title: `Receipt #${receipt.receipt_number ?? ""}`,
        contentType: "pdf_base64",
        content: base64Pdf,
        source: "Brit Shalom Receipt System",
      }),
    });

    if (!printResponse.ok) {
      const err = await printResponse.text();
      throw new Error(err);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
