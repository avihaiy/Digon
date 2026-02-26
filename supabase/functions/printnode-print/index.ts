import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { orderItems, totalAmount, orderNumber } = await req.json();
    const apiKey = Deno.env.get("PRINTNODE_API_KEY");
    const printerId = Deno.env.get("PRINTNODE_PRINTER_ID");

    const htmlContent = `
      <div style="width: 260px; font-family: Arial; direction: rtl; text-align: right;">
        <h2 style="text-align: center;">הזמנה #${orderNumber || "1034"}</h2>
        <p>בדיקה: עברית בפורמט PDF</p>
        <hr>
        <div style="font-weight: bold;">סה"כ: ${totalAmount || 0} ₪</div>
      </div>
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
        printerId: parseInt(printerId!),
        title: `FORCE_PDF_V3_#${orderNumber || "1034"}`,
        contentType: "pdf_base64", // כאן השינוי שימנע ג'יבריש
        content: base64Html,
      }),
    });

    const result = await response.json();
    return new Response(JSON.stringify(result), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
