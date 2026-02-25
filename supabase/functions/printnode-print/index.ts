import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { orderItems, totalAmount, orderNumber, customerName } = await req.json();
    const apiKey = Deno.env.get("PRINTNODE_API_KEY");
    const printerId = Deno.env.get("PRINTNODE_PRINTER_ID");

    if (!apiKey || !printerId) throw new Error("Missing PrintNode Config");

    // יצירת קבלה בגרפיקה (PDF) למניעת ג'יבריש
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; width: 260px; margin: 0; padding: 10px; font-size: 14px; }
          .header { text-align: center; font-weight: bold; font-size: 18px; border-bottom: 2px solid black; margin-bottom: 10px; }
          .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .total { margin-top: 10px; border-top: 1px dashed black; padding-top: 5px; font-weight: bold; font-size: 16px; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">הזמנה #${orderNumber || "חדשה"}</div>
        <div style="margin-bottom: 10px;">לקוח: ${customerName || "אורח"}</div>
        ${
          orderItems
            ?.map(
              (item: any) => `
          <div class="item">
            <span>${item.name}</span>
            <span>${item.price} ₪</span>
          </div>
        `,
            )
            .join("") || "אין פריטים"
        }
        <div class="total">
          <span>סה"כ:</span>
          <span>${totalAmount || 0} ₪</span>
        </div>
        <div class="footer">גרסה: PDF מנוע 7</div>
      </body>
      </html>
    `;

    const encoder = new TextEncoder();
    const base64Html = btoa(String.fromCharCode(...encoder.encode(htmlContent)));

    const response = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId),
        title: `VER_FINAL_PDF_#${orderNumber || "1034"}`, // כותרת חדשה לזיהוי רענון
        contentType: "pdf_base64", // שינוי קריטי מ-RAW ל-PDF
        content: base64Html,
      }),
    });

    const result = await response.json();
    return new Response(JSON.stringify(result), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
