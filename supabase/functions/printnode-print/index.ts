import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// פונקציית עזר להפוך עברית ולהמיר לקידוד PC862 (הסטנדרט של מדפסות תרמיות)
function encodeHebrewPC862(text: string): Uint8Array {
  // היפוך הטקסט (כדי שיודפס מימין לשמאל)
  const reversed = text.split("").reverse().join("");
  const bytes = new Uint8Array(reversed.length);

  for (let i = 0; i < reversed.length; i++) {
    const charCode = reversed.charCodeAt(i);
    // טווח האותיות בעברית ביוניקוד הוא 0x05D0 עד 0x05EA
    // בטבלת PC862 הן מתחילות מ-0x80
    if (charCode >= 0x05d0 && charCode <= 0x05ea) {
      bytes[i] = charCode - 0x05d0 + 0x80;
    } else {
      bytes[i] = charCode; // מספרים ותווים רגילים
    }
  }
  return bytes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("PRINTNODE_API_KEY");
    const printerId = Deno.env.get("PRINTNODE_PRINTER_ID");

    // 1. אתחול המדפסת
    const init = [0x1b, 0x40];

    // 2. פקודה לבחירת טבלת תווים עברית (PC862)
    // ברוב מדפסות Epson/Star זה 0x1B, 0x74, 0x0F (או 15 בעשרוני)
    const selectHebrew = [0x1b, 0x74, 0x0f];

    // 3. כתיבת הטקסט
    const myText = "בדיקת הדפסה בעברית 123";
    const encodedText = encodeHebrewPC862(myText);

    // 4. פקודת חיתוך ורווח בסוף
    const cut = [0x0a, 0x0a, 0x1d, 0x56, 0x00];

    const finalData = new Uint8Array([...init, ...selectHebrew, ...encodedText, ...cut]);
    const base64Data = btoa(String.fromCharCode(...finalData));

    const printResponse = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId!),
        title: "Hebrew Print Test",
        contentType: "raw_base64",
        content: base64Data,
      }),
    });

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
