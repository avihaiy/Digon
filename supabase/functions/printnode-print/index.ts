import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // טיפול ב-CORS עבור Lovable
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // קבלת הנתונים מהכפתור ב-Lovable
    const { orderItems, totalAmount, orderNumber } = await req.json();

    const apiKey = Deno.env.get("PRINTNODE_API_KEY");
    const printerId = Deno.env.get("PRINTNODE_PRINTER_ID");

    if (!apiKey || !printerId) throw new Error("Missing PrintNode Config");

    // יצירת ה-HTML של הקבלה (יומר ל-PDF ע"י PrintNode)
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; width: 260px; margin: 0; padding: 10px; font-size: 14px; }
          .header { text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 5px; }
          .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .total { margin-top: 10px; border-top: 1px dashed #000; padding-top: 10px; font-weight: bold; font-size: 16px; display: flex; justify-content: space-between; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">הזמנה #${orderNumber || "000"}</div>
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
          <span>סה"כ לתשלום:</span>
          <span>${totalAmount} ₪</span>
        </div>
        <div class="footer">${new Date().toLocaleString("he-IL")}</div>
      </body>
      </html>
    `;

    // המרה ל-Base64 בטוחה לעברית
    const encoder = new TextEncoder();
    const uint8array = encoder.encode(htmlContent);
    const base64Html = btoa(String.fromCharCode(...uint8array));

    // שליחה ל-PrintNode בפורמט PDF
    const response = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId),
        title: `Order_${orderNumber}`,
        contentType: "pdf_base64", // הפורמט שמונע ג'יבריש
        content: base64Html,
        source: "Lovable App",
      }),
    });

    const result = await response.json();
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
