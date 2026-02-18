import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// RTL חכם – לא הופך מספרים
function rtl(text: string = ""): string {
  return text
    .split(" ")
    .map(word => {
      if (/^[0-9₪:\/\.\-]+$/.test(word)) return word;
      return word.split("").reverse().join("");
    })
    .reverse()
    .join(" ");
}

function buildReceipt(receipt: any) {
  const ESC = "\x1B";
  const GS = "\x1D";
  const encoder = new TextEncoder();

  const LINE = "------------------------------------------"; // 42 chars = 80mm

  const content =
    ESC + "@" +                 // Initialize
    ESC + "t" + "\x18" +        // Hebrew code page
    ESC + "a" + "\x01" +        // Center align
    GS + "!" + "\x00" +         // Normal size
    rtl('בס"ד') + "\n" +
    rtl("בית כנסת ברית שלום עכו") + "\n" +
    rtl("רח' קדושי קהיר 18, עכו") + "\n" +
    LINE + "\n" +

    ESC + "a" + "\x02" +        // Right align
    rtl("קבלה מס': " + receipt.receipt_number) + "\n" +
    rtl("תאריך: " + receipt.greg_date) + "\n" +
    rtl("תאריך עברי: " + receipt.hebrew_date) + "\n" +
    LINE + "\n" +

    rtl("התקבל מאת: " + receipt.member_name) + "\n" +
    rtl("עבור: " + (receipt.description || "תרומה")) + "\n" +
    rtl("אמצעי תשלום: " + receipt.payment_method) + "\n" +
    LINE + "\n" +

    ESC + "a" + "\x01" +        // Center
    rtl('סה"כ שולם:') + "\n\n" +

    GS + "!" + "\x11" +         // Double size ONLY for amount
    rtl(
      new Intl.NumberFormat("he-IL", {
        style: "currency",
        currency: "ILS",
        maximumFractionDigits: 0,
      }).format(Number(receipt.total_amount))
    ) +
    "\n\n" +

    GS + "!" + "\x00" +         // Back to normal
    rtl("תודה על תרומתכם!") + "\n" +
    "050-5768723\n\n\n" +

    GS + "V" + "\x00";          // Cut paper

  return btoa(String.fromCharCode(...encoder.encode(content)));
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
