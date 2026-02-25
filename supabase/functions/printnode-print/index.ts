import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// פונקציה להמרת טקסט יוניקוד לעברית PC862 והיפוך סדר התווים (RTL)
function encodeForGiant100(text: string): Uint8Array {
  // 1. הפיכת הטקסט (כדי שיודפס מימין לשמאל)
  const reversed = text.split("").reverse().join("");
  const bytes = new Uint8Array(reversed.length);

  for (let i = 0; i < reversed.length; i++) {
    const charCode = reversed.charCodeAt(i);
    // אותיות עברית ביוניקוד (0x05D0-0x05EA) עוברות ל-0x80-0x9A ב-PC862
    if (charCode >= 0x05d0 && charCode <= 0x05ea) {
      bytes[i] = charCode - 0x05d0 + 0x80;
    } else {
      bytes[i] = charCode; // מספרים וסימנים נשארים כפי שהם
    }
  }
  return bytes;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("PRINTNODE_API_KEY");
    const printerId = Deno.env.get("PRINTNODE_PRINTER_ID");

    // --- פקודות ESC/POS ספציפיות ל-GIANT-100 ---
    const init = [0x1b, 0x40]; // אתחול

    // בחירת טבלת תווים עברית. ב-Giant-100 זה לרוב 10 (0x0A)
    // אם לא עובד, נסה להחליף את 0x0a ב-0x16 (22)
    const selectHebrewTable = [0x1b, 0x74, 0x0a];

    const textToPrint = "בדיקת הדפסה בעברית - GIANT 100";
    const encodedText = encodeForGiant100(textToPrint);

    const lineFeed = [0x0a, 0x0a]; // שתי שורות רווח
    const cut = [0x1d, 0x56, 0x41, 0x03]; // פקודת חיתוך נייר מלאה

    const finalBuffer = new Uint8Array([...init, ...selectHebrewTable, ...encodedText, ...lineFeed, ...cut]);

    const base64Data = btoa(String.fromCharCode(...finalBuffer));

    await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId!),
        title: "Giant-100 Hebrew Test",
        contentType: "raw_base64",
        content: base64Data,
      }),
    });

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
