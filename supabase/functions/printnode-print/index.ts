import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // טיפול ב-CORS
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { orderItems, totalAmount, orderNumber, customerName } = await req.json();

    const apiKey = Deno.env.get("PRINTNODE_API_KEY");
    const printerId = Deno.env.get("PRINTNODE_PRINTER_ID");

    if (!apiKey || !printerId) throw new Error("Missing PrintNode Config");

    // עיצוב הקבלה ב-HTML (יהפוך לגרפיקה נקייה ב-PDF)
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: sans-serif; width: 260px; margin: 0; padding: 10px; font-size: 14px; }
          .header { text-align: center; font-weight: bold; font-size: 18px; border-bottom: 2px solid #000; margin-bottom: 10px; }
          .item { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .total { margin-top: 10px; border-top: 1px dashed #000; padding-top: 5px; font-weight: bold; font-size: 16px; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">הזמנה #${orderNumber || "חדשה"}</div>
        <div style="margin-bottom: 8px;">לקוח: ${customerName || "אורח"}</div>
        
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
        <div style="text-align: center; font-size: 10px; margin-top: 15px;">גרסת הדפסה: 2.0 (PDF Mode)</div>
      </body>
      </html>
    `;

    // המרה בטוחה ל-Base64 שתומכת בעברית
    const encoder = new TextEncoder();
    const base64Html = btoa(String.fromCharCode(...encoder.encode(htmlContent)));

    // שליחה ל-PrintNode - שים לב לשינויים ב-Title וב-contentType
    const response = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId),
        title: `VER_2.0_PDF_ORDER_${orderNumber || "1034"}`, // כותרת חדשה לרענון
        contentType: "pdf_base64", // חובה: זה מה שמוחק את הג'יבריש
        content: base64Html,
        source: "Lovable System",
      }),
    });

    const result = await response.json();
    return new Response(JSON.stringify(result), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
