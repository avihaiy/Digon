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

    // הגדרות בייטים בסיסיות
    const ESC = 0x1b;
    const GS = 0x1d;

    // 1. אתחול נקי של המדפסת
    const init = [ESC, 0x40];

    // 2. פקודה סופר-חשובה ל-Sam4s: בחירת Character Set של ישראל
    const israelSet = [ESC, 0x52, 0x0d];

    // 3. בחירת Code Page 1255 (לפי ה-Self Test שלך)
    // ברוב המדפסות האלו הערך הוא 33 (0x21)
    const selectCP1255 = [ESC, 0x74, 0x21];

    // 4. פונקציית המרה ישירה ל-Windows-1255
    function to1255(text: string): number[] {
      const reversed = text.split("").reverse().join("");
      const result: number[] = [];
      for (let i = 0; i < reversed.length; i++) {
        const charCode = reversed.charCodeAt(i);
        if (charCode >= 0x05d0 && charCode <= 0x05ea) {
          result.push(charCode - 0x05d0 + 0xe0);
        } else {
          result.push(charCode & 0xff);
        }
      }
      return result;
    }

    const textBytes = to1255("עברית ב-Giant 100");

    // 5. בניית מערך הבייטים הסופי
    const finalBuffer = new Uint8Array([
      ...init,
      ...israelSet,
      ...selectCP1255,
      0x0a, // ירידת שורה
      ...textBytes,
      0x0a,
      0x0a,
      0x0a,
      0x0a, // רווח משמעותי בסוף
      GS,
      0x56,
      0x41,
      0x03, // חיתוך נייר
    ]);

    const base64Data = btoa(String.fromCharCode(...finalBuffer));

    const printResponse = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId!),
        title: "Final Attempt",
        contentType: "raw_base64",
        content: base64Data,
      }),
    });

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
