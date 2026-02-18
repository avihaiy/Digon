import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// PC862 Hebrew encoding (common 0x08 on many SAM4S / ESC-POS printers)
// Hebrew letters live in 0x80–0x9A range
const PC862: Record<number, number> = {
  0x05D0: 0x80, // א
  0x05D1: 0x81, // ב
  0x05D2: 0x82, // ג
  0x05D3: 0x83, // ד
  0x05D4: 0x84, // ה
  0x05D5: 0x85, // ו
  0x05D6: 0x86, // ז
  0x05D7: 0x87, // ח
  0x05D8: 0x88, // ט
  0x05D9: 0x89, // י
  0x05DA: 0x8A, // ך
  0x05DB: 0x8B, // כ
  0x05DC: 0x8C, // ל
  0x05DD: 0x8D, // ם
  0x05DE: 0x8E, // מ
  0x05DF: 0x8F, // ן
  0x05E0: 0x90, // נ
  0x05E1: 0x91, // ס
  0x05E2: 0x92, // ע
  0x05E3: 0x93, // ף
  0x05E4: 0x94, // פ
  0x05E5: 0x95, // ץ
  0x05E6: 0x96, // צ
  0x05E7: 0x97, // ק
  0x05E8: 0x98, // ר
  0x05E9: 0x99, // ש
  0x05EA: 0x9A, // ת
  0x20AA: 0xA4, // ₪ shekel — currency symbol position in PC862
  0x2019: 0x27, // ' apostrophe
  0x201C: 0x22, // " → regular quote
  0x201D: 0x22, // " → regular quote
};

// Encode a string to PC862 byte array
function encodePC862(text: string): number[] {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (code < 0x80) {
      bytes.push(code); // ASCII pass-through
    } else if (PC862[code] !== undefined) {
      bytes.push(PC862[code]);
    } else {
      bytes.push(0x20); // unknown → space
    }
  }
  return bytes;
}

// RTL: reverses word order; reverses Hebrew char order; keeps numbers/Latin intact
function rtl(text: string = ""): string {
  return text
    .split(" ")
    .map(word => {
      if (/^[0-9₪:\/\.\-,'"]+$/.test(word)) return word;  // numbers/symbols
      if (/^[a-zA-Z]+$/.test(word)) return word;           // Latin — keep as-is
      return word.split("").reverse().join("");              // Hebrew — reverse chars
    })
    .reverse()  // reverse word order for RTL
    .join(" ");
}

function buildReceipt(receipt: any): string {
  const ESC = "\x1B";
  const GS  = "\x1D";
  const LINE = "------------------------------------------"; // 42 chars

  // Helper: ESC/POS control bytes (pure ASCII)
  const ctrl = (s: string): number[] => s.split("").map(c => c.charCodeAt(0));

  const allBytes: number[] = [
    ...ctrl(ESC + "@"),           // Initialize printer
    ...ctrl(ESC + "t" + "\x08"), // PC862 Hebrew code page (SAM4S index 0x08)
    ...ctrl(ESC + "a" + "\x01"), // Center align
    ...ctrl(GS  + "!" + "\x00"), // Normal size

    ...encodePC862(rtl('בס"ד')),                          ...ctrl("\n"),
    ...encodePC862(rtl("בית כנסת ברית שלום עכו")),       ...ctrl("\n"),
    ...encodePC862(rtl("רח' קדושי קהיר 18, עכו")),       ...ctrl("\n"),
    ...encodePC862(LINE),                                  ...ctrl("\n"),

    ...ctrl(ESC + "a" + "\x02"), // Right align
    ...encodePC862(rtl("קבלה מס': " + receipt.receipt_number)),       ...ctrl("\n"),
    ...encodePC862(rtl("תאריך: " + receipt.greg_date)),               ...ctrl("\n"),
    ...encodePC862(rtl("תאריך עברי: " + receipt.hebrew_date)),        ...ctrl("\n"),
    ...encodePC862(LINE),                                              ...ctrl("\n"),

    ...encodePC862(rtl("התקבל מאת: " + receipt.member_name)),         ...ctrl("\n"),
    ...encodePC862(rtl("עבור: " + (receipt.description || "תרומה"))), ...ctrl("\n"),
    ...encodePC862(rtl("אמצעי תשלום: " + receipt.payment_method)),    ...ctrl("\n"),
    ...encodePC862(LINE),                                              ...ctrl("\n"),

    ...ctrl(ESC + "a" + "\x01"), // Center
    ...encodePC862(rtl('סה"כ שולם:')),                    ...ctrl("\n\n"),

    ...ctrl(GS  + "!" + "\x11"), // Double size — amount only
    ...encodePC862(rtl(
      new Intl.NumberFormat("he-IL", {
        style: "currency",
        currency: "ILS",
        maximumFractionDigits: 0,
      }).format(Number(receipt.total_amount))
    )),
    ...ctrl("\n\n"),

    ...ctrl(GS  + "!" + "\x00"), // Back to normal
    ...encodePC862(rtl("תודה על תרומתכם!")),              ...ctrl("\n"),
    ...encodePC862("050-5768723"),                         ...ctrl("\n\n\n"),

    ...ctrl(GS  + "V" + "\x00"), // Cut paper
  ];

  return btoa(String.fromCharCode(...allBytes));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey   = Deno.env.get("PRINTNODE_API_KEY");
    const printerId = Deno.env.get("PRINTNODE_PRINTER_ID");

    if (!apiKey || !printerId) throw new Error("Missing PrintNode credentials");

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
