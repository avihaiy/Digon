import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// פונקציית המרה לעברית Windows-1255 (הסטנדרט של Sam4s Giant-100 בישראל)
function encodeHebrewWindows1255(text: string): Uint8Array {
  // 1. הפיכת הטקסט (RTL)
  const reversed = text.split("").reverse().join("");
  const bytes = new Uint8Array(reversed.length);

  for (let i = 0; i < reversed.length; i++) {
    const charCode = reversed.charCodeAt(i);
    // אותיות עברית ביוניקוד (0x05D0-0x05EA) עוברות ל-0xE0-0xFA ב-Windows-1255
    if (charCode >= 0x05d0 && charCode <= 0x05ea) {
      bytes[i] = charCode - 0x05d0 + 0xe0;
    } else {
      bytes[i] = charCode;
    }
  }
  return bytes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("PRINTNODE_API_KEY");
    const printerId = Deno.env.get("PRINTNODE_PRINTER_ID");

    const ESC = 0x1b;
    const GS = 0x1d;

    // --- רצף פקודות "ברזל" למדפסת Giant-100 ---
    const init = [ESC, 0x40]; // איפוס
    const setIsrael = [ESC, 0x52, 0x0d]; // בחירת ערכת תווים ישראל

    // ניסיון להגדיר טבלה 33 (0x21) - זו הטבלה של עברית Windows ב-Giant 100
    const selectHebrewTable = [ESC, 0x74, 0x21];

    const textStr = "בדיקת הדפסה בעברית";
    const encodedText = encodeHebrewWindows1255(textStr);

    const commands = new Uint8Array([
      ...init,
      ...setIsrael,
      ...selectHebrewTable,
      0x0a, // שורה חדשה
      ...encodedText,
      0x0a,
      0x0a,
      0x0a,
      0x0a, // רווח לסיום
      GS,
      0x56,
      0x41,
      0x03, // חיתוך נייר
    ]);

    const base64Data = btoa(String.fromCharCode(...commands));

    const printResponse = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId!),
        title: "Final Hebrew Test",
        contentType: "raw_base64",
        content: base64Data,
      }),
    });

    const result = await printResponse.json();
    return new Response(JSON.stringify(result), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
