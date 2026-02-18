import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Windows-1255 Hebrew encoding map (Unicode → byte value)
// Hebrew letters: 0xE0–0xFA in Windows-1255
const WIN1255: Record<number, number> = {
  0x05D0: 0xE0, // א
  0x05D1: 0xE1, // ב
  0x05D2: 0xE2, // ג
  0x05D3: 0xE3, // ד
  0x05D4: 0xE4, // ה
  0x05D5: 0xE5, // ו
  0x05D6: 0xE6, // ז
  0x05D7: 0xE7, // ח
  0x05D8: 0xE8, // ט
  0x05D9: 0xE9, // י
  0x05DA: 0xEA, // ך
  0x05DB: 0xEB, // כ
  0x05DC: 0xEC, // ל
  0x05DD: 0xED, // ם
  0x05DE: 0xEE, // מ
  0x05DF: 0xEF, // ן
  0x05E0: 0xF0, // נ
  0x05E1: 0xF1, // ס
  0x05E2: 0xF2, // ע
  0x05E3: 0xF3, // ף
  0x05E4: 0xF4, // פ
  0x05E5: 0xF5, // ץ
  0x05E6: 0xF6, // צ
  0x05E7: 0xF7, // ק
  0x05E8: 0xF8, // ר
  0x05E9: 0xF9, // ש
  0x05EA: 0xFA, // ת
  0x20AA: 0xA4, // ₪ shekel sign
  0x201C: 0x93, // " (left double quote)
  0x201D: 0x94, // " (right double quote)
  0x2019: 0x27, // ' → apostrophe
};

// Encode string to Windows-1255 byte array
function encodeWin1255(text: string): number[] {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (code < 0x80) {
      // Pure ASCII — pass through
      bytes.push(code);
    } else if (WIN1255[code] !== undefined) {
      bytes.push(WIN1255[code]);
    } else {
      // Unmapped char → space
      bytes.push(0x20);
    }
  }
  return bytes;
}

// RTL: reverses word order and Hebrew characters, keeps numbers/Latin intact
function rtl(text: string = ""): string {
  return text
    .split(" ")
    .map(word => {
      // Numbers, currency symbols, punctuation — keep as-is
      if (/^[0-9₪:\/\.\-,]+$/.test(word)) return word;
      // Latin/English words — keep as-is (don't reverse)
      if (/^[a-zA-Z]+$/.test(word)) return word;
      // Hebrew words — reverse characters for LTR printer output
      return word.split("").reverse().join("");
    })
    .reverse() // Reverse word order for RTL display
    .join(" ");
}

function buildReceipt(receipt: any): string {
  const ESC = "\x1B";
  const GS = "\x1D";

  const LINE = "------------------------------------------"; // 42 chars = 80mm

  // Helper: ESC/POS control sequence bytes (ASCII only)
  const ctrl = (s: string): number[] => s.split("").map(c => c.charCodeAt(0));

  const allBytes: number[] = [
    ...ctrl(ESC + "@"),            // Initialize printer
    ...ctrl(ESC + "t" + "\x11"),  // Windows-1255 Hebrew code page
    ...ctrl(ESC + "a" + "\x01"),  // Center align
    ...ctrl(GS + "!" + "\x00"),   // Normal size

    ...encodeWin1255(rtl('בס"ד')), ...ctrl("\n"),
    ...encodeWin1255(rtl("בית כנסת ברית שלום עכו")), ...ctrl("\n"),
    ...encodeWin1255(rtl("רח' קדושי קהיר 18, עכו")), ...ctrl("\n"),
    ...encodeWin1255(LINE), ...ctrl("\n"),

    ...ctrl(ESC + "a" + "\x02"),  // Right align
    ...encodeWin1255(rtl("קבלה מס': " + receipt.receipt_number)), ...ctrl("\n"),
    ...encodeWin1255(rtl("תאריך: " + receipt.greg_date)), ...ctrl("\n"),
    ...encodeWin1255(rtl("תאריך עברי: " + receipt.hebrew_date)), ...ctrl("\n"),
    ...encodeWin1255(LINE), ...ctrl("\n"),

    ...encodeWin1255(rtl("התקבל מאת: " + receipt.member_name)), ...ctrl("\n"),
    ...encodeWin1255(rtl("עבור: " + (receipt.description || "תרומה"))), ...ctrl("\n"),
    ...encodeWin1255(rtl("אמצעי תשלום: " + receipt.payment_method)), ...ctrl("\n"),
    ...encodeWin1255(LINE), ...ctrl("\n"),

    ...ctrl(ESC + "a" + "\x01"),  // Center
    ...encodeWin1255(rtl('סה"כ שולם:')), ...ctrl("\n\n"),

    ...ctrl(GS + "!" + "\x11"),   // Double size for amount only
    ...encodeWin1255(rtl(
      new Intl.NumberFormat("he-IL", {
        style: "currency",
        currency: "ILS",
        maximumFractionDigits: 0,
      }).format(Number(receipt.total_amount))
    )),
    ...ctrl("\n\n"),

    ...ctrl(GS + "!" + "\x00"),   // Back to normal size
    ...encodeWin1255(rtl("תודה על תרומתכם!")), ...ctrl("\n"),
    ...encodeWin1255("050-5768723"), ...ctrl("\n\n\n"),

    ...ctrl(GS + "V" + "\x00"),   // Cut paper
  ];

  // Convert byte array to Base64
  const binary = String.fromCharCode(...allBytes);
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("PRINTNODE_API_KEY");
    const printerId = Deno.env.get("PRINTNODE_PRINTER_ID");

    if (!apiKey || !printerId) {
      throw new Error("Missing PrintNode credentials");
    }

    const { receipt } = await req.json();

    if (!receipt) {
      return new Response(JSON.stringify({ error: "receipt data is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const base64Content = buildReceipt(receipt);

    const printResponse = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId),
        title: `Receipt #${receipt.receipt_number ?? ""}`,
        contentType: "raw_base64",
        content: base64Content,
        source: "Brit Shalom Receipt System",
      }),
    });

    if (!printResponse.ok) {
      const err = await printResponse.text();
      throw new Error(err);
    }

    const printResult = await printResponse.json();
    return new Response(JSON.stringify({ success: true, jobId: printResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
