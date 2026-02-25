import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * פונקציה להמרת טקסט יוניקוד לעברית PC862 (הקידוד של המדפסת)
 * כולל היפוך מחרוזת לתמיכה ב-Right-to-Left
 */
function encodeHebrewForGiant100(text: string): Uint8Array {
  // 1. היפוך הטקסט - המדפסת מדפיסה משמאל לימין
  const reversed = text.split("").reverse().join("");
  const bytes = new Uint8Array(reversed.length);

  for (let i = 0; i < reversed.length; i++) {
    const charCode = reversed.charCodeAt(i);
    // אותיות עברית ביוניקוד (א-ת)
    if (charCode >= 0x05d0 && charCode <= 0x05ea) {
      // המרה לערך בטבלת PC862 (האות א' מתחילה ב-0x80)
      bytes[i] = charCode - 0x05d0 + 0x80;
    }
    // טיפול בסימן השקל (₪) - בדרך כלל 0xA4 או 0x9F
    else if (charCode === 0x20aa) {
      bytes[i] = 0xa4;
    } else {
      bytes[i] = charCode; // מספרים, אנגלית וסימני פיסוק
    }
  }
  return bytes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("PRINTNODE_API_KEY");
    const printerId = Deno.env.get("PRINTNODE_PRINTER_ID");

    if (!apiKey || !printerId) {
      throw new Error("Missing PrintNode configuration (API Key or Printer ID)");
    }

    // --- הגדרת פקודות ESC/POS ---
    const ESC = 0x1b;
    const GS = 0x1d;

    const init = [ESC, 0x40]; // אתחול המדפסת

    // ב-GIANT-100 עברית היא בדרך כלל טבלה 10 (0x0A) או 22 (0x16)
    // ננסה להגדיר את טבלה 10 כברירת מחדל:
    const selectHebrewTable = [ESC, 0x74, 0x0a];

    // הגדרת מצב עברית בינלאומי (ישראל = 13 עשרוני / 0x0D)
    const internationalCharSet = [ESC, 0x52, 0x0d];

    // הכנת הטקסט
    const title = encodeHebrewForGiant100("בדיקת הדפסה - סאמסונג Giant 100");
    const subTitle = encodeHebrewForGiant100("עברית עובדת בהצלחה!");
    const price = encodeHebrewForGiant100('מחיר: 150 ש"ח');

    const lineFeed = [0x0a];
    const cut = [0x0a, 0x0a, 0x0a, GS, 0x56, 0x41, 0x03]; // חיתוך נייר

    // חיבור כל הבייטים למערך אחד
    const finalBuffer = new Uint8Array([
      ...init,
      ...internationalCharSet,
      ...selectHebrewTable,
      ...lineFeed,
      ...title,
      ...lineFeed,
      ...subTitle,
      ...lineFeed,
      ...price,
      ...cut,
    ]);

    // המרה ל-Base64 עבור PrintNode
    const base64Data = btoa(String.fromCharCode(...finalBuffer));

    const printResponse = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId),
        title: "Hebrew Test Giant-100",
        contentType: "raw_base64",
        content: base64Data,
        source: "Deno Script",
      }),
    });

    if (!printResponse.ok) {
      const errorText = await printResponse.text();
      throw new Error(`PrintNode API error: ${errorText}`);
    }

    return new Response(JSON.stringify({ success: true, message: "Printed successfully" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
