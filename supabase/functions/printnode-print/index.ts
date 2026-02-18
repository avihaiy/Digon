import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// CHANGE THIS NUMBER TO TEST DIFFERENT CODE PAGES:
// 0x06 = PC862 Hebrew (standard)
// 0x24 = PC862 Hebrew (Sam4s variant 1)  
// 0x35 = PC862 Hebrew (Sam4s variant 2)
// 0x15 = PC862 Hebrew (Sam4s variant 3)
// 0x11 = PC862 Hebrew (Sam4s variant 4)
// ============================================================
const HEBREW_CODEPAGE = 0x06;

const hebrewToCP862: Record<string, number> = {
  'א': 0x80, 'ב': 0x81, 'ג': 0x82, 'ד': 0x83, 'ה': 0x84,
  'ו': 0x85, 'ז': 0x86, 'ח': 0x87, 'ט': 0x88, 'י': 0x89,
  'ך': 0x8A, 'כ': 0x8B, 'ל': 0x8C, 'ם': 0x8D, 'מ': 0x8E,
  'ן': 0x8F, 'נ': 0x90, 'ס': 0x91, 'ע': 0x92, 'ף': 0x93,
  'פ': 0x94, 'ץ': 0x95, 'צ': 0x96, 'ק': 0x97, 'ר': 0x98,
  'ש': 0x99, 'ת': 0x9A,
  '"': 0x22, "'": 0x27, '׳': 0x27, '״': 0x22,
};

function encodeHebrew(text: string): Uint8Array {
  const reversed = [...text].reverse().join("");
  const bytes: number[] = [];
  for (const char of reversed) {
    if (hebrewToCP862[char] !== undefined) {
      bytes.push(hebrewToCP862[char]);
    } else if (char === ' ') {
      bytes.push(0x20);
    } else if (char.charCodeAt(0) < 128) {
      bytes.push(char.charCodeAt(0));
    }
  }
  return new Uint8Array(bytes);
}

function buildEscPosReceipt(receipt: {
  receipt_number: number | null;
  created_at: string;
  total_amount: number;
  description?: string | null;
  member_name?: string | null;
  payment_method?: string | null;
  greg_date?: string;
  hebrew_date?: string;
}): Uint8Array {
  const parts: Uint8Array[] = [];
  const push = (data: number[] | Uint8Array) => {
    parts.push(data instanceof Uint8Array ? data : new Uint8Array(data));
  };
  const pushH = (text: string) => push(encodeHebrew(text));
  const pushA = (text: string) => push(new TextEncoder().encode(text));

  const ESC = 0x1b;
  const GS  = 0x1d;
  const LF  = 0x0a;

  push([ESC, 0x40]);                    // Init printer
  push([ESC, 0x74, HEBREW_CODEPAGE]);   // Set Hebrew code page
  push([ESC, 0x61, 0x01]);              // Center align
  push([ESC, 0x45, 0x01]);              // Bold ON

  pushH('בס"ד');
  push([LF]);

  push([ESC, 0x21, 0x10]);
  pushH('בית כנסת "ברית שלום" עכו');
  push([LF]);
  push([ESC, 0x21, 0x00]);
  push([ESC, 0x45, 0x01]);

  pushH("רח' קדושי קהיר 18, עכו");
  push([LF, LF]);

  pushH(`קבלה מספר: ${receipt.receipt_number || ""}`);
  push([LF]);

  if (receipt.greg_date || receipt.hebrew_date) {
    pushA(`${receipt.greg_date || ""}`);
    push([LF]);
    pushH(`${receipt.hebrew_date || ""}`);
    push([LF]);
  }

  pushA("================================");
  push([LF]);

  pushH(`התקבל מאת: ${receipt.member_name || "-"}`);
  push([LF]);

  pushH(`עבור: ${receipt.description || "תרומה"}`);
  push([LF]);

  const methodMap: Record<string, string> = {
    bit: "ביט", cash: "מזומן", check: "צ'ק", bank_transfer: "העברה בנקאית",
  };
  pushH(`אמצעי תשלום: ${methodMap[receipt.payment_method || ""] || receipt.payment_method || "-"}`);
  push([LF]);

  pushA("================================");
  push([LF]);

  pushH('סה"כ שולם:');
  push([LF]);

  push([ESC, 0x21, 0x30]);
  const amount = new Intl.NumberFormat("he-IL", {
    style: "currency", currency: "ILS",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(receipt.total_amount);
  pushA(amount);
  push([LF]);
  push([ESC, 0x21, 0x00]);
  push([ESC, 0x45, 0x01]);

  pushA("================================");
  push([LF]);

  pushH("תודה על תרומתכם!");
  push([LF]);
  pushH('בית כנסת "ברית שלום" עכו');
  push([LF]);
  pushH("רח' קדושי קהיר 18 עכו");
  push([LF]);
  pushA("Tel: 050-5768723");
  push([LF, LF, LF]);

  push([GS, 0x56, 0x01]);

  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) { result.set(part, offset); offset += part.length; }
  return result;
}

function uint8ToBase64(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.length; i++) { binary += String.fromCharCode(data[i]); }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const apiKey    = Deno.env.get("PRINTNODE_API_KEY");
    const printerId = Deno.env.get("PRINTNODE_PRINTER_ID");

    if (!apiKey || !printerId) {
      return new Response(JSON.stringify({ error: "PrintNode credentials not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { receipt } = await req.json();
    if (!receipt) {
      return new Response(JSON.stringify({ error: "Receipt data is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const escposData    = buildEscPosReceipt(receipt);
    const base64Content = uint8ToBase64(escposData);

    const printResponse = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId:   parseInt(printerId, 10),
        title:       `Receipt #${receipt.receipt_number || "N/A"}`,
        contentType: "raw_base64",
        content:     base64Content,
        source:      "Brit Shalom Receipt System",
      }),
    });

    if (!printResponse.ok) {
      const errorText = await printResponse.text();
      return new Response(JSON.stringify({ error: "PrintNode API error", details: errorText }), {
        status: printResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const printResult = await printResponse.json();
    return new Response(JSON.stringify({ success: true, jobId: printResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
