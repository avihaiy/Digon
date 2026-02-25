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

    if (!apiKey || !printerId) throw new Error("Missing Config");

    // בשיטה הזו אנחנו שולחים לינק לקובץ PDF קיים.
    // אם יש לך PDF שנוצר בתוך Lovable או מאוחסן ב-Storage, שים את הלינק שלו כאן.
    // לצורך בדיקה, אני שם כאן לינק לקובץ PDF לדוגמה:
    const pdfUrl = "https://pdf-generator-url-here.com/your-file.pdf";

    const printResponse = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId),
        title: "Final Hebrew PDF Test",
        contentType: "pdf_uri", // שימוש בקישור ישיר לקובץ
        content: pdfUrl,
        source: "Lovable App",
      }),
    });

    const result = await printResponse.json();
    return new Response(JSON.stringify(result), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
