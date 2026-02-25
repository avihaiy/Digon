import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// -----------------------------
// המרה ל-Windows-1255 (עברית Windows)
// -----------------------------
function encodeWindows1255(str: string): Uint8Array {
  const table: Record<string, number> = {
    א: 0xe0,
    ב: 0xe1,
    ג: 0xe2,
    ד: 0xe3,
    ה: 0xe4,
    ו: 0xe5,
    ז: 0xe6,
    ח: 0xe7,
    ט: 0xe8,
    י: 0xe9,
    ך: 0xea,
    כ: 0xeb,
    ל: 0xec,
    ם: 0xed,
    מ: 0xee,
    ן: 0xef,
    נ: 0xf0,
    ס: 0xf1,
    ע: 0xf2,
    ף: 0xf3,
    פ: 0xf4,
    ץ: 0xf5,
    צ: 0xf6,
    ק: 0xf7,
    ר: 0xf8,
    ש: 0xf9,
    ת: 0xfa,
    "₪": 0xa4,
  };

  const bytes: number[] = [];
  for (const ch of str) {
    if (table[ch] !== undefined) {
      bytes.push(table[ch]);
    } else {
      const code = ch.charCodeAt(0);
      if (code < 128) {
        bytes.push(code);
      } else {
        bytes.push(0x3f); // '?'
      }
    }
  }
  return new Uint8Array(bytes);
}

// -----------------------------
// הפיכת מחרוזת עברית להדפסה RTL
// -----------------------------
function reverseHebrew(str: string): string {
  return str.split(" ").reverse().join(" ");
}

// -----------------------------
// שורה ממורכזת
// -----------------------------
function centerText(text: string, width = 32): string {
  const len = text.length;
  if (len >= width) return text;
  const pad = Math.floor((width - len) / 2);
  return " ".repeat(pad) + text;
}

const DIVIDER = "--------------------------------";

// -----------------------------
// בניית תוכן הקבלה
// -----------------------------
function buildReceiptContent(receipt: Record<string, any>): string {
  const lines: string[] = [];

  lines.push(centerText(reverseHebrew("עכו")));
  lines.push(DIVIDER);
  lines.push(`${receipt.receipt_number ?? ""}  :${reverseHebrew("קבלה")}`);
  lines.push(`${receipt.greg_date ?? ""}  :${reverseHebrew("תאריך")}`);
  lines.push(`${reverseHebrew(receipt.member_name ?? "")}  :${reverseHebrew("מאת")}`);
  lines.push(DIVIDER);
  lines.push(`${receipt.total_amount ?? "0"} ₪  :${reverseHebrew('סה"כ')}`);
  lines.push(DIVIDER);

  if (receipt.description) {
    lines.push(reverseHebrew(receipt.description));
    lines.push(DIVIDER);
  }

  if (receipt.payment_method) {
    lines.push(`${reverseHebrew(receipt.payment_method)}  :${reverseHebrew("אמצעי תשלום")}`);
    lines.push(DIVIDER);
  }

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
      throw new Error("Missing PrintNode configuration");
    }

    const body = await req.json();
    const receipt = body.receipt;

    if (!receipt) {
      throw new Error("Missing receipt data");
    }

    // -----------------------------
    // ESC/POS Init
    // נסה את כל הערכים האפשריים ל-Windows-1255:
    // 0x15 = CP858, 0x21 = Windows-1252, 0x35 = Windows-1255
    // -----------------------------
    const init = new Uint8Array([
      0x1b,
      0x40, // Initialize printer
      0x1b,
      0x74,
      0x35, // ← Windows-1255 Hebrew (נסה גם 0x21 אם לא עובד)
      0x1b,
      0x61,
      0x00, // Align LEFT
    ]);

    const boldOn = new Uint8Array([0x1b, 0x45, 0x01]);
    const boldOff = new Uint8Array([0x1b, 0x45, 0x00]);
    const bigOn = new Uint8Array([0x1d, 0x21, 0x11]); // Double size
    const bigOff = new Uint8Array([0x1d, 0x21, 0x00]); // Normal size

    // כותרת ראשית (גדולה ומודגשת)
    const headerBytes = encodeWindows1255(centerText(reverseHebrew("בית כנסת ברית שלום")) + "\n");

    // תוכן הקבלה
    const receiptText = buildReceiptContent(receipt);
    const textBytes = encodeWindows1255(receiptText);

    // חיתוך נייר
    const cut = new Uint8Array([0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x00]);

    // חיבור הכל
    const finalData = new Uint8Array([
      ...init,
      ...boldOn,
      ...bigOn,
      ...headerBytes,
      ...bigOff,
      ...boldOff,
      ...textBytes,
      ...cut,
    ]);

    const base64Data = btoa(String.fromCharCode(...finalData));

    // שליחה ל-PrintNode
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
