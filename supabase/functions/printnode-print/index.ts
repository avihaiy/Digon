import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("PRINTNODE_API_KEY");
    const printerId = Deno.env.get("PRINTNODE_PRINTER_ID");

    if (!apiKey || !printerId) {
      throw new Error("Missing configuration");
    }

    // הכתובת של התמונה שאתה רוצה להדפיס.
    // היתרון: בתמונה העברית תמיד תיראה מושלם בלי קשר להגדרות המדפסת.
    // אני משתמש כאן בשירות שמייצר תמונה מטקסט לצורך הדוגמה:
    const textToPrint = encodeURIComponent("בדיקת הדפסה בעברית\nSam4s Giant-100\nעובד בשיטת תמונה");
    const imageUrl = `https://dummyimage.com/400x200/ffffff/000000.png&text=${textToPrint}`;

    // שליחת פקודת הדפסה ל-PrintNode כקובץ תמונה
    const printResponse = await fetch("https://api.printnode.com/printjobs", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(apiKey + ":")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        printerId: parseInt(printerId),
        title: "Hebrew Image Print",
        contentType: "pdf_uri", // PrintNode יודע להפוך לינקים/תמונות להדפסה
        content: imageUrl,
        source: "Deno Cloud Function",
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
    // אם שיטת התמונה לא מתאימה לך ואתה חייב RAW, הנה הקוד המתוקן האחרון לטקסט:
    return await handleRawPrint(req, apiKey!, printerId!);
  }
});

// פונקציית גיבוי למקרה שאתה רוצה לחזור לטקסט (RAW) עם התיקון הסופי
async function handleRawPrint(req: Request, apiKey: string, printerId: string) {
  const ESC = 0x1b;
  const GS = 0x1d;

  // פקודת אתחול + בחירת טבלה 10 (הכי נפוצה בישראל ל-Giant-100)
  const commands = [
    ESC,
    0x40, // Reset
    ESC,
    0x74,
    0x0a, // Select Table 10 (Hebrew DOS)
    ESC,
    0x52,
    0x0d, // International charset Israel
  ];

  const text = "בדיקה אחרונה";
  // היפוך והמרה לקידוד 862
  const encoded = text
    .split("")
    .reverse()
    .map((char) => {
      const code = char.charCodeAt(0);
      return code >= 0x05d0 && code <= 0x05ea ? code - 0x05d0 + 0x80 : code;
    });

  const finalData = new Uint8Array([...commands, ...encoded, 0x0a, 0x0a, 0x0a, GS, 0x56, 0x00]);
  const base64Data = btoa(String.fromCharCode(...finalData));

  const res = await fetch("https://api.printnode.com/printjobs", {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(apiKey + ":")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ printerId: parseInt(printerId), contentType: "raw_base64", content: base64Data }),
  });

  return new Response(await res.text(), { headers: corsHeaders });
}
