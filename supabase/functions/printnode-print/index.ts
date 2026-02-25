import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // טיפול ב-CORS עבור Lovable
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // קבלת נתונים מהכפתור ב-Lovable
    const { orderItems, totalAmount, orderNumber, customerName } = await req.json();

    const apiKey = Deno.env.get("PRINTNODE_API_KEY");
    const printerId = Deno.env.get("PRINTNODE_PRINTER_ID");

    if (!apiKey || !printerId) throw new Error("Missing PrintNode Config");

    // יצירת תוכן ה-HTML שיהפוך ל-PDF
    // רוחב 260px מתאים בדיוק לנייר 80 מ"מ של ה-Giant-100
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            width: 260px; 
            margin: 0; 
            padding: 10px;
            font-size: 14px;
            line-height: 1.2;
          }
          .header { text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 5px; }
          .info { margin-bottom: 10px; text-align: right; }
          .item-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .total-row { margin-top: 10px; border-top: 1px dashed #000; padding-top: 8px; font-weight: bold; font-size: 16px; display: flex; justify-content: space-between; }
          .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #555; }
        </style>
      </head>
      <body>
        <div class="header">הזמנה #${orderNumber || "חדשה"}</div>
        
        <div class="info">
          <strong>לקוח:</strong> ${customerName || "אורח"}<br>
          <strong>תאריך:</strong> ${new Date().toLocaleDateString("he-IL")} ${new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
        </div>

        <div style="border-bottom: 1px solid #eee; margin-bottom: 8px;"></div>

        ${
          orderItems && orderItems.length > 0
            ? orderItems
                .map(
                  (item: any) => `
          <div class="item-row">
            <span>${item.name} ${item.quantity ? `x${item.quantity}` : ""}</span>
            <span>${item.price} ₪</span>
          </div>
        `,
                )
                .join("")
            : '<div style="text-align:center">אין פריטים להצגה</div>'
        }

        <div class="total-row">
          <span>סה"כ לתשלום:</span>
          <span>${totalAmount || 0} ₪</span>
        </div>

        <div class="footer">
          תודה רבה!<br>
          הודפס ממערכת Lovable
        </div>
      </body>
      </html>
    `;

    // המרה ל-Base64 בצורה תקינה לעברית (UTF-8)
    const uint8array = new TextEncoder().encode(htmlContent);
    const base64Html = btoa(String.fromCharCode(...uint8array));

    // שליחת הפקודה ל-PrintNode כפורמט PDF (הפתרון לג'יבריש)
    const printResponse = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId),
        title: `Order_${orderNumber || "receipt"}`,
        contentType: "pdf_base64", // שינוי לפורמט גרפי
        content: base64Html,
        source: "Lovable-App",
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
