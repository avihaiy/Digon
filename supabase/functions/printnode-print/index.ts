import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // טיפול ב-CORS עבור Lovable
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("PRINTNODE_API_KEY");
    const printerId = Deno.env.get("PRINTNODE_PRINTER_ID");

    if (!apiKey || !printerId) throw new Error("Missing PrintNode Config");

    // 1. יצירת תוכן ה-HTML שיהפוך ל-PDF
    // רוחב 280px הוא אידיאלי למדפסות 80 מ"מ כמו ה-Giant-100
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
          }
          .header { font-size: 20px; font-weight: bold; text-align: center; margin-bottom: 10px; }
          .details { font-size: 14px; margin-bottom: 5px; text-align: right; }
          .line { border-top: 1px dashed black; margin: 10px 0; }
          .total { font-size: 18px; font-weight: bold; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">הזמנה מ-Lovable</div>
        <div class="details">לקוח: ישראל ישראלי</div>
        <div class="details">פריט: פיצה משפחתית</div>
        <div class="line"></div>
        <div class="total">סה"כ: 85.00 ₪</div>
        <div style="text-align: center; font-size: 10px; margin-top: 20px;">
          הודפס דרך PrintNode API
        </div>
      </body>
      </html>
    `;

    // 2. המרה ל-Base64 בצורה שתומכת בעברית (UTF-8)
    const encoder = new TextEncoder();
    const uint8array = encoder.encode(htmlContent);
    const base64Html = btoa(String.fromCharCode(...uint8array));

    // 3. שליחה ל-PrintNode בפורמט PDF
    const printResponse = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId),
        title: "Lovable Hebrew PDF",
        contentType: "pdf_base64", // זה הקריטי - אומר ל-PrintNode לרנדר גרפיקה
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
