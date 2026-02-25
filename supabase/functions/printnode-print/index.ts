import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { orderData } = await req.json(); // נניח שאתה מעביר נתוני הזמנה מהכפתור
    const apiKey = Deno.env.get("PRINTNODE_API_KEY");
    const printerId = Deno.env.get("PRINTNODE_PRINTER_ID");

    // יצירת HTML מעוצב - זה יצא בדיוק כמו שזה נראה בדפדפן
    const htmlContent = `
      <div style="width: 260px; font-family: Arial; direction: rtl; text-align: right;">
        <h2 style="text-align: center;">הזמנה מהירה</h2>
        <p>פריט: ${orderData?.itemName || "בדיקה"}</p>
        <p>מחיר: ${orderData?.price || "0"} ₪</p>
        <div style="border-top: 1px dashed black; margin-top: 10px; padding-top: 5px;">
           <strong>סה"כ לתשלום: ${orderData?.price || "0"} ₪</strong>
        </div>
      </div>
    `;

    // המרה ל-Base64 בפורמט שתומך בעברית (UTF-8)
    const encoder = new TextEncoder();
    const uint8array = encoder.encode(htmlContent);
    const base64Html = btoa(String.fromCharCode(...uint8array));

    const printResponse = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId!),
        title: "Quick Print Hebrew",
        contentType: "pdf_base64", // שינוי קריטי! זה מה שמונע ג'יבריש
        content: base64Html,
      }),
    });

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
