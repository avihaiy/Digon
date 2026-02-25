import { serve } from “https://deno.land/std@0.168.0/http/server.ts”;

const corsHeaders = {
“Access-Control-Allow-Origin”: “*”,
“Access-Control-Allow-Headers”: “authorization, x-client-info, apikey, content-type”,
};

// ============================================================
// קידוד WPC-1255 (Windows-1255 Hebrew)
// המדפסת SAM4S GIANT-100 מוגדרת ל-WPC 1255 לפי Self Test
// ============================================================
function encodeWPC1255(str: string): Uint8Array {
const table: Record<string, number> = {
‘א’: 0xe0, ‘ב’: 0xe1, ‘ג’: 0xe2, ‘ד’: 0xe3,
‘ה’: 0xe4, ‘ו’: 0xe5, ‘ז’: 0xe6, ‘ח’: 0xe7,
‘ט’: 0xe8, ‘י’: 0xe9, ‘ך’: 0xea, ‘כ’: 0xeb,
‘ל’: 0xec, ‘ם’: 0xed, ‘מ’: 0xee, ‘ן’: 0xef,
‘נ’: 0xf0, ‘ס’: 0xf1, ‘ע’: 0xf2, ‘ף’: 0xf3,
‘פ’: 0xf4, ‘ץ’: 0xf5, ‘צ’: 0xf6, ‘ק’: 0xf7,
‘ר’: 0xf8, ‘ש’: 0xf9, ‘ת’: 0xfa,
‘₪’: 0xa4,
};

const bytes: number[] = [];
for (const ch of str) {
if (table[ch] !== undefined) {
bytes.push(table[ch]);
} else {
const code = ch.charCodeAt(0);
bytes.push(code < 128 ? code : 0x3f); // ‘?’ לתווים לא מוכרים
}
}
return new Uint8Array(bytes);
}

// ============================================================
// כלי עזר
// ============================================================

// הפיכת מילים לעברית RTL (מסדר מילים בלבד, לא אותיות)
function rtl(str: string): string {
return str.split(” “).reverse().join(” “);
}

// מרכוז טקסט - 42 תווים לשורה ב-80mm Font A
function center(text: string, width = 42): string {
const len = text.length;
if (len >= width) return text;
const pad = Math.floor((width - len) / 2);
return “ “.repeat(pad) + text;
}

// יישור ימין - מדפיס label ואחריו ערך מיושר שמאל
function rightAlign(label: string, value: string, width = 42): string {
const line = `${value} :${label}`;
return line;
}

const DIVIDER = “——————————————”;

// ============================================================
// בניית תוכן הקבלה
// ============================================================
function buildReceipt(receipt: Record<string, any>): string {
const lines: string[] = [];

// כותרת משנה + מפריד
lines.push(center(rtl(“עכו”)));
lines.push(DIVIDER);

// פרטי קבלה
lines.push(rightAlign(rtl(“קבלה מספר”), String(receipt.receipt_number ?? “”)));
lines.push(rightAlign(rtl(“תאריך”), String(receipt.greg_date ?? “”)));
lines.push(rightAlign(rtl(“שם המשלם”), rtl(String(receipt.member_name ?? “”))));
lines.push(DIVIDER);

// סכום
lines.push(rightAlign(rtl(‘סה”כ’), `${receipt.total_amount ?? "0"} ₪`));
lines.push(DIVIDER);

// הערה (אם קיים)
if (receipt.description) {
lines.push(rightAlign(rtl(“הערה”), rtl(String(receipt.description))));
lines.push(DIVIDER);
}

// אמצעי תשלום (אם קיים)
if (receipt.payment_method) {
lines.push(rightAlign(rtl(“אמצעי תשלום”), rtl(String(receipt.payment_method))));
lines.push(DIVIDER);
}

// סיום
lines.push(””);
lines.push(center(rtl(“תודה רבה!”)));
lines.push(””);

return lines.join(”\n”);
}

// ============================================================
// פונקציית Server
// ============================================================
serve(async (req) => {
if (req.method === “OPTIONS”) {
return new Response(null, { headers: corsHeaders });
}

try {
const apiKey = Deno.env.get(“PRINTNODE_API_KEY”);
const printerId = Deno.env.get(“PRINTNODE_PRINTER_ID”);

```
if (!apiKey || !printerId) {
throw new Error("Missing env vars: PRINTNODE_API_KEY or PRINTNODE_PRINTER_ID");
}

const body = await req.json();
const receipt = body.receipt;

if (!receipt) {
throw new Error("Missing 'receipt' in request body");
}

// ----------------------------------------------------------
// ESC/POS commands
// המדפסת כבר מוגדרת ל-WPC1255 - אין צורך ב-ESC t
// ----------------------------------------------------------
const ESC_INIT = new Uint8Array([0x1b, 0x40]); // אתחול מדפסת
const ALIGN_LEFT = new Uint8Array([0x1b, 0x61, 0x00]); // יישור שמאל
const BOLD_ON = new Uint8Array([0x1b, 0x45, 0x01]); // מודגש
const BOLD_OFF = new Uint8Array([0x1b, 0x45, 0x00]);
const DOUBLE_ON = new Uint8Array([0x1d, 0x21, 0x11]); // גודל כפול
const DOUBLE_OFF = new Uint8Array([0x1d, 0x21, 0x00]); // גודל רגיל
const PAPER_CUT = new Uint8Array([0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x00]); // חיתוך

// כותרת ראשית - גדולה ומודגשת
const headerLine = encodeWPC1255(center(rtl("בית כנסת ברית שלום")) + "\n");

// תוכן הקבלה - גודל רגיל
const bodyLines = encodeWPC1255(buildReceipt(receipt));

// חיבור כל החלקים לפי הסדר
const finalData = new Uint8Array([
...ESC_INIT,
...ALIGN_LEFT,
...BOLD_ON,
...DOUBLE_ON,
...headerLine,
...DOUBLE_OFF,
...BOLD_OFF,
...bodyLines,
...PAPER_CUT,
]);

// המרה ל-Base64 לשליחה ל-PrintNode
const base64Data = btoa(String.fromCharCode(...finalData));

// שליחה ל-PrintNode
const printResponse = await fetch("https://api.printnode.com/printjobs", {
method: "POST",
headers: {
"Authorization": `Basic ${btoa(apiKey + ":")}`,
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

return new Response(
JSON.stringify({ success: true, printJobId: printResult }),
{ headers: { ...corsHeaders, "Content-Type": "application/json" } }
);
```

} catch (err: any) {
console.error(“Print error:”, err.message);
return new Response(
JSON.stringify({ error: err.message }),
{ status: 500, headers: { …corsHeaders, “Content-Type”: “application/json” } }
);
}
});