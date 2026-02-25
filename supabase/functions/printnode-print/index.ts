import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("PRINTNODE_API_KEY");
    const printerId = Deno.env.get("PRINTNODE_PRINTER_ID");

    // אנחנו בונים קובץ HTML פשוט.
    // היתרון: PrintNode יהפוך את ה-HTML הזה ל-PDF עבורנו באופן אוטומטי.
    const htmlReceipt = `
      <div style="width: 280px; font-family: Arial; direction: rtl; text-align: right; padding: 10px;">
        <h2 style="text-align: center;">הזמנה מהמערכת</h2>
        <p>שלום, זוהי הדפסה בעברית.</p>
        <p>הקובץ נשלח כפורמט PDF (גרפיקה), בדיוק כפי שהעלית ידנית לאתר.</p>
        <hr>
        <div style="font-weight: bold; font-size: 18px;">סה"כ: 100 ₪</div>
      </div>
    `;

    // קידוד ה-HTML ל-Base64 שתומך בעברית
    const encoder = new TextEncoder();
    const encodedHtml = encoder.encode(htmlReceipt);
    const base64Content = btoa(String.fromCharCode(...encodedHtml));

    const printResponse = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId!),
        title: "API PDF Print",
        // כאן הקסם: במקום raw_base64 אנחנו משתמשים ב-pdf_base64
        contentType: "pdf_base64",
        content: base64Content,
      }),
    });

    const result = await printResponse.json();
    return new Response(JSON.stringify(result), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
