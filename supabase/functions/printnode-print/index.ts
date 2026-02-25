import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * המרה לעברית Windows-1255 (הקידוד שמופיע ב-Self Test שלך)
 */
function encodeHebrewWPC1255(text: string): Uint8Array {
  // היפוך טקסט עבור RTL
  const reversed = text.split("").reverse().join("");
  const bytes = new Uint8Array(reversed.length);

  for (let i = 0; i < reversed.length; i++) {
    const charCode = reversed.charCodeAt(i);
    // ב-WPC1255 אותיות עברית מתחילות ב-0xE0
    if (charCode >= 0x05d0 && charCode <= 0x05ea) {
      bytes[i] = charCode - 0x05d0 + 0xe0;
    } else {
      bytes[i] = charCode; // מספרים וסימנים
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

    // פקודות אתחול
    const init = [ESC, 0x40];

    // למרות שכתוב ב-Self Test שהיא כבר ב-WPC1255,
    // אנחנו שולחים פקודה ליתר ביטחון (ב-Sam4s זה בד"כ 0x21 עבור 1255)
    const selectCP1255 = [ESC, 0x74, 0x21];

    const textToPrint = "בדיקת הדפסה בעברית - GIANT 100";
    const encodedText = encodeHebrewWPC1255(textToPrint);

    const commands = new Uint8Array([
      ...init,
      ...selectCP1255,
      0x0a, // שורה חדשה
      ...encodedText,
      0x0a,
      0x0a,
      0x0a, // רווח לפני חיתוך
      GS,
      0x56,
      0x41,
      0x03, // חיתוך נייר (מתאים ל-Giant 100)
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
        title: "Hebrew Test WPC1255",
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
