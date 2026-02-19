import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// -----------------------------
// המרה ל-CP862 (עברית DOS) - סדר נכון!
// -----------------------------
function encodeCP862(str: string): Uint8Array {
  const table: Record<string, number> = {
    א: 0x80,
    ב: 0x81,
    ג: 0x82,
    ד: 0x83,
    ה: 0x84,
    ו: 0x85,
    ז: 0x86,
    ח: 0x87,
    ט: 0x88,
    י: 0x89,
    ך: 0x8a,
    כ: 0x8b,
    ל: 0x8c,
    ם: 0x8d,
    מ: 0x8e,
    ן: 0x8f,
    נ: 0x90,
    ס: 0x91,
    ע: 0x92,
    ף: 0x93,
    פ: 0x94,
    ץ: 0x95,
    צ: 0x96,
    ק: 0x97,
    ר: 0x98,
    ש: 0x99,
    ת: 0x9a,
    "₪": 0xf5,
  };

  const bytes: number[] = [];
  for (const ch of str) {
    if (table[ch] !== undefined) {
      bytes.push(table[ch]);
    } else {
      // תווים רגילים (ASCII) - נשלחים כמו שהם
      const code = ch.charCodeAt(0);
      if (code < 128) {
        bytes.push(code);
      } else {
        bytes.push(0x3f); // '?' עבור תווים לא מוכרים
      }
    }
  }
  return new Uint8Array(bytes);
}

// -----------------------------
// הפיכת מחרוזת עברית להדפסה RTL
// עובד נכון גם עם מספרים וסימנים
// -----------------------------
function reverseHebrew(str: string): string {
  // מפריד לפי רווחים, הופך את הסדר של המילים
  return str.split(" ").reverse().join(" ");
}

// -----------------------------
// שורה ממורכזת (padding)
// -----------------------------
function centerText(text: string, width = 32): string {
  const len = text.length;
  if (len >= width) return text;
  const pad = Math.floor((width - len) / 2);
  return " ".repeat(pad) + text;
}

// -----------------------------
// שורת מפריד
// -----------------------------
const DIVIDER = "--------------------------------";

// -----------------------------
// בניית תוכן הקבלה
// -----------------------------
function buildReceiptContent(receipt: Record<string, any>): string {
  const lines: string[] = [];

  // כותרת
  lines.push(centerText(reverseHebrew("בית כנסת ברית שלום")));
  lines.push(centerText(reverseHebrew("עכו")));
  lines.push(DIVIDER);

  // פרטי קבלה
  lines.push(`${receipt.receipt_number ?? ""}  :${reverseHebrew("קבלה")}`);
  lines.push(`${receipt.greg_date ?? ""}  :${reverseHebrew("תאריך")}`);
  lines.push(`${reverseHebrew(receipt.member_name ?? "")}  :${reverseHebrew("מאת")}`);
  lines.push(DIVIDER);

  // סכום
  lines.push(`${receipt.total_amount ?? "0"} ₪  :${reverseHebrew('סה"כ')}`);
  lines.push(DIVIDER);

  // הערה / תיאור (אם קיים)
  if (receipt.description) {
    lines.push(`${reverseHebrew(receipt.description)}`);
    lines.push(DIVIDER);
  }

  // אמצעי תשלום (אם קיים)
  if (receipt.payment_method) {
    lines.push(`${reverseHebrew(receipt.payment_method)}  :${reverseHebrew("אמצעי תשלום")}`);
    lines.push(DIVIDER);
  }

  // סיום
  lines.push("");
  lines.push(centerText(reverseHebrew("תודה רבה!")));
  lines.push("");

  return lines.join("\n");
}

// -----------------------------
// פונקציית Server
// -----------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("PRINTNODE_API_KEY");
    const printerId = Deno.env.get("PRINTNODE_PRINTER_ID");

    if (!apiKey || !printerId) {
      throw new Error("Missing PrintNode configuration: PRINTNODE_API_KEY or PRINTNODE_PRINTER_ID");
    }

    const body = await req.json();
    const receipt = body.receipt;

    if (!receipt) {
      throw new Error("Missing receipt data in request body");
    }

    // -----------------------------
    // ESC/POS: אתחול + הגדרות
    // -----------------------------
    const init = new Uint8Array([
      0x1b,
      0x40, // Initialize printer
      0x1b,
      0x74,
      0x11, // Code page CP862 (Hebrew DOS) - ערך נכון!
      0x1b,
      0x61,
      0x00, // Align LEFT (הטקסט מהופך manually)
    ]);

    // -----------------------------
    // כותרת מודגשת + גדולה
    // -----------------------------
    const boldOn = new Uint8Array([0x1b, 0x45, 0x01]); // Bold ON
    const boldOff = new Uint8Array([0x1b, 0x45, 0x00]); // Bold OFF
    const bigOn = new Uint8Array([0x1d, 0x21, 0x11]); // Double width + height
    const bigOff = new Uint8Array([0x1d, 0x21, 0x00]); // Normal size

    // -----------------------------
    // תוכן הקבלה
    // -----------------------------
    const receiptText = buildReceiptContent(receipt);
    const textBytes = encodeCP862(receiptText);

    // -----------------------------
    // חיתוך נייר
    // -----------------------------
    const cut = new Uint8Array([
      0x0a,
      0x0a,
      0x0a, // 3 שורות ריקות לפני חיתוך
      0x1d,
      0x56,
      0x00, // Full cut
    ]);

    // -----------------------------
    // חיבור כל החלקים
    // -----------------------------
    const finalData = new Uint8Array([
      ...init,
      ...boldOn,
      ...bigOn,
      ...encodeCP862(centerText(reverseHebrew("בית כנסת ברית שלום")) + "\n"),
      ...bigOff,
      ...boldOff,
      ...textBytes,
      ...cut,
    ]);

    // המרה ל-Base64
    const base64Data = btoa(String.fromCharCode(...finalData));

    // -----------------------------
    // שליחה ל-PrintNode
    // -----------------------------
    const printResponse = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId),
        title: `Receipt-${receipt.receipt_number ?? "unknown"}`,
        contentType: "raw_base64",
        content: base64Data,
        source: "Lovable App",
      }),
    });

    if (!printResponse.ok) {
      const errText = await printResponse.text();
      throw new Error(`PrintNode error: ${errText}`);
    }

    const printResult = await printResponse.json();

    return new Response(JSON.stringify({ success: true, printJobId: printResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Print error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
