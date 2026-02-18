import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey    = Deno.env.get("PRINTNODE_API_KEY");
    const printerId = Deno.env.get("PRINTNODE_PRINTER_ID");

    if (!apiKey || !printerId) {
      return new Response(
        JSON.stringify({ error: "PrintNode credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { renderedReceiptHTML, receiptNumber } = await req.json();

    if (!renderedReceiptHTML) {
      return new Response(
        JSON.stringify({ error: "renderedReceiptHTML is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Wrap the rendered HTML snippet in a full HTML document with RTL + UTF-8 + thermal width
    const fullHtml = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@700;800;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      direction: rtl;
      text-align: right;
      width: 80mm;
      max-width: 280px;
      margin: 0 auto;
      font-family: 'Heebo', Arial, sans-serif;
      font-weight: 700;
      color: #000;
      background: #fff;
    }
  </style>
</head>
<body>
  ${renderedReceiptHTML}
</body>
</html>`;

    const printResponse = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId:   parseInt(printerId, 10),
        title:       `Receipt #${receiptNumber || "N/A"}`,
        contentType: "html",
        content:     fullHtml,
        source:      "Brit Shalom Receipt System",
      }),
    });

    if (!printResponse.ok) {
      const errorText = await printResponse.text();
      return new Response(
        JSON.stringify({ error: "PrintNode API error", details: errorText }),
        { status: printResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const printResult = await printResponse.json();
    return new Response(
      JSON.stringify({ success: true, jobId: printResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
