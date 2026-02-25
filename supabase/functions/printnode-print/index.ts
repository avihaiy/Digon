import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("PRINTNODE_API_KEY");
    const printerId = Deno.env.get("PRINTNODE_PRINTER_ID");

    if (!apiKey || !printerId) {
      throw new Error("Missing PrintNode configuration");
    }

    // ============================================================
    // טסט: מדפיסים את כל הטווח 0xe0-0xfa
    // כדי לראות בדיוק אילו תווים המדפסת מציגה
    // ============================================================
    const init = new Uint8Array([0x1b, 0x40]); // Initialize

    // הדפסת טקסט הסבר
    const label = new TextEncoder().encode("TEST HEBREW RANGE:\n");

    // הדפסת bytes 0xe0 עד 0xfa אחד אחד עם מספר לידו
    const testBytes: number[] = [];

    for (let i = 0xe0; i <= 0xfa; i++) {
      // כותב: "E0=" ואז את הבייט עצמו ואז newline
      const hex = i.toString(16).toUpperCase();
      const prefix = new TextEncoder().encode(`0x${hex}=`);
      prefix.forEach((b) => testBytes.push(b));
      testBytes.push(i); // הבייט עצמו
      testBytes.push(0x0a); // newline
    }

    // גם בדיקת 0xa4 (שקל)
    const shekelLabel = new TextEncoder().encode("0xA4=");
    shekelLabel.forEach((b) => testBytes.push(b));
    testBytes.push(0xa4);
    testBytes.push(0x0a);

    const cut = new Uint8Array([0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x00]);

    const finalData = new Uint8Array([...init, ...label, ...testBytes, ...cut]);

    const base64Data = btoa(String.fromCharCode(...finalData));

    const printResponse = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId),
        title: "Hebrew-Range-Test",
        contentType: "raw_base64",
        content: base64Data,
        source: "Debug Test",
      }),
    });

    if (!printResponse.ok) {
      const errText = await printResponse.text();
      throw new Error(`PrintNode error: ${errText}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
