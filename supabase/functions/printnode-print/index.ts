import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ESC/POS helper
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
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];

  const push = (data: number[] | Uint8Array) => {
    parts.push(data instanceof Uint8Array ? data : new Uint8Array(data));
  };

  const pushText = (text: string) => {
    push(encoder.encode(text));
  };

  const ESC = 0x1b;
  const GS = 0x1d;
  const LF = 0x0a;

  // =========================
  // 🔥 CRITICAL FIX SECTION
  // =========================

  push([ESC, 0x40]); // Initialize
  push([ESC, 0x74, 0x15]); // Select Hebrew Code Page (CP862)
  push([ESC, 0x52, 0x01]); // RTL mode
  push([ESC, 0x61, 1]); // Center alignment
  push([ESC, 0x45, 1]); // Bold ON

  // =========================
  // Header
  // =========================

  pushText('בס"ד');
  push([LF]);

  push([ESC, 0x21, 0x10]); // Double height
  pushText('בית כנסת "ברית שלום" עכו');
  push([LF]);

  push([ESC, 0x21, 0x00]); // Normal size
  push([ESC, 0x45, 1]);

  pushText("רח' קדושי קהיר 18, עכו");
  push([LF, LF]);

  // =========================
  // Receipt Info
  // =========================

  pushText(`קבלה מספר: ${receipt.receipt_number || ""}`);
  push([LF]);

  if (receipt.greg_date || receipt.hebrew_date) {
    pushText(`${receipt.greg_date || ""} • ${receipt.hebrew_date || ""}`);
    push([LF]);
  }

  pushText("--------------------------------");
  push([LF]);

  pushText(`התקבל מאת: ${receipt.member_name || "-"}`);
  push([LF]);

  pushText(`עבור: ${receipt.description || "תרומה"}`);
  push([LF]);

  const methodMap: Record<string, string> = {
    bit: "ביט",
    cash: "מזומן",
    check: "צ׳ק",
    bank_transfer: "העברה בנקאית",
  };

  pushText(`אמצעי תשלום: ${methodMap[receipt.payment_method || ""] || receipt.payment_method || "-"}`);
  push([LF]);

  pushText("--------------------------------");
  push([LF]);

  // =========================
  // Total
  // =========================

  pushText("סה״כ שולם");
  push([LF]);

  push([ESC, 0x21, 0x30]); // Double width + height

  const amount = new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: "ILS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(receipt.total_amount);

  pushText(amount);
  push([LF]);

  push([ESC, 0x21, 0x00]);
  push([ESC, 0x45, 1]);

  pushText("--------------------------------");
  push([LF]);

  // =========================
  // Footer
  // =========================

  pushText("תודה על תרומתכם!");
  push([LF]);

  pushText('בית כנסת "ברית שלום" עכו');
  push([LF]);

  pushText("רח' קדושי קהיר 18 עכו");
  push([LF]);

  pushText("טלפון: 050-5768723");
  push([LF, LF, LF]);

  // Cut
  push([GS, 0x56, 1]);

  // Combine
  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLength);

  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
}

function uint8ToBase64(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
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
      return new Response(JSON.stringify({ error: "PrintNode credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { receipt } = body;

    if (!receipt) {
      return new Response(JSON.stringify({ error: "Receipt data is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const escposData = buildEscPosReceipt(receipt);
    const base64Content = uint8ToBase64(escposData);

    const printResponse = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId, 10),
        title: `Receipt #${receipt.receipt_number || "N/A"}`,
        contentType: "raw_base64",
        content: base64Content,
        source: "Brit Shalom Receipt System",
      }),
    });

    console.log("PrintNode status:", printResponse.status);

    if (!printResponse.ok) {
      const errorText = await printResponse.text();
      console.error("PrintNode API error:", errorText);
      return new Response(JSON.stringify({ error: "PrintNode API error", details: errorText }), {
        status: printResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await printResponse.json();
    console.log("PrintNode job created:", result);

    return new Response(JSON.stringify({ success: true, jobId: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Server error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
