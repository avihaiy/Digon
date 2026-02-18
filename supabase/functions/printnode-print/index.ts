import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// המרת עברית ל-CP862 (DOS Hebrew)
function encodeCP862(str: string) {
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
    כ: 0x8a,
    ל: 0x8b,
    מ: 0x8c,
    נ: 0x8d,
    ס: 0x8e,
    ע: 0x8f,
    פ: 0x90,
    צ: 0x91,
    ק: 0x92,
    ר: 0x93,
    ש: 0x94,
    ת: 0x95,
    ך: 0x9a,
    ם: 0x9b,
    ן: 0x9c,
    ף: 0x9d,
    ץ: 0x9e,
  };

  const bytes: number[] = [];

  for (const ch of str) {
    if (table[ch] !== undefined) {
      bytes.push(table[ch]);
    } else {
      bytes.push(ch.charCodeAt(0));
    }
  }

  return new Uint8Array(bytes);
}

// הפיכת טקסט RTL למדפסת
function reverse(str: string) {
  return str.split("").reverse().join("");
}

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

    const { receipt } = await req.json();

    // ===== ESC/POS INIT =====
    const init = new Uint8Array([
      0x1b,
      0x40, // Initialize
      0x1b,
      0x74,
      0x15, // Code page 862 (Hebrew)
      0x1b,
      0x61,
      0x02, // Align right
    ]);

    const textContent = `
${reverse("בית כנסת ברית שלום")}
${reverse("עכו")}

--------------------------------

${reverse("קבלה:")} ${receipt.receipt_number ?? ""}
${reverse("תאריך:")} ${receipt.greg_date ?? ""}
${reverse("מאת:")} ${reverse(receipt.member_name ?? "")}

--------------------------------

${reverse('סה"כ:')} ₪ ${receipt.total_amount ?? "0"}

--------------------------------

${reverse("תודה רבה!")}
`;

    const textBytes = encodeCP862(textContent);

    const cut = new Uint8Array([
      0x0a,
      0x0a,
      0x0a,
      0x1d,
      0x56,
      0x00, // Cut paper
    ]);

    const finalData = new Uint8Array([...init, ...textBytes, ...cut]);

    const base64Data = btoa(String.fromCharCode(...finalData));

    const printResponse = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId),
        title: "Receipt",
        contentType: "raw_base64",
        content: base64Data,
      }),
    });

    if (!printResponse.ok) {
      const errText = await printResponse.text();
      throw new Error(errText);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
