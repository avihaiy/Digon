import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * המרה לקידוד Windows-1255 (הקידוד שמופיע ב-Self Test שלך)
 */
function encodeHebrewWPC1255(text: string): Uint8Array {
  // היפוך טקסט חובה כי המדפסת מדפיסה משמאל לימין
  const reversed = text.split("").reverse().join("");
  const bytes = new Uint8Array(reversed.length);

  for (let i = 0; i < reversed.length; i++) {
    const charCode = reversed.charCodeAt(i);
    // אותיות עברית ב-Windows 1255 הן בטווח 0xE0-0xFA
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

    // פקודות בסיסיות ביותר
    const ESC = 0x1b;
    const GS = 0x1d;

    // רצף מינימליסטי: איפוס + הטקסט + ירידת שורה + חיתוך
    const init = [ESC, 0x40];
    const textBytes = encodeHebrewWPC1255("בדיקה מוצלחת בעברית");
    const lineFeed = [0x0a, 0x0a, 0x0a];
    const cut = [GS, 0x56, 0x00]; // פקודת חיתוך בסיסית

    const finalData = new Uint8Array([...init, ...textBytes, ...lineFeed, ...cut]);

    const base64Data = btoa(String.fromCharCode(...finalData));

    const printResponse = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId!),
        title: "Hebrew Fix",
        contentType: "raw_base64",
        content: base64Data,
      }),
    });

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
