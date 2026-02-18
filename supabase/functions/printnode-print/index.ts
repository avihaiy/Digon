import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// פונקציה להפוך מחרוזת בעברית
function reverseHebrew(str: string = ""): string {
  // שומר על מספרים ופיסוק כמו שהם
  return str.split("").reverse().join("");
}

// ניקוי טקסט
function clean(str: string = "") {
  return str.replace(/\n/g, " ").trim();
}

// פונקציה לבניית קבלה בפורמט ESC/POS RAW Base64
function buildReceipt(receipt: any) {
  const ESC = "\x1B";
  const GS = "\x1D";
  const encoder = new TextEncoder();

  // הפיכת הטקסט בעברית
  const content =
    ESC +
    "@" + // Initialize printer
    ESC +
    "a" +
    "\x01" + // Center align
    reverseHebrew('בס"ד') +
    "\n" +
    reverseHebrew("בית כנסת ברית שלום עכו") +
    "\n" +
    reverseHebrew("רח' קדושי קהיר 18, עכו") +
    "\n" +
    "------------------------------\n" +
    ESC +
    "a" +
    "\x02" + // Right align
    reverseHebrew("קבלה מס': " + clean(receipt.receipt_number)) +
    "\n" +
    reverseHebrew("תאריך: " + clean(receipt.greg_date)) +
    "\n" +
    reverseHebrew("תאריך עברי: " + clean(receipt.hebrew_date)) +
    "\n" +
    "------------------------------\n" +
    reverseHebrew("התקבל מאת: " + clean(receipt.member_name)) +
    "\n" +
    reverseHebrew("עבור: " + clean(receipt.description || "תרומה")) +
    "\n" +
    reverseHebrew("אמצעי תשלום: " + clean(receipt.payment_method)) +
    "\n" +
    "------------------------------\n" +
    ESC +
    "a" +
    "\x01" + // Center align
    reverseHebrew('סה"כ שולם:') +
    "\n\n" +
    GS +
    "!" +
    "\x11" + // Double size text
    reverseHebrew(
      new Intl.NumberFormat("he-IL", {
        style: "currency",
        currency: "ILS",
        maximumFractionDigits: 0,
      }).format(Number(receipt.total_amount)),
    ) +
    "\n\n" +
    GS +
    "!" +
    "\x00" + // Normal size
    reverseHebrew("תודה על תרומתכם!") +
    "\n" +
    "050-5768723\n\n\n" +
    GS +
    "V" +
    "\x00"; // Cut paper

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
      return new Response(JSON.stringify({ error: "receipt data is required" }), { status: 400, headers: corsHeaders });
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
        contentType: "raw_base64", // חשוב מאוד
        content: base64Content,
        source: "Brit Shalom Receipt System",
      }),
    });

    if (!printResponse.ok) {
      const err = await printResponse.text();
      throw new Error(err);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
