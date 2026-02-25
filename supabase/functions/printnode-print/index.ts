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

    if (!apiKey || !printerId) throw new Error("Missing PrintNode Config");

    // אנחנו יוצרים תוכן HTML פשוט שיהפוך ל-PDF
    // בצורה הזו העברית תמיד תצא ישר (RTL) ובגופן יפה
    const htmlContent = `
      <div style="width: 280px; font-family: Arial; text-align: right; direction: rtl;">
        <h1 style="font-size: 20px; text-align: center;">בדיקת הדפסה</h1>
        <p style="font-size: 16px;">שלום, זו בדיקה בעברית למדפסת Giant-100</p>
        <hr>
        <p>תאריך: ${new Date().toLocaleDateString("he-IL")}</p>
        <p style="text-align: center; font-weight: bold;">תודה רבה!</p>
      </div>
    `;

    // שלב 1: הופכים את ה-HTML ל-Base64
    const base64Html = btoa(unescape(encodeURIComponent(htmlContent)));

    // שלב 2: שולחים ל-PrintNode כ-PDF_BASE64
    // הערה: בשיטה זו PrintNode Desktop ירנדר את ה-HTML ל-PDF וידפיס
    const printResponse = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId),
        title: "Hebrew PDF Print",
        contentType: "pdf_base64", // שינוי קריטי ל-PDF
        content: base64Html, // כאן אתה יכול לשלוח גם URL של PDF מוכן
        source: "Deno Cloud",
      }),
    });

    const resData = await printResponse.json();
    return new Response(JSON.stringify(resData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
