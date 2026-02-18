import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// פונקציה לניקוי HTML
function escapeHtml(str: string = "") {
  return str.replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[m]!,
  );
}

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

    // HTML מותאם ל-SAM4S GIANT-100
    const html = `
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <style>
        @page { margin: 0; }

        body {
          width: 72mm;
          margin: 0 auto;
          padding: 4mm 2mm;
          font-family: "Courier New", monospace;
          font-size: 12px;
          direction: rtl;
          text-align: right;
          box-sizing: border-box;
        }

        .center { text-align: center; }

        .sep {
          border-top: 1px dashed #000;
          margin: 6px 0;
        }

        .amount-label {
          text-align: center;
          margin-top: 6px;
        }

        .amount {
          font-size: 20px;
          font-weight: bold;
          text-align: center;
          direction: ltr;
        }

        .footer {
          margin-top: 10px;
          font-size: 11px;
          text-align: center;
        }
      </style>
    </head>
    <body>

      <div class="center">
        <div>בס"ד</div>
        <strong>בית כנסת "ברית שלום" עכו</strong><br/>
        רח' קדושי קהיר 18, עכו
      </div>

      <div class="sep"></div>

      <div><strong>קבלה מספר:</strong> ${escapeHtml(receipt.receipt_number)}</div>
      <div><strong>תאריך:</strong> ${escapeHtml(receipt.greg_date)}</div>
      <div><strong>תאריך עברי:</strong> ${escapeHtml(receipt.hebrew_date)}</div>

      <div class="sep"></div>

      <div><strong>התקבל מאת:</strong> ${escapeHtml(receipt.member_name)}</div>
      <div><strong>עבור:</strong> ${escapeHtml(receipt.description || "תרומה")}</div>
      <div><strong>אמצעי תשלום:</strong> ${escapeHtml(receipt.payment_method)}</div>

      <div class="sep"></div>

      <div class="amount-label">סה"כ שולם:</div>
      <div class="amount">
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

    </body>
    </html>
    `;

    // יצירת PDF נכון ל-80mm
    const puppeteer = await import("npm:puppeteer@21.3.8");
    const browser = await puppeteer.default.launch({
      args: ["--no-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      width: "72mm", // חשוב מאוד למדפסת 80mm
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    await browser.close();

    // המרה תקינה ל-Base64
    const base64Pdf = Buffer.from(pdfBuffer).toString("base64");

    // שליחה ל-PrintNode עם rotate תקין
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
        options: {
          rotate: 180, // פותר הדפסה הפוכה
        },
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
