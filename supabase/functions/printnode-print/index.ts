import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // טיפול ב-CORS
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // קבלת נתונים מהאפליקציה
    const { orderItems, totalAmount, orderNumber, customerName } = await req.json();

    const apiKey = Deno.env.get("PRINTNODE_API_KEY");
    const printerId = Deno.env.get("PRINTNODE_PRINTER_ID");

    if (!apiKey || !printerId) throw new Error("Missing PrintNode Config");

    // בניית HTML - שיטה זו הופכת את הטקסט לגרפיקה ומונעת ג'יבריש
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; width: 260px; margin: 0; padding: 10px; font-size: 14px; }
          .header { text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 10px; border-bottom: 2px solid black; }
          .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .total { margin-top: 10px; border-top: 1px dashed black; padding-top: 5px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">הזמנה #${orderNumber || "חדשה"}</div>
        <div style="margin-bottom: 10px;">לקוח: ${customerName || "אורח"}</div>
        ${orderItems
          ?.map(
            (item: any) => `
          <div class="item">
            <span>${item.name}</span>
            <span>${item.price} ₪</span>
          </div>
        `,
          )
          .join("")}
        <div class="total">
          <span>סה"כ לתשלום:</span>
          <span>${totalAmount || 0} ₪</span>
        </div>
      </body>
      </html>
    `;

    // המרה ל-Base64 בקידוד UTF-8 תקין
    const encoder = new TextEncoder();
    const encodedHtml = encoder.encode(htmlContent);
    const base64Html = btoa(String.fromCharCode(...encodedHtml));

    // שליחה ל-PrintNode
    const response = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId),
        // שינינו את ה-Title כדי שתוכל לראות רענון בפאנל
        title: `VER_2_PDF_#${orderNumber || "Test"}`,
        contentType: "pdf_base64", // זה התיקון שמוחק את הג'יבריש
        content: base64Html,
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
