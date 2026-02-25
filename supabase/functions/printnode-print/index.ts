import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // טיפול ב-CORS עבור Lovable/Browser
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // שליפת נתונים מהגוף של הבקשה (מהכפתור ב-Lovable)
    const { orderItems, totalAmount, orderNumber, customerName } = await req.json();

    const apiKey = Deno.env.get("PRINTNODE_API_KEY");
    const printerId = Deno.env.get("PRINTNODE_PRINTER_ID");

    if (!apiKey || !printerId) throw new Error("Missing PrintNode Config");

    // יצירת מבנה הקבלה ב-HTML (זה מה שמונע את הג'יבריש)
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: sans-serif; width: 260px; margin: 0; padding: 10px; font-size: 14px; line-height: 1.4; }
          .header { text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 10px; border-bottom: 2px solid #000; }
          .order-info { margin-bottom: 15px; text-align: right; }
          .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
          .total { margin-top: 10px; border-top: 1px dashed #000; padding-top: 5px; font-weight: bold; font-size: 16px; display: flex; justify-content: space-between; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #666; }
        </style>
      </head>
      <body>
        <div class="header">הזמנה #${orderNumber || "חדשה"}</div>
        <div class="order-info">
          <strong>לקוח:</strong> ${customerName || "אורח"}<br>
          <strong>תאריך:</strong> ${new Date().toLocaleDateString("he-IL")}
        </div>
        
        <div style="border-bottom: 1px solid #eee; margin-bottom: 5px;"></div>
        
        ${
          orderItems
            ?.map(
              (item: any) => `
          <div class="item">
            <span>${item.name} x ${item.quantity || 1}</span>
            <span>${item.price} ₪</span>
          </div>
        `,
            )
            .join("") || '<div class="item">אין פריטים</div>'
        }
        
        <div class="total">
          <span>סה"כ לתשלום:</span>
          <span>${totalAmount || 0} ₪</span>
        </div>
        
        <div class="footer">תודה רבה! הדפסה מהירה מ-Lovable</div>
      </body>
      </html>
    `;

    // המרה ל-Base64 בשיטה שתומכת בעברית (UTF-8)
    const uint8array = new TextEncoder().encode(htmlContent);
    const base64Html = btoa(String.fromCharCode(...uint8array));

    // שליחת פקודת ההדפסה כ-PDF
    const printResponse = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId),
        title: `Order_${orderNumber || "Test"}`,
        contentType: "pdf_base64", // חובה: זה מה שגורם להדפסה לצאת כגרפיקה נקייה
        content: base64Html,
        source: "Lovable App",
      }),
    });

    const result = await printResponse.json();
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
